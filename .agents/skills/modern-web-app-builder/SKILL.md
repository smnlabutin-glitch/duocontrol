---
name: modern-web-app-builder
description: >-
  Use this skill when initializing, scaffolding, or developing modern web applications (React, Next.js, Vite, TypeScript), organizing component structure, setting up routing, and managing application state.
---

# Modern Web App Builder Skill

End-to-end procedure for bootstrapping, structuring, and developing scalable web applications.

## 1. Project Initialization & Tooling
- For full-stack / SEO-driven apps: Next.js (App Router) + TypeScript + TailwindCSS.
- For client-first / SPA dashboards: Vite + React + TypeScript + TailwindCSS.
- Command for Vite:
  ```bash
  npm create vite@latest . -- --template react-ts
  npm install
  npm install -D tailwindcss @tailwindcss/vite (or postcss autoprefixer)
  npm install lucide-react clsx tailwind-merge zustand @tanstack/react-query
  ```

## 2. Setting Up Essential Utilities
Create `src/lib/utils.ts` for safe class merging:
```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

## 3. Core Component Architecture
Organize primitives in `src/components/ui/`:
- `button.tsx`: Multi-variant button (`default`, `secondary`, `outline`, `ghost`, `destructive`, `glow`).
- `card.tsx`: Base container with subtle border, backdrop-filter, and card header/body/footer.
- `input.tsx`: Clean text field with label, error message, and focus ring.
- `modal.tsx`: Accessible dialog with backdrop fade and spring entrance.

## 4. State Management Best Practices
- **Global UI Store** (`src/stores/useUiStore.ts`):
  ```typescript
  import { create } from 'zustand';

  interface UiState {
    isSidebarOpen: boolean;
    activeTheme: 'dark' | 'light' | 'system';
    toggleSidebar: () => void;
    setTheme: (theme: 'dark' | 'light' | 'system') => void;
  }

  export const useUiStore = create<UiState>((set) => ({
    isSidebarOpen: true,
    activeTheme: 'dark',
    toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
    setTheme: (theme) => set({ activeTheme: theme }),
  }));
  ```

## 5. Verification
- Run `npm run build` or `npm run dev` to verify clean compilation without TypeScript errors.
