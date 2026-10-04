//! Windows SendInput keyboard injection engine
#[cfg(windows)]
use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
    MapVirtualKeyW, SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT, KEYEVENTF_KEYUP,
    KEYEVENTF_SCANCODE, MAPVK_VK_TO_VSC, VIRTUAL_KEY,
};
#[cfg(windows)]
use std::mem::size_of;

pub struct InputInjector;

impl InputInjector {
    /// Injects a hardware scan code / virtual key into the active Windows window
    #[cfg(windows)]
    pub fn send_key(vk: u16, is_down: bool) -> bool {
        unsafe {
            // Map virtual key to hardware scan code for DirectX / 3D game engines
            let scan = MapVirtualKeyW(vk as u32, MAPVK_VK_TO_VSC) as u16;

            let mut flags = KEYEVENTF_SCANCODE;
            if !is_down {
                flags |= KEYEVENTF_KEYUP;
            }

            let mut input = INPUT {
                r#type: INPUT_KEYBOARD,
                Anonymous: INPUT_0 {
                    ki: KEYBDINPUT {
                        wVk: vk as VIRTUAL_KEY,
                        wScan: scan,
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
