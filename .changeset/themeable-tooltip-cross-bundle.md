---
'@arshad-shah/swift-chart': minor
---

Theme system now reaches the tooltip, and `addTheme()` works from either entry point.

**Tooltip theming.** The floating tooltip panel previously had hard-coded dark colours that ignored the active theme — light themes like `arctic` rendered a dark tooltip. Tooltip colours now derive from the active theme automatically, and `Theme` gains three optional fields for full control:

- `tooltipBg` — falls back to `theme.surface`
- `tooltipBorder` — falls back to `theme.axis`
- `tooltipText` — falls back to `theme.text`

`BaseChart` propagates the theme into `Tooltip` on construction, on `setTheme()`, and on `update({ theme })`, so live theme switches repaint the tooltip.

**Cross-bundle theme registry (bug fix).** `addTheme()` was registering into a private map inside the core ESM bundle, while charts imported from `@arshad-shah/swift-chart/react` looked up theme names in a separate map inlined into the React bundle. Custom themes registered at app startup silently fell through to `midnight` when used via `<Line theme="my-theme" />`. The registry now lives on `globalThis`, so both bundles share one source of truth, and `THEMES` / `addTheme` / `resolveTheme` are now also re-exported from `@arshad-shah/swift-chart/react` for consumers who only import from the React entry.
