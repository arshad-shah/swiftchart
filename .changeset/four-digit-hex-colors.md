---
"@arshad-shah/swift-chart": patch
---

Fix: 4-digit shorthand hex colours (`#RGBA`, e.g. `#f008`) are now parsed correctly instead of silently falling back to black. Both the tooltip/fill helper (`hexToRgba`) and the colour-interpolation path (`lerpColor`, used by heatmap/choropleth gradients) now expand 4-digit hex the same way browsers do — doubling each digit and dropping the alpha channel. No API changes.
