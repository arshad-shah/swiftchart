---
'@arshad-shah/swift-chart': patch
---

Fix: React `onPointClick` prop changes are now propagated to the underlying chart after mount.

Previously, `useChart` excluded `onClick` from its config-diff path (functions don't survive `JSON.stringify`) and the mount-only effect captured the first render's handler into `chart.config.onClick`. Subsequent prop swaps were silently ignored, so any `onPointClick` that closed over component state showed stale values for the chart's lifetime.

The hook now syncs the latest handler reference into `chart.config.onClick` on every render. The chart's bound click listener already reads `config.onClick` lazily on each click, so no redraw, recreation, or `setData` is triggered — the cost is one assignment per render.

Closes #19.
