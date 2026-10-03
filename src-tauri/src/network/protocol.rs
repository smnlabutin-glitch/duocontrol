use serde::{Deserialize, Serialize};

#[allow(dead_code)]
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum PacketType {
    KeyEvent = 1,
    Ping = 2,
    Pong = 3,
    Heartbeat = 4,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct InputPacket {
    pub packet_type: PacketType,
    pub key_code: u16,
    pub is_down: bool,
    pub sequence: u32,
    pub timestamp_us: u64,
}

#[allow(dead_code)]
impl InputPacket {
    pub fn new_key(key_code: u16, is_down: bool, sequence: u32) -> Self {
        let timestamp_us = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_micros() as u64;

        Self {
            packet_type: PacketType::KeyEvent,
            key_code,
            is_down,
            sequence,
            timestamp_us,
        }
    }
}
