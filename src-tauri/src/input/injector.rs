//! Windows SendInput keyboard injection engine
#[cfg(windows)]
use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
    MapVirtualKeyW, SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT, KEYEVENTF_EXTENDEDKEY,
    KEYEVENTF_KEYUP, KEYEVENTF_SCANCODE, MAPVK_VK_TO_VSC, VIRTUAL_KEY,
};
#[cfg(windows)]
use std::mem::size_of;
#[cfg(windows)]
use std::sync::Mutex;
#[cfg(windows)]
use std::collections::HashSet;

#[cfg(windows)]
static ACTIVE_KEYS: Mutex<Option<HashSet<u16>>> = Mutex::new(None);

pub struct InputInjector;

impl InputInjector {
    /// Injects a hardware scan code / virtual key into the active Windows window
    #[cfg(windows)]
    pub fn send_key(vk: u16, is_down: bool) -> bool {
        unsafe {
            // Track active key state to eliminate stuck keys
            if let Ok(mut lock) = ACTIVE_KEYS.lock() {
                let set = lock.get_or_insert_with(HashSet::new);
                if is_down {
                    set.insert(vk);
                } else {
                    set.remove(&vk);
                }
            }

            // Map virtual key to hardware scan code for DirectX / 3D game engines
            let scan = MapVirtualKeyW(vk as u32, MAPVK_VK_TO_VSC) as u16;

            let is_extended = matches!(
                vk,
                0x21..=0x2E | 0x6F | 0xA1 | 0xA3 | 0xA5
            );

            let mut flags = 0;
            if scan != 0 {
                flags |= KEYEVENTF_SCANCODE;
            }
            if is_extended {
                flags |= KEYEVENTF_EXTENDEDKEY;
            }
            if !is_down {
                flags |= KEYEVENTF_KEYUP;
            }

            // MSDN Requirement: When KEYEVENTF_SCANCODE is specified, wVk MUST be 0.
            // Setting both wVk and wScan confuses DirectInput/RawInput drivers, causing stuck keys.
            let w_vk = if (flags & KEYEVENTF_SCANCODE) != 0 {
                0
            } else {
                vk as VIRTUAL_KEY
            };

            let mut input = INPUT {
                r#type: INPUT_KEYBOARD,
                Anonymous: INPUT_0 {
                    ki: KEYBDINPUT {
                        wVk: w_vk,
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

    /// Releases all currently pressed keys injected by DuoControl
    #[cfg(windows)]
    pub fn release_all() {
        let keys_to_release: Vec<u16> = {
            if let Ok(mut lock) = ACTIVE_KEYS.lock() {
                if let Some(set) = lock.as_mut() {
                    let keys: Vec<u16> = set.drain().collect();
                    keys
                } else {
                    Vec::new()
                }
            } else {
                Vec::new()
            }
        };

        for vk in keys_to_release {
            unsafe {
                let scan = MapVirtualKeyW(vk as u32, MAPVK_VK_TO_VSC) as u16;
                let is_extended = matches!(
                    vk,
                    0x21..=0x2E | 0x6F | 0xA1 | 0xA3 | 0xA5
                );
                let mut flags = KEYEVENTF_KEYUP;
                if scan != 0 {
                    flags |= KEYEVENTF_SCANCODE;
                }
                if is_extended {
                    flags |= KEYEVENTF_EXTENDEDKEY;
                }
                let w_vk = if (flags & KEYEVENTF_SCANCODE) != 0 { 0 } else { vk as VIRTUAL_KEY };

                let mut input = INPUT {
                    r#type: INPUT_KEYBOARD,
                    Anonymous: INPUT_0 {
                        ki: KEYBDINPUT {
                            wVk: w_vk,
                            wScan: scan,
                            dwFlags: flags,
                            time: 0,
                            dwExtraInfo: 0,
                        },
                    },
                };
                SendInput(1, &mut input, size_of::<INPUT>() as i32);
            }
        }
    }

    #[cfg(not(windows))]
    pub fn send_key(_vk: u16, _is_down: bool) -> bool {
        true
    }

    #[cfg(not(windows))]
    pub fn release_all() {}
}
