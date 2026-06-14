---
"@arshad-shah/swift-chart": patch
---

Bug fixes and a clean dependency audit.

- **LTTB downsampling**: the final interior bucket's "next bucket" is empty, so the next-point average was left at `(0, 0)`, skewing triangle-area selection and dropping the last significant feature (e.g. a trailing peak). It now anchors on the final data point. Affects `lttbIndices`/`lttbDownsampleXY`.
- **Quadtree**: points lying exactly on an internal split line were filed into multiple child quadrants, double-counting them in `queryRect`/`size`. Each point is now routed to a single quadrant.
- **ComboChart**: all-negative datasets left the zero baseline outside the scale, drawing every bar off the top of the plot. The scale now clamps both ends to include zero (matching `BarChart`).
- **FunnelChart**: in `pyramid` mode hit-testing was vertically inverted, so tooltips/highlights resolved to the mirrored stage. The slot index is now inverted back to the data index.
- **StackedAreaChart**: a hole in a ragged pre-built dataset propagated `NaN` through the additive stack and blanked the chart. Holes are now coerced to `0`.
- **HeatmapChart**: when the legend left no room for cells the index math produced a `NaN` hover index; this is now guarded.

Dependencies: added `pnpm.overrides` to pull patched `devalue` (>=5.8.1, GHSA-77vg-94rm-hx3p) and `brace-expansion` (>=5.0.6, GHSA-jxxr-4gwj-5jf2) into the dev/docs tree. `pnpm audit` is clean. No runtime API changes; the published bundle is unaffected by the dep overrides.
