// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod input;
mod network;

use input::injector::InputInjector;
use serde::Serialize;
use std::sync::atomic::{AtomicBool, Ordering};

static KEYBOARD_MUTED: AtomicBool = AtomicBool::new(false);

#[derive(Serialize)]
pub struct SystemStatus {
    pub is_windows: bool,
    pub keyboard_muted: bool,
    pub latency_mode: String,
    pub tick_rate_hz: u32,
}

#[tauri::command]
fn get_system_status() -> SystemStatus {
    SystemStatus {
        is_windows: cfg!(windows),
        keyboard_muted: KEYBOARD_MUTED.load(Ordering::SeqCst),
        latency_mode: "Kernel-Direct 1000Hz".to_string(),
        tick_rate_hz: 1000,
    }
}

#[tauri::command]
fn inject_key_event(vk_code: u16, is_down: bool) -> bool {
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
    true
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_system_status,
            inject_key_event,
            toggle_keyboard_mute,
            panic_reset
        ])
        .run(tauri::generate_context!())
        .expect("error while running DuoControl application");
}
