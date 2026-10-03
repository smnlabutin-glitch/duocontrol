---
name: qa-code-auditor
description: >-
  Use this skill when auditing code quality, testing web and mobile apps, verifying accessibility (WCAG), optimizing bundle size, checking performance (Core Web Vitals), and finding bugs or security vulnerabilities.
---

# QA, Performance & Security Auditor Skill

A structured verification runbook to ensure codebases remain robust, fast, and bug-free.

## 1. Code Review Checklist
- [ ] **Type Safety**: No unchecked type casts (`as any`), unhandled promises, or missing return types.
- [ ] **Memory Leaks**: Event listeners, subscriptions, and intervals properly cleaned up in `useEffect` / `dispose`.
- [ ] **Security**: No sensitive data leaked to client payloads; no unsanitized user content rendered.

## 2. Accessibility (a11y) Verification
- [ ] **Keyboard Navigability**: Can the user tab through every interactive element in a logical order?
- [ ] **Contrast Ratios**: Normal text meets at least 4.5:1 contrast against its background; large text meets 3:1.
- [ ] **Form Labels**: Every input has an associated `<label>` element or `aria-label`.
- [ ] **Screen Readers**: Modals trap focus; alert dialogs announce changes via `aria-live`.

## 3. Automated Testing Guide
- Unit Tests: Run using Vitest or Jest.
  ```bash
  npm test
  ```
- End-to-End Tests: Run user journeys using Playwright.
  ```bash
  npx playwright test
  ```

## 4. Performance Audit Steps
- Inspect bundle size using `@next/bundle-analyzer` or `rollup-plugin-visualizer`.
- Check image optimization: Ensure all images are lazy-loaded unless marked as priority above the fold.
