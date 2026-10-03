# Code Quality, Security & Performance Standards

These rules enforce strict stability, safety, and speed across the codebase.

## 1. Security Protocols
- **Input Sanitization**: Always sanitize and validate client inputs using Zod or equivalent type validators before processing.
- **Sensitive Secrets**: Never hardcode API keys, secrets, or passwords. Always use environment variables (`.env.local`) and validate them at startup with `@t3-oss/env-nextjs` or a central `env.ts`.
- **XSS & Injection Prevention**: Rely on framework escaping (e.g. React JSX) and avoid `dangerouslySetInnerHTML` unless paired with DOMPurify.
- **Authentication**: Use secure HTTP-only cookies for session tokens, implement CSRF defense, and apply rate limiting on public mutation endpoints.

## 2. Web Performance & Core Web Vitals
- **LCP (Largest Contentful Paint)**: Keep under 2.5s. Optimize hero images with modern formats (WebP/AVIF), preload priority fonts, and avoid render-blocking scripts.
- **FID / INP (Interaction to Next Paint)**: Keep under 200ms. Break long JavaScript tasks into smaller chunks, use Web Workers for heavy compute.
- **CLS (Cumulative Layout Shift)**: Keep under 0.1. Always specify explicit `width` and `height` (or aspect-ratio) on images and media containers to prevent layout shifts.

## 3. Error Handling & Resilience
- **Error Boundaries**: Wrap major route sections and dynamic widgets in React Error Boundaries with graceful fallbacks.
- **User-Friendly Error Messages**: Display meaningful, empathetic error toasts instead of raw stack traces or empty blanks.
- **Logging**: Log handled errors with contextual details for debugging.
