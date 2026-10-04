use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::net::{Ipv4Addr, SocketAddr, SocketAddrV4};
use std::sync::Arc;
use tokio::net::TcpListener;
use tokio::sync::{broadcast, Mutex};
use tokio_tungstenite::accept_async;
use tokio_tungstenite::tungstenite::Message;

use crate::input::gamepad::VirtualGamepad;
use crate::input::injector::InputInjector;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct WsPayload {
    pub r#type: String,
    #[serde(default)]
    pub code: Option<String>,
    #[serde(default)]
    pub vk: Option<u16>,
    #[serde(default)]
    pub is_down: Option<bool>,
    #[serde(default)]
    pub sdp: Option<String>,
    #[serde(default)]
    pub candidate: Option<serde_json::Value>,
    #[serde(default)]
    pub time: Option<f64>,
    #[serde(default)]
    pub injected: Option<bool>,
}

pub struct ServerManager {
    shutdown_tx: Arc<Mutex<Option<broadcast::Sender<()>>>>,
}

impl ServerManager {
    pub fn new() -> Self {
        Self {
            shutdown_tx: Arc::new(Mutex::new(None)),
        }
    }

    pub async fn start(&self, port: u16) -> Result<String, String> {
        let mut tx_lock = self.shutdown_tx.lock().await;
        if tx_lock.is_some() {
            return Ok(format!("Server already running on port {}", port));
        }

        let addr = format!("0.0.0.0:{}", port);
        let listener = TcpListener::bind(&addr)
            .await
            .map_err(|e| format!("Failed to bind to {}: {}", addr, e))?;

        let (shutdown_tx, mut shutdown_rx) = broadcast::channel(1);
        let (broadcast_tx, _) = broadcast::channel::<String>(128);

        *tx_lock = Some(shutdown_tx);

        let b_tx = broadcast_tx.clone();

        // Attempt automatic UPnP router port forward
        if let Some(local_v4) = get_primary_ipv4() {
            tauri::async_runtime::spawn_blocking(move || {
                try_open_upnp(port, local_v4);
            });
        }

        tauri::async_runtime::spawn(async move {
            println!("DuoControl native server listening on ws://{}", addr);

            loop {
                tokio::select! {
                    accept_res = listener.accept() => {
                        match accept_res {
                            Ok((stream, peer_addr)) => {
                                let b_tx_clone = b_tx.clone();
                                let mut b_rx_clone = b_tx.subscribe();

                                tauri::async_runtime::spawn(async move {
                                    handle_connection(stream, peer_addr, b_tx_clone, &mut b_rx_clone).await;
                                });
                            }
                            Err(e) => {
                                eprintln!("Accept error: {}", e);
                            }
                        }
                    }
                    _ = shutdown_rx.recv() => {
                        println!("DuoControl server stopped.");
                        break;
                    }
                }
            }
        });

        Ok(format!("Started on port {}", port))
    }

    pub async fn stop(&self) {
        let mut tx_lock = self.shutdown_tx.lock().await;
        if let Some(tx) = tx_lock.take() {
            let _ = tx.send(());
        }
    }
}

fn try_open_upnp(port: u16, local_ip: Ipv4Addr) {
    println!("DuoControl: Attempting router UPnP port forwarding for port {}...", port);
    if let Ok(gateway) = igd_next::search_gateway(Default::default()) {
        let local_addr = SocketAddr::V4(SocketAddrV4::new(local_ip, port));
        let _ = gateway.add_port(
            igd_next::PortMappingProtocol::TCP,
            port,
            local_addr,
            7200,
            "DuoControl P2P Co-Op Game",
        );
        let _ = gateway.add_port(
            igd_next::PortMappingProtocol::UDP,
            port,
            local_addr,
            7200,
            "DuoControl P2P Co-Op Game",
        );
        println!("DuoControl: UPnP port {} mapped on router!", port);
    }
}

async fn handle_connection(
    stream: tokio::net::TcpStream,
    peer_addr: SocketAddr,
    broadcast_tx: broadcast::Sender<String>,
    broadcast_rx: &mut broadcast::Receiver<String>,
) {
    let ws_stream = match accept_async(stream).await {
        Ok(ws) => ws,
        Err(e) => {
            eprintln!("WebSocket handshake error from {}: {}", peer_addr, e);
            return;
        }
    };

    let (mut write, mut read) = ws_stream.split();

    loop {
        tokio::select! {
            msg = read.next() => {
                match msg {
                    Some(Ok(Message::Text(utf8_text))) => {
                        let text = utf8_text.as_str();
                        if let Ok(mut payload) = serde_json::from_str::<WsPayload>(text) {
                            if payload.r#type == "key" {
                                if let Some(is_down) = payload.is_down {
                                    let mut handled = false;
                                    if let Some(ref code) = payload.code {
                                        if VirtualGamepad::is_available() && VirtualGamepad::send_key(code, is_down) {
                                            handled = true;
                                        }
                                    }
                                    if !handled {
                                        if let Some(vk) = payload.vk {
                                            InputInjector::send_key(vk, is_down);
                                        }
                                    }
                                    payload.injected = Some(true);
                                    if let Ok(tagged_text) = serde_json::to_string(&payload) {
                                        let _ = broadcast_tx.send(tagged_text);
                                        continue;
                                    }
                                }
                            }
                        }
                        // Broadcast to other peer
                        let _ = broadcast_tx.send(text.to_string());
                    }
                    Some(Ok(Message::Close(_))) | None => break,
                    _ => {}
                }
            }
            b_msg = broadcast_rx.recv() => {
                if let Ok(text) = b_msg {
                    if write.send(Message::Text(text.into())).await.is_err() {
                        break;
                    }
                }
            }
        }
    }

    // Safety: Release all pressed keys on disconnect to eliminate stuck keys
    InputInjector::release_all();
    VirtualGamepad::release_all();
}

fn get_primary_ipv4() -> Option<Ipv4Addr> {
    let socket = std::net::UdpSocket::bind("0.0.0.0:0").ok()?;
    socket.connect("8.8.8.8:80").ok()?;
    match socket.local_addr().ok()?.ip() {
        std::net::IpAddr::V4(v4) => Some(v4),
        _ => None,
    }
}

pub fn get_local_ip_addresses() -> Vec<String> {
    let mut ips = Vec::new();

    // Standard loopback
    ips.push("127.0.0.1".to_string());

    if let Some(v4) = get_primary_ipv4() {
        let ip_str = v4.to_string();
        if !ips.contains(&ip_str) {
            ips.push(ip_str);
        }
    }

    ips
}
