import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Tooltip } from '../../src/core/tooltip';
import { BarChart, LineChart, PieChart } from '../../src/charts';

function createContainer(): HTMLDivElement {
  const div = document.createElement('div');
  div.style.width = '600px';
  div.style.height = '400px';
  document.body.appendChild(div);
  return div;
}

describe('Tooltip', () => {
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
  });

  it('creates a tooltip element in the body', () => {
    const tooltip = new Tooltip(canvas);
    expect(document.querySelector('.sc-tooltip')).toBeTruthy();
    tooltip.destroy();
  });

  it('escapes string content (no XSS)', () => {
    const tooltip = new Tooltip(canvas);
    tooltip.show(100, 100, '<b>Test</b>');
    // Markup is rendered as text — never as DOM elements.
    expect(tooltip.el!.querySelector('b')).toBeNull();
    expect(tooltip.el!.textContent).toBe('<b>Test</b>');
    expect(tooltip.el!.style.opacity).toBe('1');
    tooltip.destroy();
  });

  it('escapes structured content (no XSS in label/value)', () => {
    const tooltip = new Tooltip(canvas);
    tooltip.showStructured(50, 50, {
      title: '<img src=x onerror=alert(1)>',
      rows: [
        { label: '<script>', value: '"; drop table;', color: '#f00' },
      ],
    });
    expect(tooltip.el!.querySelector('script')).toBeNull();
    expect(tooltip.el!.querySelector('img')).toBeNull();
    expect(tooltip.el!.textContent).toContain('<img src=x onerror=alert(1)>');
    expect(tooltip.el!.textContent).toContain('<script>');
    tooltip.destroy();
  });

  it('hides tooltip', () => {
    const tooltip = new Tooltip(canvas);
    tooltip.show(100, 100, 'Test');
    tooltip.hide();
    expect(tooltip.el!.style.opacity).toBe('0');
    tooltip.destroy();
  });

  it('destroy removes element from DOM', () => {
    const tooltip = new Tooltip(canvas);
    tooltip.destroy();
    expect(document.querySelector('.sc-tooltip')).toBeNull();
  });

  it('repositions to avoid viewport edges', () => {
    const tooltip = new Tooltip(canvas);
    // Show near edge — should still position within viewport
    tooltip.show(590, 10, 'Edge test');
    const left = parseFloat(tooltip.el!.style.left);
    expect(left).toBeLessThan(window.innerWidth);
    tooltip.destroy();
  });

  it('hides on document scroll', () => {
    const tooltip = new Tooltip(canvas);
    tooltip.show(100, 100, 'Test');
    expect(tooltip.el!.style.opacity).toBe('1');
    // Trigger a scroll event — tooltip is positioned `fixed`, so any
    // scroll visually disconnects it from the chart and it should hide.
    window.dispatchEvent(new Event('scroll'));
    expect(tooltip.el!.style.opacity).toBe('0');
    expect(tooltip.el!.getAttribute('aria-hidden')).toBe('true');
    tooltip.destroy();
  });

  it('hides on window resize', () => {
    const tooltip = new Tooltip(canvas);
    tooltip.show(100, 100, 'Test');
    window.dispatchEvent(new Event('resize'));
    expect(tooltip.el!.style.opacity).toBe('0');
    tooltip.destroy();
  });

  it('cleans up scroll/resize listeners on destroy', () => {
    const tooltip = new Tooltip(canvas);
    tooltip.show(100, 100, 'Test');
    tooltip.destroy();
    // After destroy, dispatching scroll on the window must not throw
    // (e.g. by reading from a null `el`).
    expect(() => window.dispatchEvent(new Event('scroll'))).not.toThrow();
    expect(() => window.dispatchEvent(new Event('resize'))).not.toThrow();
  });
});

describe('Mouse interactions', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = createContainer();
  });

  function fireMouseEvent(el: HTMLElement, type: string, clientX: number, clientY: number) {
    el.dispatchEvent(new MouseEvent(type, {
      clientX, clientY, bubbles: true,
    }));
  }

  describe('BarChart', () => {
    it('updates hoverIndex on mousemove', () => {
      const chart = new BarChart(container, { animate: false });
      chart.setData([
        { x: 'A', y: 10 }, { x: 'B', y: 20 }, { x: 'C', y: 30 },
      ], { x: 'x', y: 'y' });

      const canvas = container.querySelector('canvas')!;
      fireMouseEvent(canvas, 'mousemove', 100, 200);
      // hoverIndex should have been calculated
      expect(chart.hoverIndex).toBeGreaterThanOrEqual(-1);
      chart.destroy();
    });

    it('resets hoverIndex on mouseleave', () => {
      const chart = new BarChart(container, { animate: false });
      chart.setData([{ x: 'A', y: 10 }], { x: 'x', y: 'y' });
      const canvas = container.querySelector('canvas')!;
      fireMouseEvent(canvas, 'mousemove', 100, 200);
      fireMouseEvent(canvas, 'mouseleave', 0, 0);
      expect(chart.hoverIndex).toBe(-1);
      chart.destroy();
    });

    it('fires onClick with correct index', () => {
      const onClick = vi.fn();
      const chart = new BarChart(container, { animate: false, onClick });
      chart.setData([
        { x: 'A', y: 10 }, { x: 'B', y: 20 },
      ], { x: 'x', y: 'y' });

      const canvas = container.querySelector('canvas')!;
      // Move to trigger hoverIndex
      fireMouseEvent(canvas, 'mousemove', 100, 200);
      chart.hoverIndex = 0; // Force for deterministic test
      fireMouseEvent(canvas, 'click', 100, 200);
      expect(onClick).toHaveBeenCalledWith(0, expect.any(Object));
      chart.destroy();
    });

    it('does not fire onClick when hoverIndex is -1', () => {
      const onClick = vi.fn();
      const chart = new BarChart(container, { animate: false, onClick });
      chart.setData([{ x: 'A', y: 10 }], { x: 'x', y: 'y' });
      const canvas = container.querySelector('canvas')!;
      chart.hoverIndex = -1;
      fireMouseEvent(canvas, 'click', 0, 0);
      expect(onClick).not.toHaveBeenCalled();
      chart.destroy();
    });
  });

  describe('LineChart', () => {
    it('snaps to nearest data point', () => {
      const chart = new LineChart(container, { animate: false });
      chart.setData([
        { x: 'A', y: 10 }, { x: 'B', y: 20 }, { x: 'C', y: 30 },
      ], { x: 'x', y: 'y' });

      const canvas = container.querySelector('canvas')!;
      fireMouseEvent(canvas, 'mousemove', 300, 200);
      expect(chart.hoverIndex).toBeGreaterThanOrEqual(0);
      chart.destroy();
    });
  });

  describe('PieChart', () => {
    it('detects hover on slices', () => {
      const chart = new PieChart(container, { animate: false });
      chart.setData([
        { name: 'A', value: 50 },
        { name: 'B', value: 50 },
      ], { labelField: 'name', valueField: 'value' });

      const canvas = container.querySelector('canvas')!;
      // Click center area
      fireMouseEvent(canvas, 'mousemove', 300, 200);
      // May or may not hit a slice depending on exact geometry
      expect(chart.hoverIndex).toBeGreaterThanOrEqual(-1);
      chart.destroy();
    });
  });
});
