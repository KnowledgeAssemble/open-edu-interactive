export type DiagramSemanticRole =
  | 'diagram' | 'node' | 'edge' | 'arrow' | 'label' | 'relationship-label'
  | 'group' | 'selectable';

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SceneNode {
  id: string;
  role: DiagramSemanticRole;
  kind: string;
  bounds?: Bounds;
  label?: string;
  description?: string;
  interactive?: boolean;
  acceptsActions?: string[];
  metadata?: Record<string, unknown>;
  children: SceneNode[];
  positionSource?: string;
  hidden?: boolean;
}

export interface Scene {
  nodes: SceneNode[];
  semantics: Record<string, SceneNode>;
}