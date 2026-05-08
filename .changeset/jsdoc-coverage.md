---
'@arshad-shah/swift-chart': patch
---

Documentation: every public export now has JSDoc, and every public field on the cross-chart types has a one-line description.

The package shipped with thorough docs on the chart-config interfaces but had a handful of top-level exports (`Animator`, `EASINGS`, `EasingFn`, `BaseChart`, `Tooltip`, `TooltipRow`, `TooltipContent`, `RoundedBarOpts`, `THEMES`, `resolveTheme`, `addTheme`, `ChartRef`, perf-layout interfaces, `DrawCommand`, `PathSegment`, `OffscreenRenderResult`) and 50+ public fields (`Padding`, `Dataset`, `ResolvedData`, `PlotArea`, `NiceScale`, `GaugeSegment`, `ScatterPoint`, `WaterfallItem`, `TreemapItem`, `CandlestickItem`, `BoxplotItem`, `FunnelItem`, `SankeyNode`/`Link`, `NetworkNode`/`Link`, `BulletItem`, `TreemapRect`, `SparklineComponentProps`, etc.) that were undocumented.

All of those now have JSDoc comments — including `@param`, `@example`, and `@see` cross-references where useful — so consumers get hover-help in their IDE and the auto-generated TypeDoc API reference is fully populated. No runtime behaviour changes.
