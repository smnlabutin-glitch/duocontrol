//! Windows SendInput keyboard injection engine
#[cfg(windows)]
use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
    SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT, KEYEVENTF_KEYUP, KEYEVENTF_SCANCODE,
    VIRTUAL_KEY,
};
#[cfg(windows)]
use std::mem::size_of;

pub struct InputInjector;

impl InputInjector {
    /// Injects a hardware scan code / virtual key into the active Windows window
    #[cfg(windows)]
    pub fn send_key(vk: u16, is_down: bool) -> bool {
        unsafe {
            let mut flags = KEYEVENTF_SCANCODE;
            if !is_down {
                flags |= KEYEVENTF_KEYUP;
            }

            let mut input = INPUT {
                r#type: INPUT_KEYBOARD,
                Anonymous: INPUT_0 {
                    ki: KEYBDINPUT {
                        wVk: vk as VIRTUAL_KEY,
                        wScan: 0,
                        dwFlags: flags,
                        time: 0,
                        dwExtraInfo: 0,
                    },
                },
            };

            let sent = SendInput(1, &mut input, size_of::<INPUT>() as i32);
            sent == 1
        }
    }

    #[cfg(not(windows))]
    pub fn send_key(_vk: u16, _is_down: bool) -> bool {
        // Non-windows fallback mock
        true
    }
}
