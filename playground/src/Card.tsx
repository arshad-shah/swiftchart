import type { ReactNode } from 'react';

interface Props {
  title: string;
  caption?: string;
  children: ReactNode;
  controls?: ReactNode;
}

export function Card({ title, caption, children, controls }: Props) {
  return (
    <div className="card">
      <h3>{title}</h3>
      {caption ? <p>{caption}</p> : null}
      <div style={{ height: 240 }}>{children}</div>
      {controls ? <div className="row">{controls}</div> : null}
    </div>
  );
}
