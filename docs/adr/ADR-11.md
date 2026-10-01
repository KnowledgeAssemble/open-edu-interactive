# ADR-11: Engine instance lifecycle — document divergence, do not refactor now

**Status:** Accepted  
**DESIGN.md reference:** §6 D2 (package isolation), §4 (thin core)

## Context

`createPlatformInstance` (`packages/interactive-engine/src/runtime/instance.ts`) is documented in `docs/SYSTEM-ARCHITECTURE.md` §3 as "the canonical implementation." In the current code, **none of the five engines use it**; each engine implements its own instance lifecycle (own `EventLog`, listeners, dispatch/emit/teardown/announce), differing only in per-engine hook points (namespaced result events such as `visual.event-1947-selected`, announce copy, snapshot shape). `createPlatformInstance` is exercised only by core unit tests. This was surfaced by the 2026-09-13 architecture review as the largest duplicated-infrastructure item in the codebase.

## Options considered

1. **Refactor all five engines onto `createPlatformInstance` (or a new `createEngineInstance(config)` with per-engine hooks).** Removes ~200 lines × 5 of boilerplate and centralizes lifecycle semantics.
2. **Document the divergence as a deliberate decision and leave the code as-is.** Low risk, zero churn; engines stay independently evolvable (Workstream D will add per-engine lifecycle behavior).

## Decision

Option 2. The divergence is documented in `docs/SYSTEM-ARCHITECTURE.md` §3 with a review note. No refactor in the next phase.

Reasoning: the engines genuinely need different lifecycle hook points, no active bug is being caused by the duplication, the engine set is about to grow behavioral surface (Workstream D), and "do not refactor the entire repository unnecessarily" is a review constraint. The duplication is tracked as P3 debt.

## Consequences

+ Zero churn risk; Workstream D can evolve per-engine lifecycle freely.
+ SYSTEM-ARCHITECTURE §3 no longer overstates `createPlatformInstance` as the de facto path.
- ~1000 lines of near-identical Lifecycle boilerplate remain; a future `createEngineInstance(config)` consolidation is a candidate once engines stabilize and a concrete shared hook-point set is proven by two engines needing identical semantics.

**Revisit trigger:** a second engine requiring the same lifecycle hook the first added — that is the evidence that the hook belongs in a shared factory.
**2026-09-30 confirmation (W-5b/T33):** publish verification (`pnpm publish:dry` + `pnpm publish:smoke`) passes for all eight published packages; no five-way lifecycle bugfix pain surfaced across W-1…W-5, so this ADR is **confirmed**, not re-recorded. The revisit trigger (a second engine requiring the same lifecycle hook) has not fired.
