import { escapeXml } from './base.js';

export interface AttrsNode {
  id: string;
  role: string;
  interactive?: boolean;
  label?: string;
  value?: number;
  bounds?: { x: number; y: number; width: number; height: number };
}

export interface NodeAttrsOptions {
  value?: boolean;
  bounds?: boolean;
  mid?: Record<string, string>;
  tail?: Record<string, string>;
}

export function nodeAttrs(node: AttrsNode, opts: NodeAttrsOptions = {}): string {
  let attrs = `id="${escapeXml(node.id)}" data-oedu-role="${escapeXml(node.role)}"`;
  if (opts.value && node.value !== undefined) {
    attrs += ` data-oedu-value="${node.value}"`;
  }
  if (node.interactive) {
    attrs += ` data-oedu-interactive="true"`;
  }
  if (opts.mid) {
    for (const [key, value] of Object.entries(opts.mid)) {
      attrs += ` ${key}="${escapeXml(value)}"`;
    }
  }
  if (node.label) {
    attrs += ` aria-label="${escapeXml(node.label)}"`;
  }
  if (opts.bounds && node.bounds) {
    attrs += ` data-oedu-bounds="${node.bounds.x},${node.bounds.y},${node.bounds.width},${node.bounds.height}"`;
  }
  if (opts.tail) {
    for (const [key, value] of Object.entries(opts.tail)) {
      attrs += ` ${key}="${escapeXml(value)}"`;
    }
  }
  return attrs;
}