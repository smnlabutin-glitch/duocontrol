---
name: ui-ux-pro-designer
description: >-
  Use this skill when designing user interfaces, styling web/mobile components, crafting design systems, picking color palettes, typography, glassmorphism, animations, or when the user requests a beautiful, modern, aesthetic look.
---

# UI/UX Pro Designer Skill

A specialized runbook for transforming basic concepts into visually stunning, award-worthy application interfaces.

## Workflow

### 1. Establish the Aesthetic Theme
Select a distinct visual direction tailored to the product's identity:
- **Neo-Brutalism**: High contrast, bold borders (2-3px solid black), quirky drop shadows without blur (`box-shadow: 4px 4px 0 #000`), playful vivid accents.
- **Sleek Dark Luxe (Linear / Vercel style)**: Deep dark background (`#090d16` or `#0b0f19`), subtle 1px border lines with `rgba(255, 255, 255, 0.08)`, soft glow accents, crisp sans-serif typography.
- **Modern Glassmorphic**: Frosted translucency (`backdrop-filter: blur(20px)`), iridescent subtle gradients, layered floating surfaces, smooth pill badges.
- **Warm Editorial / Minimalist**: Cream/warm off-white surfaces (`#faf9f6`), deep charcoal text, refined serif or grotesque headings, generous white space.

### 2. Configure Design Tokens (CSS / Tailwind)
Ensure standard CSS variables or Tailwind tokens are defined:
```css
:root {
  --font-sans: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  --font-display: 'Outfit', sans-serif;
  
  --bg-primary: hsl(224, 71%, 4%);
  --bg-surface: hsl(224, 71%, 7%);
  --bg-elevated: hsl(224, 71%, 10%);
  
  --border-subtle: hsla(0, 0%, 100%, 0.08);
  --border-highlight: hsla(0, 0%, 100%, 0.16);
  
  --primary: hsl(250, 95%, 64%);
  --primary-foreground: hsl(0, 0%, 100%);
  --accent-glow: hsla(250, 95%, 64%, 0.25);
  
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-full: 9999px;
}
```

### 3. Build UI Components with Delight
When coding a component, always include:
1. **Interactive States**:
   - `hover`: smooth color shift, subtle scale or translate lift (`translate-y-[-1px]`), elevated shadow.
   - `active`: press feedback (`scale-98`).
   - `focus-visible`: clear contrasting outline or ring (`ring-2 ring-primary ring-offset-2`).
2. **Layering & Depth**:
   - Give cards a 1px border with `border-subtle`.
   - Add a subtle top inner highlight: `box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.08)`.
3. **Typography Nuance**:
   - Use badge tags with lowercase tracking (`tracking-wide uppercase text-[10px] font-semibold`).
   - Keep numbers tabular where alignment matters (`font-variant-numeric: tabular-nums`).

### 4. Micro-Animations Checklist
- [ ] Add smooth transitions: `transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1)`.
- [ ] Use staggered entry animations for lists or cards (e.g. `framer-motion` or CSS `@keyframes fadeIn`).
- [ ] Implement pulsing or animated gradient borders for high-value CTA buttons.
