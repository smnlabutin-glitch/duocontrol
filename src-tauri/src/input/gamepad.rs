//! Virtual Xbox 360 Gamepad Emulation via ViGEmBus
#[cfg(windows)]
use vigem_client::{Client, TargetId, XGamepad, Xbox360Wired, XButtons};
#[cfg(windows)]
use std::sync::Mutex;

#[cfg(windows)]
struct GamepadState {
    target: Xbox360Wired<Client>,
    gamepad: XGamepad,
    w_down: bool,
    s_down: bool,
    a_down: bool,
    d_down: bool,
}

#[cfg(windows)]
static VIRTUAL_PAD: Mutex<Option<GamepadState>> = Mutex::new(None);
#[cfg(windows)]
static VIGEM_INITIALIZED: Mutex<bool> = Mutex::new(false);

pub struct VirtualGamepad;

impl VirtualGamepad {
    /// Attempts to initialize connection with the Windows ViGEmBus kernel driver
    #[cfg(windows)]
    pub fn try_init() -> bool {
        let mut init_lock = VIGEM_INITIALIZED.lock().unwrap();
        if *init_lock {
            return VIRTUAL_PAD.lock().unwrap().is_some();
        }
        *init_lock = true;

        match Client::connect() {
            Ok(client) => {
                let mut target = Xbox360Wired::new(client, TargetId::XBOX360_WIRED);
                if target.plugin().is_ok() {
                    let gamepad = XGamepad::default();
                    let _ = target.update(&gamepad);
                    let mut pad_lock = VIRTUAL_PAD.lock().unwrap();
                    *pad_lock = Some(GamepadState {
                        target,
                        gamepad,
                        w_down: false,
                        s_down: false,
                        a_down: false,
                        d_down: false,
                    });
                    println!("DuoControl: ViGEmBus connected! Virtual Xbox 360 Controller ready.");
                    true
                } else {
                    println!("DuoControl: ViGEm plugin failed.");
                    false
                }
            }
            Err(e) => {
                println!("DuoControl: ViGEmBus driver not installed or not running ({:?}). Fallback to Direct ScanCode.", e);
                false
            }
        }
    }

    #[cfg(windows)]
    pub fn is_available() -> bool {
        Self::try_init()
    }

    #[cfg(windows)]
    pub fn send_key(code: &str, is_down: bool) -> bool {
        if !Self::try_init() {
            return false;
        }

        let mut lock = match VIRTUAL_PAD.lock() {
            Ok(l) => l,
            Err(_) => return false,
        };

        if let Some(state) = lock.as_mut() {
            let code_upper = code.to_uppercase();
            match code_upper.as_str() {
                "KEYW" | "ARROWUP" => state.w_down = is_down,
                "KEYS" | "ARROWDOWN" => state.s_down = is_down,
                "KEYA" | "ARROWLEFT" => state.a_down = is_down,
                "KEYD" | "ARROWRIGHT" => state.d_down = is_down,
                "SPACE" => {
                    if is_down {
                        state.gamepad.buttons.raw |= XButtons::A;
                    } else {
                        state.gamepad.buttons.raw &= !XButtons::A;
                    }
                }
                "SHIFTLEFT" | "SHIFTRIGHT" => {
                    // Left Stick Click (Sprint in most FPS/3D games)
                    if is_down {
                        state.gamepad.buttons.raw |= XButtons::LTHUMB;
                    } else {
                        state.gamepad.buttons.raw &= !XButtons::LTHUMB;
                    }
                }
                "CONTROLLEFT" | "CONTROLRIGHT" | "KEYC" => {
                    // Button B (Crouch / Slide)
                    if is_down {
                        state.gamepad.buttons.raw |= XButtons::B;
                    } else {
                        state.gamepad.buttons.raw &= !XButtons::B;
                    }
                }
                "KEYE" | "KEYF" => {
                    // Button X (Interact / Use)
                    if is_down {
                        state.gamepad.buttons.raw |= XButtons::X;
                    } else {
                        state.gamepad.buttons.raw &= !XButtons::X;
                    }
                }
                "KEYR" => {
                    // Button Y (Reload / Switch weapon)
                    if is_down {
                        state.gamepad.buttons.raw |= XButtons::Y;
                    } else {
                        state.gamepad.buttons.raw &= !XButtons::Y;
                    }
                }
                "TAB" => {
                    // Back / View (Scoreboard / Map)
                    if is_down {
                        state.gamepad.buttons.raw |= XButtons::BACK;
                    } else {
                        state.gamepad.buttons.raw &= !XButtons::BACK;
                    }
                }
                "ESCAPE" => {
                    // Start (Pause menu)
                    if is_down {
                        state.gamepad.buttons.raw |= XButtons::START;
                    } else {
                        state.gamepad.buttons.raw &= !XButtons::START;
                    }
                }
                _ => return false,
            }

            // Compute analog stick position from WASD
            let mut ly: i16 = 0;
            if state.w_down && !state.s_down {
                ly = 32767;
            } else if state.s_down && !state.w_down {
                ly = -32768;
            }

            let mut lx: i16 = 0;
            if state.d_down && !state.a_down {
                lx = 32767;
            } else if state.a_down && !state.d_down {
                lx = -32768;
            }

            state.gamepad.thumb_lx = lx;
            state.gamepad.thumb_ly = ly;

            let _ = state.target.update(&state.gamepad);
            true
        } else {
            false
        }
    }

    #[cfg(windows)]
    pub fn release_all() {
        if let Ok(mut lock) = VIRTUAL_PAD.lock() {
            if let Some(state) = lock.as_mut() {
                state.w_down = false;
                state.s_down = false;
                state.a_down = false;
                state.d_down = false;
                state.gamepad = XGamepad::default();
                let _ = state.target.update(&state.gamepad);
            }
        }
    }

    #[cfg(not(windows))]
    pub fn is_available() -> bool { false }
    #[cfg(not(windows))]
    pub fn send_key(_code: &str, _is_down: bool) -> bool { false }
    #[cfg(not(windows))]
    pub fn release_all() {}
}
