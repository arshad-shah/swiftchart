---
'@arshad-shah/swift-chart': minor
---

feat: rich click events for drill-down / user-journey integrations.

`onClick` (and the React `onPointClick` prop) now receives a third argument: a `ChartClickEvent` carrying the original row (`datum`), the resolved series, the numeric value, the categorical label, the series index, and the underlying `MouseEvent`. The two-argument signature still works — the event is additive.

```ts
// Drill-down: navigate using the original row that was clicked
onClick: (_i, _d, e) => {
  router.push(`/orders/${e.datum.id}`);
}

// Modifier-key behaviour
onClick: (_i, _d, e) => {
  if (e.nativeEvent.metaKey) window.open(linkFor(e.datum), '_blank');
}
```

Bubble, scatter, heatmap, and marimekko build a chart-shape-aware event so the payload reflects the actual point/cell clicked rather than the slot index. Series-aware charts (bubble, scatter, heatmap) populate `event.seriesIndex`; column-hover charts (line, area, multi-series bar) report `seriesIndex: -1` to signal a non-series-specific click.
