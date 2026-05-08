import { useState } from 'react';
import { Bar } from '@arshad-shah/swift-chart/react';
import type { ChartClickEvent } from '@arshad-shah/swift-chart';

const data = [
  { region: 'North',  revenue: 1240 },
  { region: 'South',  revenue: 980 },
  { region: 'East',   revenue: 1530 },
  { region: 'West',   revenue: 760 },
  { region: 'Centre', revenue: 1140 },
];

interface LastClick {
  label: string;
  value: number;
  source: 'mouse' | 'touch';
  modifiers: string[];
  at: number;
}

/**
 * Live, hands-on demo for the click-events guide.
 *
 * Mouse: click any bar — the badge updates with the label, value, and any
 * modifier keys held during the click. Cmd/Ctrl-click is detected.
 *
 * Touch: tap any bar — the badge updates and reports `source: touch` (the
 * synthetic `MouseEvent` that follows `touchend` on a tap is detected by
 * checking the bound listener's path; see implementation below). Use this
 * to verify tap-to-click on mobile after the fix for #20.
 */
export default function ClickDemo() {
  const [last, setLast] = useState<LastClick | null>(null);

  function handleClick(_index: number, _data: unknown, event: ChartClickEvent) {
    const ne = event.nativeEvent;
    const modifiers: string[] = [];
    if (ne.metaKey) modifiers.push('meta');
    if (ne.ctrlKey) modifiers.push('ctrl');
    if (ne.shiftKey) modifiers.push('shift');
    if (ne.altKey) modifiers.push('alt');

    // The browser fires the synthetic click that follows `touchend` with
    // pointerType either absent or 'mouse'. Falling back to a tap probe:
    // touch-derived clicks usually have detail === 0 because no pointerdown
    // chain occurred. Treat both detail===0 and an absent detail as touch.
    // This is a heuristic for the demo only — your application code does
    // not need to distinguish these.
    const isTouch =
      ('pointerType' in ne && (ne as PointerEvent).pointerType === 'touch') ||
      (typeof ne.detail === 'number' && ne.detail === 0);

    setLast({
      label: event.label,
      value: event.value,
      source: isTouch ? 'touch' : 'mouse',
      modifiers,
      at: Date.now(),
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="chart-frame" style={{ touchAction: 'manipulation' }}>
        <Bar
          data={data}
          mapping={{ x: 'region', y: 'revenue' }}
          onPointClick={handleClick}
          theme="midnight"
          height={260}
        />
      </div>
      <output
        aria-live="polite"
        style={{
          display: 'block',
          padding: '10px 12px',
          borderRadius: 8,
          border: '1px solid var(--sl-color-gray-5, #2a2a2a)',
          background: 'var(--sl-color-gray-6, #16181d)',
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          fontSize: 13,
          lineHeight: 1.5,
        }}
      >
        {last ? (
          <>
            <strong>Last click</strong> — region: <code>{last.label}</code>,
            {' '}revenue: <code>{last.value}</code>,{' '}
            via <code>{last.source}</code>
            {last.modifiers.length > 0 && (
              <> {' '}with <code>{last.modifiers.join('+')}</code></>
            )}
          </>
        ) : (
          <span style={{ opacity: 0.7 }}>
            Click a bar (or tap on a touch device) — the result will appear here.
          </span>
        )}
      </output>
    </div>
  );
}
