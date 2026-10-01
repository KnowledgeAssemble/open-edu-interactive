export interface A11yNode {
  id: string;
  label?: string;
  interactive?: boolean;
  acceptsActions?: string[];
}

export interface A11yRow {
  id: string;
  role: string;
  label: string;
  children: unknown[];
}

export interface InteractiveEntry {
  id: string;
  action: string;
}

export function a11yButton(node: A11yNode): A11yRow {
  return { id: node.id, role: 'button', label: node.label ?? node.id, children: [] };
}

export function pushInteractiveEntries(list: InteractiveEntry[], node: A11yNode): void {
  if (node.interactive && node.acceptsActions) {
    for (const action of node.acceptsActions) {
      list.push({ id: node.id, action });
    }
  }
}