/**
 * Regression: issue #23 — tooltip was portalled to `document.body` and only
 * listened to `window` scroll/resize. That broke Shadow DOM encapsulation,
 * inverted stacking inside modals, and missed scrolls on inner
 * `overflow:auto` parents (since the `scroll` event does NOT bubble to
 * window).
 *
 * The fix moves the default mount target to the chart container (or to the
 * canvas's shadow root if it has one), exposes a `tooltipContainer` config
 * for explicit portal control, and walks the canvas ancestry attaching a
 * scroll listener to every scrollable ancestor.
 */
import { describe, it, expect, vi } from 'vitest';
import { LineChart, BarChart } from '../../src/charts';
import { Tooltip } from '../../src/core/tooltip';

function host(): HTMLDivElement {
  const d = document.createElement('div');
  d.style.cssText = 'width:600px;height:400px';
  document.body.appendChild(d);
  return d;
}

describe('Tooltip mount target', () => {
  it('defaults to the chart container, not document.body', () => {
    const div = host();
    const chart = new LineChart(div, { animate: false });
    chart.setData([{ x: 'a', y: 1 }], { x: 'x', y: 'y' });

    const tip = chart.tooltip!.el!;
    expect(tip.parentElement).toBe(div);
    // body should never contain a tooltip directly (only nested via container).
    expect(document.body.children).not.toContain(tip);
    chart.destroy();
  });

  it('an explicit tooltipContainer config wins over the auto pick', () => {
    const div = host();
    const portal = document.createElement('section');
    portal.id = 'tooltip-portal';
    document.body.appendChild(portal);
    const chart = new LineChart(div, {
      animate: false,
      tooltipContainer: portal,
    });
    expect(chart.tooltip!.el!.parentElement).toBe(portal);
    chart.destroy();
    portal.remove();
  });

  it('mounts inside the shadow root when the chart is in a web component', () => {
    const hostEl = document.createElement('div');
    document.body.appendChild(hostEl);
    const shadow = hostEl.attachShadow({ mode: 'open' });
    const inner = document.createElement('div');
    inner.style.cssText = 'width:600px;height:400px';
    shadow.appendChild(inner);

    const chart = new BarChart(inner, { animate: false });
    chart.setData([{ x: 'a', y: 1 }], { x: 'x', y: 'y' });

    const tip = chart.tooltip!.el!;
    // The tooltip's getRootNode() should be the same shadow root as the canvas's,
    // proving it stays inside the encapsulation boundary.
    expect(tip.getRootNode()).toBe(shadow);
    expect(chart.canvas.getRootNode()).toBe(shadow);
    expect(document.querySelector('.sc-tooltip')).toBeNull(); // not in light DOM
    chart.destroy();
    hostEl.remove();
  });
});

describe('Tooltip scroll-ancestor listening', () => {
  it('hides on scroll of an ancestor with overflow:auto, not just window', () => {
    // Outer panel that scrolls.
    const panel = document.createElement('div');
    panel.style.cssText = 'overflow:auto;width:400px;height:300px';
    const inner = host(); // adds to body
    panel.appendChild(inner);
    document.body.appendChild(panel);

    const chart = new LineChart(inner, { animate: false });
    chart.setData([{ x: 'a', y: 1 }], { x: 'x', y: 'y' });
    const tip = chart.tooltip!;
    // Show, then scroll the panel (NOT the window — scroll doesn't bubble).
    tip.show(50, 50, 'hello');
    expect(tip.el!.style.opacity).toBe('1');

    panel.dispatchEvent(new Event('scroll'));
    expect(tip.el!.style.opacity).toBe('0');
    expect(tip.el!.getAttribute('aria-hidden')).toBe('true');
    chart.destroy();
    panel.remove();
  });

  it('still hides on window scroll (the original behaviour)', () => {
    const div = host();
    const chart = new LineChart(div, { animate: false });
    const tip = chart.tooltip!;
    tip.show(50, 50, 'hello');
    expect(tip.el!.style.opacity).toBe('1');
    window.dispatchEvent(new Event('scroll'));
    expect(tip.el!.style.opacity).toBe('0');
    chart.destroy();
  });

  it('removes ancestor scroll listeners on destroy', () => {
    const panel = document.createElement('div');
    panel.style.cssText = 'overflow:auto;width:400px;height:300px';
    const inner = document.createElement('div');
    inner.style.cssText = 'width:600px;height:400px';
    panel.appendChild(inner);
    document.body.appendChild(panel);

    const removeSpy = vi.spyOn(panel, 'removeEventListener');

    const chart = new LineChart(inner, { animate: false });
    chart.destroy();

    expect(removeSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
    panel.remove();
  });
});

describe('Tooltip backwards compatibility', () => {
  it('direct `new Tooltip(canvas)` still works (no mount target)', () => {
    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
    const tip = new Tooltip(canvas);
    expect(tip.el!.parentElement).toBe(document.body);
    tip.destroy();
    canvas.remove();
  });

  it('direct `new Tooltip(canvas, theme, panel)` mounts in the panel', () => {
    const canvas = document.createElement('canvas');
    const panel = document.createElement('section');
    document.body.appendChild(panel);
    panel.appendChild(canvas);
    const tip = new Tooltip(canvas, null, panel);
    expect(tip.el!.parentElement).toBe(panel);
    tip.destroy();
    panel.remove();
  });
});
