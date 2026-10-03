# UI/UX Aesthetics & Visual Design Rules

These rules govern every interface component, page, and mobile screen designed in this project.

## 1. Palette & Color Dynamics
- **No Raw Primary Colors**: Never use standard `#ff0000`, `#00ff00`, `#0000ff`, or pitch black `#000000` for backgrounds.
- **Curated Dark Mode Tokens**:
  - Deep Surface: `hsl(224, 71%, 4%)` (#090d16) or `hsl(240, 10%, 3.9%)` (#0a0a0c)
  - Card / Panel Surface: `hsl(224, 71%, 7%)` with `border: 1px solid hsla(0, 0%, 100%, 0.08)`
  - Elevated Popovers / Modals: `hsl(224, 71%, 10%)` with subtle box-shadow: `0 20px 50px rgba(0,0,0,0.5)`
- **Accents & Highlights**:
  - Primary Accent: Neon Indigo / Electric Violet / Cyber Cyan (`hsl(250, 95%, 64%)`, `hsl(187, 92%, 55%)`)
  - Gradient Fills: Subtle two-stop or three-stop linear gradients (e.g. `linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)`)
  - Glowing Overlays: Soft radial gradients behind hero sections (`radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.15), transparent 70%)`)

## 2. Glassmorphism & Depth
- Use backdrop blur for headers, navigation bars, cards, and floating panels:
  ```css
  background: rgba(18, 24, 38, 0.7);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  ```
- Subtly highlight the top edge of cards to mimic physical glass/metal bevels:
  `box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.1);`

## 3. Typography Hierarchy
- Headings: Bold or Semibold, tight letter-spacing (`letter-spacing: -0.025em;` or `-0.03em`), line-height `1.1` to `1.2`.
- Body: 14px to 16px, relaxed line-height (`1.6`), text color in muted contrast (`#94a3b8` or `hsla(0, 0%, 100%, 0.7)`).
- Fonts:
  - Sans-Serif / Modern Tech: *Inter*, *Plus Jakarta Sans*, *Outfit*, *Geist*.
  - Display / Creative: *Syne*, *Clash Display*, *Cabinet Grotesk*.
  - Monospace (Code/Data): *JetBrains Mono*, *Geist Mono*.

## 4. Spacing & Spatial Rhythm
- Base 4px / 8px grid system: gaps and padding in increments of `8px`, `12px`, `16px`, `24px`, `32px`, `48px`, `64px`.
- Ample negative space: Avoid claustrophobic layouts. Give elements room to breathe.
- Card padding: minimum `20px` to `32px` on desktop, `16px` on mobile.

## 5. Micro-Animations & Interactivity
- Transitions: Standard ease curves: `cubic-bezier(0.16, 1, 0.3, 1)` (spring-like deceleration).
- Button Hover:
  - Subtle lift: `transform: translateY(-1px);`
  - Glow enhancement: `box-shadow: 0 4px 20px -2px rgba(99, 102, 241, 0.4);`
  - Active tap: `transform: scale(0.98);`
- Skeleton Loaders: Shimmer wave animations over static placeholders during asynchronous data fetches.
- Empty States: Friendly illustrations, clear copy, and primary action buttons.
