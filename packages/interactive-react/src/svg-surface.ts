import type { EngineAction } from '@knowledgeassemble/interactive-engine';

export const INTERACTIVE_POINTER_STYLE_ID = 'oedu-interactive-pointer-style';

export interface SvgSurfaceSnapshot {
  svgResult?: { svg?: string };
  selection?: string[];
  focus?: string | null;
}

const POINTER_STYLE_CSS = `
[data-oedu-interactive="true"] { cursor: pointer; }
[data-oedu-selected="true"] { stroke: #1d4ed8 !important; stroke-width: 4 !important; }
[data-oedu-selected="true"] text { fill: #1d4ed8 !important; font-weight: 700; }
[data-oedu-selected="true"] > rect[data-oedu-hit-target="true"] { fill: rgba(29, 78, 216, 0.12) !important; stroke: #1d4ed8 !important; stroke-width: 2 !important; }
[data-oedu-focused="true"], [data-oedu-interactive="true"]:focus-visible { outline: 2px solid #1d4ed8; outline-offset: 2px; }
`.trim();

export function ensureInteractivePointerStyle(root: HTMLElement): void {
  if (root.querySelector(`#${INTERACTIVE_POINTER_STYLE_ID}`)) return;
  const style = document.createElement('style');
  style.id = INTERACTIVE_POINTER_STYLE_ID;
  style.textContent = POINTER_STYLE_CSS;
  root.appendChild(style);
}

let pendingKeyboardFocus = false;

export function applySelectionState(
  container: HTMLElement,
  selection: string[],
  focus: string | null,
): void {
  for (const el of container.querySelectorAll('[data-oedu-selected]')) {
    el.removeAttribute('data-oedu-selected');
    el.removeAttribute('aria-pressed');
  }
  for (const el of container.querySelectorAll('[data-oedu-focused]')) {
    el.removeAttribute('data-oedu-focused');
  }
  for (const id of selection) {
    const el = container.querySelector(`#${id}`);
    if (el) {
      el.setAttribute('data-oedu-selected', 'true');
      el.setAttribute('aria-pressed', 'true');
    }
  }
  if (focus) {
    const el = container.querySelector(`#${focus}`);
    if (el) {
      el.setAttribute('data-oedu-focused', 'true');
    }
  }
}

export function renderSvgInto(container: HTMLElement, svg: string): void {
  container.innerHTML = svg ?? '';
}

export function applyInteractiveFocusability(container: HTMLElement): void {
  for (const el of container.querySelectorAll('[data-oedu-interactive="true"]')) {
    el.setAttribute('tabindex', '0');
  }
}

function focusedInteractiveId(container: HTMLElement): string | null {
  if (!pendingKeyboardFocus) return null;
  const active = document.activeElement;
  if (!(active instanceof Element) || !container.contains(active)) return null;
  return active.closest('[data-oedu-interactive="true"]')?.id ?? null;
}

function restoreInteractiveFocus(container: HTMLElement, id: string | null): void {
  if (!id) return;
  const el = container.querySelector(`#${id}`) as (Element & { focus?: () => void }) | null;
  el?.focus?.();
}

export function bindSvgInteraction(
  root: HTMLElement,
  dispatch: (action: EngineAction) => void,
): () => void {
  ensureInteractivePointerStyle(root);

  function translate(id: string, selected: boolean): void {
    dispatch(selected ? { type: 'deselect', target: { id } } : { type: 'select', target: { id } });
  }

  function onClick(event: MouseEvent): void {
    const el = (event.target as Element | null)?.closest('[data-oedu-interactive="true"]');
    const id = el?.id;
    if (!id) return;
    event.preventDefault();
    pendingKeyboardFocus = false;
    translate(id, el.hasAttribute('data-oedu-selected'));
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    if (event.repeat) return;
    const el = (event.target as Element | null)?.closest('[data-oedu-interactive="true"]');
    const id = el?.id;
    if (!id) return;
    event.preventDefault();
    pendingKeyboardFocus = true;
    translate(id, el.hasAttribute('data-oedu-selected'));
  }

  root.addEventListener('click', onClick);
  root.addEventListener('keydown', onKeyDown);
  return () => {
    root.removeEventListener('click', onClick);
    root.removeEventListener('keydown', onKeyDown);
  };
}

export function syncSvgSurface(container: HTMLElement, snapshot: SvgSurfaceSnapshot): void {
  const focusedId = focusedInteractiveId(container);
  pendingKeyboardFocus = false;
  renderSvgInto(container, snapshot.svgResult?.svg ?? '');
  applySelectionState(container, snapshot.selection ?? [], snapshot.focus ?? null);
  applyInteractiveFocusability(container);
  restoreInteractiveFocus(container, focusedId);
}
