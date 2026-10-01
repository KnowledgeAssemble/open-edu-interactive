export interface SvgResult {
  svg: string;
  a11y: Array<{ id: string; role: string; label: string; children: unknown[] }>;
  interactive: Array<{ id: string; action: string }>;
  alternative: EntityRow[];
}

export interface EntityRow {
  entityId: string;
  type: string;
  name: string;
  description?: string;
  location: string;
  sourceClass?: string;
  adjacentTo?: string[];
  measureValue?: number;
  encodingBucket?: string;
  bearing?: number;
  bearingInWindow?: boolean;
}

export interface A11yNode {
  id: string;
  role: string;
  label: string;
  children: A11yNode[];
}