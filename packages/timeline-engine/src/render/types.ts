export interface TimeRow {
  kind: 'period' | 'event' | 'span';
  id: string;
  label: string;
  from?: string;
  to?: string;
  date?: string;
  day?: number;
  trackId?: string;
  trackLabel?: string;
  description?: string;
}

export interface SvgResult {
  svg: string;
  a11y: Array<{ id: string; role: string; label: string; children: unknown[] }>;
  interactive: Array<{ id: string; action: string }>;
  linear: TimeRow[];
}

export interface A11yNode {
  id: string;
  role: string;
  label: string;
  children: A11yNode[];
}