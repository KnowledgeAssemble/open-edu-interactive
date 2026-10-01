# Use-case catalog

**Status:** Active (P8 Workstream A)  
**Audience:** Product, authors, AI agents, engine implementers

## Purpose

Specifications and fixtures are derived from **learner scenarios**, not from prop matrices. A use case names what the learner does, what the host owns, and what “done” looks like before anyone writes `interactive: true` on every tick.

This catalog sits between DESIGN.md (principles) and engine SPEC.md (contract). When they conflict on UX, **fix the use case and spec** — do not patch render in the playground.

## Reading order

1. `docs/DESIGN.md` — principles (P1–P12, D7 scoring boundary)
2. **`docs/use-cases/<engine>.md`** — canonical scenarios for that engine
3. `docs/engines/<engine>/SPEC.md` — normative contract (updated when use cases require it)
4. `packages/<engine>/fixture/<name>/` — golden fixtures named after use cases

## Use-case template

Each entry in an engine catalog follows this shape:

| Field | Meaning |
|-------|---------|
| **ID** | Stable slug (`nl-locate-guided`) |
| **Learner** | Grade band + scenario in one sentence |
| **Prompt** | Host copy (localizable; not in engine spec) |
| **Action** | What the learner does with pointer/keyboard |
| **Acceptance** | Visual + events + a11y — testable without OpenEdu |
| **Spec** | Minimal `content` / props; interaction mode for that kind |
| **Fixture** | `packages/<engine>/fixture/<fixture-name>/` |
| **Host** | Answer key, feedback, hints (D7 — never in engine) |
| **Status** | `done` \| `ux-debt` \| `planned` \| `widget-preferred` |

## Interaction modes (per kind, not global)

Do not assume one `interactive` boolean means the same thing everywhere.

| Mode | Meaning | Example kinds |
|------|---------|---------------|
| **guided-select** | Only authored targets are selectable; emphasis marks the target | number-line (locate), clock (pick hand) |
| **discovery-select** | Choose among labeled candidates; emphasis is styling only | counting-set, fraction parts |
| **construct-place** | Learner places a value on the canvas | number-line (place 7) — often widget-preferred |
| **explore** | No single correct answer; selection is exploratory | illustration hotspots |
| **display** | Read-only visual; host may ask without engine select | coordinate-grid (show point only) |

New props or contract changes are allowed only when **two or more** catalogued use cases need them, or one use case is explicitly promoted to a slice exit gate.

## Adding a use case

1. Add the entry to the engine catalog (`visual.md`, `geomap.md`, `chart.md`, `diagram.md`, `timeline.md`, etc.).
2. Add or update a fixture named after the scenario (not `*-practice` with every flag set).
3. Implement until acceptance criteria pass (unit + browser + a11y golden).
4. Update engine SPEC.md if the contract changes.
5. Record slice status in `docs/PLAN-P8.md` Workstream A if applicable.

## Implementation

**Agent plan (deepseek-4-flash):** `docs/_archive/implementation-plans/2026-09-10-visual-use-cases-implementation-plan.md`

Phased tasks U0–U4 map catalog use-case IDs to code, fixtures, and tests. Start with `ux-debt` rows in `visual.md` before `planned` rows.

## Engine catalogs

| Engine | Catalog |
|--------|---------|
| Visual | `docs/use-cases/visual.md` |
| GeoMap | `docs/use-cases/geomap.md` |
| Chart | `docs/use-cases/chart.md` |
| Diagram | `docs/use-cases/diagram.md` |
| Timeline | `docs/use-cases/timeline.md` |

## Supersedes

The practice-mode matrix in `docs/_archive/retired-specs/2026-09-09-visual-engine-practice-mode-spec.md` remains useful for **event ids and discovery/guided mechanics**, but **UX and per-kind interaction rules** are owned by `docs/use-cases/visual.md` going forward.
