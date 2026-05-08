---
'@arshad-shah/swift-chart': minor
---

Accessibility umbrella: keyboard support, honest ARIA roles, live region, reduced-motion respect.

The chart canvas now adapts to whether it's interactive:

- **Interactive charts** (with `onClick` / `onPointClick`) drop the misleading `role="img"`, gain `aria-roledescription="interactive chart"`, get `tabIndex=0` plus a native focus ring, and respond to keyboard input — `Enter` / `Space` fire the click handler at the focused datum, `ArrowLeft` / `ArrowRight` walk the focus along the chart's primary axis (driving the existing hover + tooltip pipeline).
- **Non-interactive charts** keep `role="img"` and stay out of the tab order — purely-decorative charts no longer pull keyboard focus into a dead element.

Two more fixes:

- **`aria-describedby` replaces non-standard `aria-description`.** Setting `ariaDescription` now mounts a hidden element inside the container and wires it via the standard attribute. `update({ ariaDescription })` patches the element in place.
- **Polite live region announces data updates.** Each chart appends a hidden `role="status" aria-live="polite"` region; `setData()` writes a one-line summary to it (e.g. `"3 points, 2 series."`) so screen readers announce streaming / React-driven updates.
- **`prefers-reduced-motion` is auto-respected.** When the user has `reduce-motion` set and `animate` is unspecified, animations are skipped. Explicit `animate: true` / `false` still wins.

Adds a new `Accessibility` page to the docs guides covering all of the above.

Closes #22.
