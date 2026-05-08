---
'@arshad-shah/swift-chart': patch
---

Fix: a finger tap on a chart now fires `onClick` / `onPointClick` on touch devices.

The chart was resetting `hoverIndex` to `-1` in its `touchend` handler before the browser dispatched the synthetic `click` that follows a tap. The click handler's guard (`hoverIndex >= 0`) therefore always failed and the user's handler never ran. Mouse clicks on desktop were unaffected.

`touchend` now snapshots the touched index, and the click handler consumes it within a 700 ms window. The snapshot is one-shot (cleared after consumption) and `touchcancel` discards it so an interrupted gesture can't replay as a click later.

Closes #20.
