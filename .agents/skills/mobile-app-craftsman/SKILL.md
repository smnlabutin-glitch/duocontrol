---
name: mobile-app-craftsman
description: >-
  Use this skill when developing mobile applications in Flutter (Dart) or React Native (Expo/TypeScript), designing mobile UI, touch interactions, safe area layouts, bottom navigation, and mobile state.
---

# Mobile App Craftsman Skill

Engineering guidelines and workflows for crafting fluid, responsive iOS & Android mobile applications.

## 1. Ergonomic Mobile Layout Principles
- **Thumb Zone Design**: Place high-frequency interactions (navigation tabs, primary action buttons, search bars) within the lower third of the screen.
- **Safe Area Insets**: Always respect system gestures, status bars, and home indicators using `SafeArea` (Flutter) or `useSafeAreaInsets` (React Native).
- **Responsive Sizing**: Use relative units and fluid scaling rather than hardcoded pixel dimensions to support varying screen aspect ratios.

## 2. Flutter Workflow & Standards
- State Management: Riverpod or Bloc for predictable, testable state.
- Component Structure:
  - Separate business logic into ViewModels or Notifiers.
  - Break monolithic `build` methods into private widget classes or smaller widgets to optimize rebuilds.
- Aesthetics:
  - Configure `ThemeData` with `ColorScheme.fromSeed` using a curated primary hue.
  - Implement smooth page transitions (`CupertinoPageRoute` or custom `PageRouteBuilder`).

## 3. React Native / Expo Workflow
- Navigation: Expo Router (file-based) or React Navigation v7.
- Gestures: Use `react-native-gesture-handler` and `react-native-reanimated` for smooth 60/120fps physics-based gestures.
- Performance:
  - Replace `ScrollView` with `@shopify/flash-list` for lists containing more than 20 items.
  - Avoid inline functions in render callbacks.

## 4. Mobile Polish Checklist
- [ ] Visual press states: Opacity feedback on touch (`activeOpacity: 0.7` or ink splash).
- [ ] Keyboard handling: `KeyboardAvoidingView` to prevent inputs from being obscured.
- [ ] Offline resilience: Graceful connection status indicators and cached data fallbacks.
