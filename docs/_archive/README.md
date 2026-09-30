# Docs archive

Completed work and superseded documents live here so the live `docs/` tree only carries normative, load-bearing content. Category subfolders keep document types distinct: **implementation plans**, **retired specs/designs**, **review mandates**.

**Rule:** archive after the work ships and the knowledge is captured in a normative doc (engine SPEC, use-case catalog, ADR, published package). Every entry below maps an archived doc to its successor.

## implementation-plans/ — agent-facing, single-deliverable plans whose work shipped

| Archived doc | Work delivered | Successor / follow-on |
|--------------|----------------|------------------------|
| `2026-09-09-p8-workstream-a-plan.md` | Workstream A1/A2 (diagram edges + visual D9 layout strategies) landed in `main` | `docs/_archive/review-mandates/Agent-Prompt-Spec.md` status snapshot; `docs/PLAN-P8.md` §3 |
| `2026-09-09-visual-practice-mode-implementation-plan.md` | Visual select-only practice mode shipped | `docs/use-cases/visual.md` (interaction modes by kind) |
| `2026-09-10-interactive-react-learner-surface-implementation-plan.md` | SVG click-through in `interactive-react` + dev-harness DRY refactor | `docs/DEVELOPER-GUIDE.md`, `docs/p7-acceptance.md` |
| `2026-09-10-visual-use-cases-implementation-plan.md` | U0–U4 fixture work; catalog rows flipped `done` | `docs/use-cases/visual.md` |
| `2026-09-12-engine-skills-consumable-implementation-plan.md` | `@knowledgeassemble/engine-skills` package + freshness guard | `AGENTS.md` "Engine skills package" section |

## retired-specs/ — proposals codified into normative docs

| Archived doc | Superseded by |
|--------------|---------------|
| `2026-09-09-visual-engine-practice-mode-spec.md` | `docs/use-cases/visual.md` (event ids + discovery/guided mechanics remain useful there) |
| `2026-09-12-engine-skills-consumable-design.md` | Implemented in `packages/engine-skills/`; contract in `AGENTS.md` + `docs/schemas/` |

## review-mandates/ — one-time inputs, not design docs

| Archived doc | Durable deliverables |
|--------------|----------------------|
| `Agent-Prompt-Spec.md` | ADRs 10–12; `docs/_archive/implementation-plans/2026-09-13-interactive-engine-next-phase-implementation-plan.md` (kept live — see living specs below) |

## Not archived (live)

- `docs/superpowers/specs/2026-09-13-interactive-engine-next-phase-implementation-plan.md` — N2–N6 open
- `docs/superpowers/specs/2026-09-30-use-case-gap-closure-plan.md` — current gap-closure plan

Archived doc contents are historical and may be stale; the successor column is authoritative.