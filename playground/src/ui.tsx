import type { CSSProperties, ReactNode } from 'react';

export function Card({
  title, description, children, height = 320, controls,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  height?: number;
  controls?: ReactNode;
}) {
  return (
    <section style={{
      position: 'relative',
      background: '#11161e',
      border: '1px solid #1d2533',
      borderRadius: 14,
      padding: 16,
      boxShadow: '0 1px 0 #ffffff05 inset, 0 8px 24px #00000040',
    }}>
      <header style={{
        marginBottom: 8, display: 'flex', alignItems: 'flex-start', gap: 12,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{title}</h3>
          {description && (
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#7a8599' }}>{description}</p>
          )}
        </div>
        {controls && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {controls}
          </div>
        )}
      </header>
      <div style={{ height, position: 'relative' }}>{children}</div>
    </section>
  );
}

export function Pill({
  active, onClick, children,
}: { active?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 10px',
        borderRadius: 999,
        border: '1px solid ' + (active ? '#38bdf8' : '#1d2533'),
        background: active ? '#0e2a3a' : '#0d1219',
        color: active ? '#bae6fd' : '#cbd5e1',
        cursor: 'pointer',
        fontSize: 11,
        whiteSpace: 'nowrap',
      }}
    >{children}</button>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  const style: CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94a3b8' };
  return (
    <label style={style}>
      <span>{label}</span>
      {children}
    </label>
  );
}
