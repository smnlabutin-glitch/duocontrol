// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod input;
mod network;

use input::injector::InputInjector;
use network::server::{get_local_ip_addresses, ServerManager};
use serde::Serialize;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::State;

#[cfg(windows)]
use windows_sys::Win32::UI::WindowsAndMessaging::{
    CallNextHookEx, SetWindowsHookExW, KBDLLHOOKSTRUCT, WH_KEYBOARD_LL,
};

static KEYBOARD_MUTED: AtomicBool = AtomicBool::new(false);

#[cfg(windows)]
unsafe extern "system" fn low_level_keyboard_proc(code: i32, wparam: usize, lparam: isize) -> isize {
    if code >= 0 && KEYBOARD_MUTED.load(Ordering::SeqCst) {
        let kbd = *(lparam as *const KBDLLHOOKSTRUCT);
        // LLKHF_INJECTED is bit 4 (0x10) of flags
        let is_injected = (kbd.flags & 0x10) != 0;
        if !is_injected {
            let vk = kbd.vkCode as u16;
            let is_movement_key = matches!(
                vk,
                0x57 | 0x41 | 0x53 | 0x44 | // W, A, S, D
                0x20 |                      // Space
                0x10 | 0xA0 | 0xA1 |        // Shift
                0x11 | 0xA2 | 0xA3 |        // Ctrl
                0x45 | 0x52 | 0x51 | 0x46   // E, R, Q, F
            );
            if is_movement_key {
                return 1; // Block keystroke on physical host keyboard
            }
        }
    }
    CallNextHookEx(std::ptr::null_mut(), code, wparam, lparam)
}

#[derive(Serialize)]
pub struct SystemStatus {
    pub is_windows: bool,
    pub keyboard_muted: bool,
    pub latency_mode: String,
    pub tick_rate_hz: u32,
    pub local_ips: Vec<String>,
}

#[tauri::command]
fn get_system_status() -> SystemStatus {
    SystemStatus {
        is_windows: cfg!(windows),
        keyboard_muted: KEYBOARD_MUTED.load(Ordering::SeqCst),
        latency_mode: "Kernel-Direct 1000Hz".to_string(),
        tick_rate_hz: 1000,
        local_ips: get_local_ip_addresses(),
    }
}

#[tauri::command]
fn get_host_ips() -> Vec<String> {
    get_local_ip_addresses()
}

#[tauri::command]
async fn start_server(
    port: Option<u16>,
    server: State<'_, Arc<ServerManager>>,
) -> Result<String, String> {
    let p = port.unwrap_or(44555);
    server.start(p).await
}

#[tauri::command]
async fn stop_server(server: State<'_, Arc<ServerManager>>) -> Result<(), ()> {
    server.stop().await;
    Ok(())
}

use crate::input::gamepad::VirtualGamepad;
use std::sync::Mutex;

static CURRENT_INPUT_MODE: Mutex<String> = Mutex::new(String::new());

#[tauri::command]
fn get_input_capabilities() -> serde_json::Value {
    let has_vigem = VirtualGamepad::is_available();
    let mode = CURRENT_INPUT_MODE.lock().map(|m| m.clone()).unwrap_or_default();
    let active_mode = if mode.is_empty() {
        if has_vigem { "gamepad" } else { "keyboard" }
    } else {
        &mode
    };
    serde_json::json!({
        "has_vigem": has_vigem,
        "current_mode": active_mode,
        "keyboard_muted": KEYBOARD_MUTED.load(Ordering::SeqCst),
    })
}

#[tauri::command]
fn set_input_mode(mode: String) -> String {
    if let Ok(mut lock) = CURRENT_INPUT_MODE.lock() {
        *lock = mode.clone();
    }
    mode
}

#[tauri::command]
fn inject_key_event(vk_code: u16, is_down: bool, code: Option<String>) -> bool {
    let mode = CURRENT_INPUT_MODE.lock().map(|m| m.clone()).unwrap_or_default();
    if mode == "gamepad" {
        if let Some(ref c) = code {
            if VirtualGamepad::send_key(c, is_down) {
                return true;
            }
        }
    }
    InputInjector::send_key(vk_code, is_down)
}

#[tauri::command]
fn toggle_keyboard_mute(mute: bool) -> bool {
    KEYBOARD_MUTED.store(mute, Ordering::SeqCst);
    mute
}

#[tauri::command]
fn panic_reset() -> bool {
    KEYBOARD_MUTED.store(false, Ordering::SeqCst);
    InputInjector::release_all();
    VirtualGamepad::release_all();
    true
}

#[tauri::command]
fn release_all_keys() -> bool {
    InputInjector::release_all();
    VirtualGamepad::release_all();
    true
}

fn main() {
    let server_manager = Arc::new(ServerManager::new());

    tauri::Builder::default()
        .manage(server_manager.clone())
        .setup(move |_app| {
            #[cfg(windows)]
            unsafe {
                SetWindowsHookExW(
                    WH_KEYBOARD_LL,
                    Some(low_level_keyboard_proc),
                    std::ptr::null_mut(),
                    0,
                );
            }

            let sm_clone = server_manager.clone();
            tauri::async_runtime::spawn(async move {
                let _ = sm_clone.start(44555).await;
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_system_status,
            get_host_ips,
            start_server,
            stop_server,
            inject_key_event,
            toggle_keyboard_mute,
            panic_reset,
            release_all_keys,
            get_input_capabilities,
            set_input_mode
        ])
        .run(tauri::generate_context!())
        .expect("error while running DuoControl application");
}
