
export class InputService {
  private keyListeners: Set<(key: string, isDown: boolean) => void> = new Set();
  private mouseListeners: Set<(btn: 'left' | 'right' | 'middle', isDown: boolean) => void> = new Set();
  private panicListeners: Set<() => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.handleKeyDown);
      window.addEventListener('keyup', this.handleKeyUp);
      window.addEventListener('mousedown', this.handleMouseDown);
      window.addEventListener('mouseup', this.handleMouseUp);
      window.addEventListener('contextmenu', (e) => e.preventDefault());
    }
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    // Check Panic Hotkey: Ctrl + Shift + F12
    if (e.ctrlKey && e.shiftKey && e.key === 'F12') {
      e.preventDefault();
      this.panicListeners.forEach((fn) => fn());
      return;
    }

    const key = e.key.toUpperCase();
    this.keyListeners.forEach((fn) => fn(key, true));
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    const key = e.key.toUpperCase();
    this.keyListeners.forEach((fn) => fn(key, false));
  };

  private handleMouseDown = (e: MouseEvent) => {
    const btn = e.button === 0 ? 'left' : e.button === 2 ? 'right' : 'middle';
    this.mouseListeners.forEach((fn) => fn(btn, true));
  };

  private handleMouseUp = (e: MouseEvent) => {
    const btn = e.button === 0 ? 'left' : e.button === 2 ? 'right' : 'middle';
    this.mouseListeners.forEach((fn) => fn(btn, false));
  };

  public onKey(fn: (key: string, isDown: boolean) => void) {
    this.keyListeners.add(fn);
    return () => this.keyListeners.delete(fn);
  }

  public onMouse(fn: (btn: 'left' | 'right' | 'middle', isDown: boolean) => void) {
    this.mouseListeners.add(fn);
    return () => this.mouseListeners.delete(fn);
  }

  public onPanic(fn: () => void) {
    this.panicListeners.add(fn);
    return () => this.panicListeners.delete(fn);
  }

  public cleanup() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mouseup', this.handleMouseUp);
  }
}

export const inputService = new InputService();
