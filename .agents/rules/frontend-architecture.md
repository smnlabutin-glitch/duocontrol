# Frontend Architecture & Component Engineering Rules

These rules dictate component organization, code patterns, and state architecture.

## 1. Directory Structure (Feature-Based)
```text
src/
├── app/                  # Routes, pages, layouts (App Router or TanStack Router)
├── components/
│   ├── ui/               # Primitive, reusable UI elements (Button, Input, Modal, Badge)
│   ├── layout/           # Header, Sidebar, Footer, Navigation
│   └── feedback/         # Toast, Skeleton, EmptyState, ErrorBoundary
├── features/             # Feature-driven slices
│   └── [feature-name]/
│       ├── components/   # Feature-specific components
│       ├── hooks/        # Feature hooks (queries, mutations)
│       ├── types/        # Feature TypeScript definitions
│       └── utils/        # Feature helpers
├── hooks/                # Shared global hooks (useTheme, useMediaQuery, useDebounce)
├── lib/                  # Utilities, API client instances, formatters
└── types/                # Global domain models and interfaces
```

## 2. Component Design Principles
- **Single Responsibility**: One component per file. Break complex components into smaller sub-components.
- **Controlled vs. Uncontrolled**: Prefer controlled inputs with React Hook Form + Zod for robust validation.
- **Composition over Inheritance**: Use slots and children patterns for extensible layouts.
- **Accessibility by Default**:
  - All interactive elements must have clear focus indicators (`focus-visible:ring-2`).
  - Use ARIA roles, `aria-expanded`, `aria-label` where text is not visually present.

## 3. State Management Strategy
- **Server State**: Use React Query (TanStack Query) or SWR for caching, background revalidation, and optimistic updates.
- **Global Client State**: Use lightweight stores like Zustand for state that spans multiple routes (e.g. user session, active modal, cart, theme).
- **Local State**: `useState` / `useReducer` for isolated UI interactions (toggle dropdown, tab switch).

## 4. TypeScript Guidelines
- Strict mode enabled (`noImplicitAny`, `strictNullChecks`).
- Avoid `any` - use `unknown` with type guards if types are indeterminate.
- Derive types from schemas whenever possible (e.g. `z.infer<typeof UserSchema>`).
