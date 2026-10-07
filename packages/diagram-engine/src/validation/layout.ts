import type { ValidationResult } from '@knowledgeassemble/interactive-engine';
import type { Scene, SceneNode } from '../scene/types.js';
import type { LayoutContext } from '../layout/engine.js';
import { LABEL_ALLOWANCE, rectsOverlap } from '../layout/fit.js';

const TOLERANCE = 10;

export function validateLayout(scene: Scene, ctx: LayoutContext): ValidationResult {
  const canvas = { x: 0, y: 0, width: ctx.width, height: ctx.height };
  const issues: ValidationResult['issues'] = [];
  const placed: Array<{
    node: SceneNode;
    box: { x: number; y: number; width: number; height: number };
    /** Ids of this node's ancestors, so a container is not compared with its own subtree. */
    ancestors: ReadonlySet<string>;
  }> = [];

  function walk(node: Scene['nodes'][number], ancestors: ReadonlySet<string>): void {
    if (node.bounds) {
      const b = node.bounds;
      const media = node.metadata?.media as { kind?: string } | undefined;
      // A media node renders its label beneath the box, so the box plus that
      // label has to clear the canvas bottom.
      const labelAllowance = media?.kind === 'figure' ? LABEL_ALLOWANCE : 0;
      if (b.x < canvas.x - TOLERANCE || b.y < canvas.y - TOLERANCE ||
          b.x + b.width > canvas.x + canvas.width + TOLERANCE ||
          b.y + b.height + labelAllowance > canvas.y + canvas.height + TOLERANCE) {
        issues.push({
          level: 'L3',
          code: 'INVALID_STATE',
          message: `node "${node.id}" bounds extend beyond canvas (${b.x},${b.y},${b.width},${b.height})`,
        });
      }
      if (node.interactive) {
        const reachable = b.width >= ctx.minTouchTarget || b.height >= ctx.minTouchTarget;
        if (!reachable) {
          issues.push({
            level: 'L3',
            code: 'ACCESSIBILITY_ERROR',
            message: `interactive node "${node.id}" smaller than minTouchTarget (${b.width}×${b.height} < ${ctx.minTouchTarget})`,
          });
        }
      }
      placed.push({
        node,
        box: { x: b.x + b.width / 2, y: b.y + b.height / 2, width: b.width, height: b.height },
        ancestors,
      });
    }
    const next = new Set(ancestors);
    next.add(node.id);
    for (const child of node.children) {
      walk(child, next);
    }
  }

  for (const node of scene.nodes) {
    walk(node, new Set());
  }

  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) {
      const a = placed[i]!;
      const b = placed[j]!;
      // A container legitimately encloses its own descendants; overlap is only
      // meaningful between two nodes neither of which contains the other.
      if (a.ancestors.has(b.node.id) || b.ancestors.has(a.node.id)) continue;
      if (rectsOverlap(a.box, b.box)) {
        issues.push({
          level: 'L3',
          code: 'INVALID_STATE',
          message: `nodes "${a.node.id}" and "${b.node.id}" overlap (${a.box.width}×${a.box.height} vs ${b.box.width}×${b.box.height})`,
        });
      }
    }
  }

  return { valid: issues.length === 0, issues };
}
