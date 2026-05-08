/**
 * Regression: issue #22 — accessibility umbrella.
 *
 * Covers:
 *  - role/tabIndex differs between non-interactive and interactive charts
 *  - aria-describedby points to a hidden element (replaces non-standard
 *    aria-description attribute)
 *  - prefers-reduced-motion disables animation when `animate` is unset
 *  - setData announces a polite update to a hidden live region
 *  - Enter / Space fire onClick on the focused datum
 *  - ArrowLeft / ArrowRight walk hoverIndex
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LineChart, BarChart } from '../../src/charts';

function host(): HTMLDivElement {
  const d = document.createElement('div');
  d.style.cssText = 'width:600px;height:400px';
  document.body.appendChild(d);
  return d;
}

function fireKey(el: Element, key: string) {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

describe('A11y: role / tabIndex / focusability', () => {
  it('non-interactive chart keeps role=img, no tabIndex on canvas', () => {
    const chart = new LineChart(host(), { ariaLabel: 'Sales' });
    expect(chart.canvas.getAttribute('role')).toBe('img');
    expect(chart.canvas.tabIndex).toBe(-1); // default for canvas — never made focusable
    expect(chart.canvas.hasAttribute('aria-roledescription')).toBe(false);
    chart.destroy();
  });

  it('interactive chart drops role=img (it would lie) and is keyboard-focusable', () => {
    const chart = new BarChart(host(), {
      onClick: () => {},
      ariaLabel: 'Revenue by region',
    });
    expect(chart.canvas.getAttribute('role')).toBeNull();
    expect(chart.canvas.getAttribute('aria-roledescription')).toBe('interactive chart');
    expect(chart.canvas.tabIndex).toBe(0);
    chart.destroy();
  });
});

describe('A11y: aria-describedby (replaces non-standard aria-description)', () => {
  it('renders a hidden description element and links it via aria-describedby', () => {
    const div = host();
    const chart = new LineChart(div, {
      ariaLabel: 'Chart',
      ariaDescription: 'Monthly sales for the last twelve months.',
    });
    // The non-standard `aria-description` attribute is no longer set.
    expect(chart.canvas.hasAttribute('aria-description')).toBe(false);
    const id = chart.canvas.getAttribute('aria-describedby');
    expect(id).toBeTruthy();
    const desc = div.querySelector<HTMLElement>(`#${id}`)!;
    expect(desc).toBeTruthy();
    expect(desc.textContent).toBe('Monthly sales for the last twelve months.');
    chart.destroy();
  });

  it('update({ ariaDescription }) updates the hidden element in place', () => {
    const div = host();
    const chart = new LineChart(div, { ariaDescription: 'first' });
    const id = chart.canvas.getAttribute('aria-describedby')!;
    const desc = div.querySelector<HTMLElement>(`#${id}`)!;
    expect(desc.textContent).toBe('first');

    chart.update({ ariaDescription: 'second' });
    expect(desc.textContent).toBe('second');
    chart.destroy();
  });

  it('update({ ariaDescription: "" }) clears the description and removes aria-describedby', () => {
    const div = host();
    const chart = new LineChart(div, { ariaDescription: 'first' });
    expect(chart.canvas.getAttribute('aria-describedby')).toBeTruthy();
    chart.update({ ariaDescription: '' });
    expect(chart.canvas.hasAttribute('aria-describedby')).toBe(false);
    expect(div.querySelectorAll('[id^="sc-desc-"]').length).toBe(0);
    chart.destroy();
  });

  it('aria-describedby ids are unique across instances', () => {
    const a = new LineChart(host(), { ariaDescription: 'a' });
    const b = new LineChart(host(), { ariaDescription: 'b' });
    expect(a.canvas.getAttribute('aria-describedby'))
      .not.toBe(b.canvas.getAttribute('aria-describedby'));
    a.destroy(); b.destroy();
  });
});

describe('A11y: prefers-reduced-motion', () => {
  let originalMM: typeof globalThis.matchMedia | undefined;
  beforeEach(() => {
    originalMM = globalThis.matchMedia;
  });

  it('disables animation when matchMedia matches and animate is unset', () => {
    const matcher = vi.fn().mockReturnValue({ matches: true, media: '(prefers-reduced-motion: reduce)' });
    (globalThis as any).matchMedia = matcher as any;
    const chart = new LineChart(host(), { ariaLabel: 'No motion' });
    expect(chart.config.animate).toBe(false);
    expect(matcher).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
    chart.destroy();
    (globalThis as any).matchMedia = originalMM;
  });

  it('respects an explicit animate:true even when reduce-motion is on', () => {
    (globalThis as any).matchMedia = vi.fn().mockReturnValue({ matches: true });
    const chart = new LineChart(host(), { animate: true });
    expect(chart.config.animate).toBe(true);
    chart.destroy();
    (globalThis as any).matchMedia = originalMM;
  });

  it('respects an explicit animate:false regardless', () => {
    (globalThis as any).matchMedia = vi.fn().mockReturnValue({ matches: false });
    const chart = new LineChart(host(), { animate: false });
    expect(chart.config.animate).toBe(false);
    chart.destroy();
    (globalThis as any).matchMedia = originalMM;
  });

  it('leaves animate:true (default) when matchMedia is undefined', () => {
    delete (globalThis as any).matchMedia;
    const chart = new LineChart(host());
    expect(chart.config.animate).toBe(true);
    chart.destroy();
    (globalThis as any).matchMedia = originalMM;
  });
});

describe('A11y: live region announces data updates', () => {
  it('mounts a hidden polite live region in the container', () => {
    const div = host();
    const chart = new LineChart(div);
    const live = div.querySelector('[role="status"][aria-live="polite"]')!;
    expect(live).toBeTruthy();
    chart.destroy();
  });

  it('announces a data summary on setData()', () => {
    const div = host();
    const chart = new LineChart(div, { animate: false });
    chart.setData(
      [{ x: 'a', y: 1 }, { x: 'b', y: 2 }, { x: 'c', y: 3 }],
      { x: 'x', y: 'y' },
    );
    const live = div.querySelector('[role="status"]')!;
    expect(live.textContent).toMatch(/3 points/);
    chart.destroy();
  });

  it('announces an empty state when called with []', () => {
    const div = host();
    const chart = new LineChart(div, { animate: false });
    chart.setData([], { x: 'x', y: 'y' });
    const live = div.querySelector('[role="status"]')!;
    expect(live.textContent).toMatch(/cleared|0 points/i);
    chart.destroy();
  });

  it('destroy removes the live region from the container', () => {
    const div = host();
    const chart = new LineChart(div);
    expect(div.querySelector('[role="status"]')).toBeTruthy();
    chart.destroy();
    expect(div.querySelector('[role="status"]')).toBeNull();
  });
});

describe('A11y: keyboard activation on interactive charts', () => {
  it('Enter on the focused canvas fires onClick at the current hover index', () => {
    const onClick = vi.fn();
    const chart = new BarChart(host(), { animate: false, onClick });
    chart.setData([{ x: 'a', y: 1 }, { x: 'b', y: 2 }], { x: 'x', y: 'y' });
    chart.hoverIndex = 1;
    fireKey(chart.canvas, 'Enter');
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick.mock.calls[0][0]).toBe(1);
    chart.destroy();
  });

  it('Space on the focused canvas also fires onClick (default to index 0 if no hover)', () => {
    const onClick = vi.fn();
    const chart = new BarChart(host(), { animate: false, onClick });
    chart.setData([{ x: 'a', y: 1 }, { x: 'b', y: 2 }], { x: 'x', y: 'y' });
    fireKey(chart.canvas, ' ');
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick.mock.calls[0][0]).toBe(0);
    chart.destroy();
  });

  it('ArrowRight / ArrowLeft walk hoverIndex along the labels', () => {
    const chart = new BarChart(host(), { animate: false, onClick: () => {} });
    chart.setData(
      [{ x: 'a', y: 1 }, { x: 'b', y: 2 }, { x: 'c', y: 3 }],
      { x: 'x', y: 'y' },
    );
    fireKey(chart.canvas, 'ArrowRight');
    expect(chart.hoverIndex).toBe(0);
    fireKey(chart.canvas, 'ArrowRight');
    expect(chart.hoverIndex).toBe(1);
    fireKey(chart.canvas, 'ArrowRight');
    expect(chart.hoverIndex).toBe(2);
    fireKey(chart.canvas, 'ArrowRight'); // clamps at end
    expect(chart.hoverIndex).toBe(2);
    fireKey(chart.canvas, 'ArrowLeft');
    expect(chart.hoverIndex).toBe(1);
    chart.destroy();
  });

  it('keyboard handler is NOT attached on non-interactive charts', () => {
    const chart = new LineChart(host(), { animate: false });
    chart.setData([{ x: 'a', y: 1 }, { x: 'b', y: 2 }], { x: 'x', y: 'y' });
    fireKey(chart.canvas, 'ArrowRight');
    expect(chart.hoverIndex).toBe(-1); // unchanged — handler never wired
    chart.destroy();
  });

  it('ArrowDown / ArrowUp walk hoverSeriesIndex across multi-series charts', () => {
    const chart = new LineChart(host(), { animate: false, onClick: () => {} });
    chart.setData(
      [{ x: 'a', r: 1, c: 4 }, { x: 'b', r: 2, c: 5 }, { x: 'c', r: 3, c: 6 }],
      { x: 'x', y: ['r', 'c'] }, // two series
    );
    expect(chart.resolved.datasets.length).toBe(2);
    expect(chart.hoverSeriesIndex).toBe(-1); // column-wide initially

    fireKey(chart.canvas, 'ArrowDown'); // -1 → 0
    expect(chart.hoverSeriesIndex).toBe(0);
    fireKey(chart.canvas, 'ArrowDown'); // 0 → 1
    expect(chart.hoverSeriesIndex).toBe(1);
    fireKey(chart.canvas, 'ArrowDown'); // clamps at last
    expect(chart.hoverSeriesIndex).toBe(1);
    fireKey(chart.canvas, 'ArrowUp');   // 1 → 0
    expect(chart.hoverSeriesIndex).toBe(0);
    chart.destroy();
  });

  it('ArrowUp from column-wide state jumps to the last series', () => {
    const chart = new LineChart(host(), { animate: false, onClick: () => {} });
    chart.setData(
      [{ x: 'a', r: 1, c: 4, p: 7 }, { x: 'b', r: 2, c: 5, p: 8 }],
      { x: 'x', y: ['r', 'c', 'p'] }, // three series
    );
    expect(chart.hoverSeriesIndex).toBe(-1);
    fireKey(chart.canvas, 'ArrowUp'); // -1 → last (2)
    expect(chart.hoverSeriesIndex).toBe(2);
    chart.destroy();
  });

  it('ArrowUp / ArrowDown are no-op on single-series charts', () => {
    const chart = new BarChart(host(), { animate: false, onClick: () => {} });
    chart.setData([{ x: 'a', y: 1 }, { x: 'b', y: 2 }], { x: 'x', y: 'y' });
    expect(chart.resolved.datasets.length).toBe(1);
    chart.hoverSeriesIndex = -1;
    fireKey(chart.canvas, 'ArrowDown');
    expect(chart.hoverSeriesIndex).toBe(-1);
    fireKey(chart.canvas, 'ArrowUp');
    expect(chart.hoverSeriesIndex).toBe(-1);
    chart.destroy();
  });
});
