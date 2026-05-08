---
'@arshad-shah/swift-chart': minor
---

Tooltip mount fixes: Shadow DOM, modals/popovers, and nested scroll containers.

The floating tooltip used to be appended directly to `document.body` and only listened to `window` scroll/resize. Three failure modes followed:

- **Shadow DOM encapsulation broken.** A chart inside a web component rendered its tooltip into the light DOM, outside the shadow root.
- **Stacking inversion in modals.** A chart inside a modal/popover with its own stacking context could render its tooltip *behind* the modal, since the body-mounted tooltip wasn't part of that stacking context.
- **Scroll on inner panels missed.** `scroll` doesn't bubble, so a single window listener never fired when an `overflow: auto` parent scrolled — the tooltip stayed floating at stale coordinates.

Now:

- The tooltip mounts next to the chart by default. Mount target priority: explicit `tooltipContainer` config → the canvas's shadow root if it has one → the chart container.
- New `tooltipContainer?: HTMLElement` config option for explicit portal control (Radix-style).
- `Tooltip` now walks the canvas ancestry at construction and attaches a `scroll` listener to every scrollable ancestor (any non-`visible` overflow), in addition to the window backstop. All listeners are cleaned up on `destroy()`.

Closes #23.
