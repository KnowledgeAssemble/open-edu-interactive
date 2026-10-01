export interface SvgResult {
  svg: string;
  a11y: Array<{ id: string; role: string; label: string; children: unknown[] }>;
  interactive: Array<{ id: string; action: string }>;
  alternative: RelRow[];
}

export interface RelRow {
  kind: 'node' | 'edge' | 'cycle';
  id: string;
  label?: string;
  description?: string;
  from?: string;
  relationship?: string;
  to?: string;
  fromLabel?: string;
  toLabel?: string;
  members?: string[];
  nodeId?: string;
  strength?: number;
}

export interface A11yNode {
  id: string;
  role: string;
  label: string;
  children: A11yNode[];
}