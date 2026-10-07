# ADR-14: No third-party layout dependency — keep the three in-repo layout strategies

**Status:** Accepted
**Supersedes:** the conditional permission "ELK only behind `LayoutEngine` if a later slice outgrows radial/hierarchical/grid" in `PLAN-P8.md` §6 (Workstream D, Diagram row) and gap-closure task T37.
**DESIGN.md reference:** §16 D10, §9 media slots, P4 (deterministic output), P6 (accessible by default), STRUCTURE §40 (minimal bundle size, low memory usage)

## Context

Diagram layout shipped centre-to-centre edge geometry, which buried every arrowhead inside its target node. Anchoring edges on node borders fixes that and, on a ring, introduces uneven arrow lengths: the 5-node media cycle at 800x600 renders 112/72/64/72/112, a 1.74 ratio. The natural response to "our layout looks amateurish" is to reach for an industry library rather than keep tuning by hand.

Two libraries were built and measured against the actual failing fixture (`node scripts/measure-layout-libs.mjs`, versions and raw output in `docs/layout-benchmark.md`):

| Candidate | 5-node cycle result | Verdict |
|-----------|--------------------|---------|
| Hand-rolled ring, border-anchored, square slots | fits 800x600, arrows 159/120/102/120/159, ratio 1.55 | shipped |
| Graphviz `circo` | perfect ring, fits at 653x580, arrows 49/156/49/128/128, ratio 3.16 | worse |
| Graphviz `dot` | 282x768, does not fit, ratio 16.64 | worse |
| ELK `layered` | 1180x140, does not fit, ratio 37.0 | worse |
| ELK `radial` | refuses the cycle — not a tree | unusable |

Two structural facts drive the result:

- **ELK's `layered` is genuinely good, and genuinely unusable for this engine's shapes.** It measured clean on the hierarchy DAG (0 overlaps, integer coordinates, fits 800x600), but on a cycle it breaks the cycle with a long return edge — arrows 20…802. `radial` rejects cycles outright. Every diagram fixture this repo ships is either a cycle, a layer DAG, or a grid.
- **No candidate does canvas fitting.** A 12-stage flow came back from ELK at 2140x48. Whatever we adopt, `layout/fit.ts` stays to clamp to the canvas and reserve label space.

Costs that apply regardless: `elkjs` is asynchronous, so it forces `layout()` async across diagram-engine, interactive-engine, dev-harness's sync `tryCreate`, and the Playwright suite. ELK `stress` also returns float-noisy extents (`394.1834104742145`), which is the signature P4 determinism exists to prevent. Payload is pinned per version in `docs/layout-benchmark.md` — `elkjs@0.12.0` at 8.0 MB unpacked — far larger than the ~830 lines of layout code it would replace, against STRUCTURE §40's minimal-bundle-size and low-memory performance principles.

## Options considered

1. **Adopt `elkjs` for `hierarchical`/`flow` only, keep rings hand-rolled.** Rejected: an async layout contract is a public API change rippling into the shared engine package and the test harness, in exchange for a layout we already match on the fixtures we ship — while adding 1.53 MB and keeping our own fitting code.
2. **Adopt Graphviz `circo` for rings.** Rejected: it renders the same ring with a *worse* arrow ratio (3.16 vs 1.55) and requires WASM asset loading.
3. **Keep three in-repo strategies and assert their quality.** Chosen.

## Decision

No third-party layout dependency. `radial`/`hierarchical`/`grid` stay, and their quality becomes CI-enforced rather than reviewer-judged — `test/media-layout.test.ts` asserts no overlap, canvas + label fit, `NODE_GAP` clearance, centring, determinism, and an arrow-ratio ceiling.

The root cause of the original skew is recorded because it is the thing most likely to be re-litigated: on a ring every chord is equal, so arrow length is decided purely by how much chord each box absorbs, and that inset depends on chord direction against the box **aspect**. Ring layouts therefore take square media slots. At a fixed radius of 216 on a 5-node ring, 220x120 yields a 2.12 ratio and 120x120 yields 1.28.

Layout quality is now a number in CI rather than an opinion in review. That, not the library comparison, is the durable part of this decision.

## Consequences

- Media box geometry is canvas-fitted rather than fixed, which supersedes the "fixed 220x120" wording in DESIGN §9, the diagram SPEC, and the diagram SKILL.
- Ring layouts take square slots; grid and hierarchical keep 11:6.
- Registered debt carries a tracker ID (T14) so the sub-700x520 fallback is picked up rather than rediscovered.

## Reopen trigger

Re-open when any of these holds, and not before:

- A slice needs a graph shape that is neither a ring, a layer DAG, nor a grid.
- `media-layout.test.ts` cannot state an invariant the in-repo layouts meet, documented against a real fixture.
- A candidate is measured with a committed harness against the current failing fixture, and beats the shipped ring on the arrow-ratio ceiling **and** fits the canvas without extra fitting code.

`elkjs` remains the only serious candidate, and the honest weak point of this decision is that `layered` is the best JS layered layout available. It was rejected for cycles, which is the shape this engine actually ships. A future layer-only slice changes that calculation and should re-run the measurement rather than assume the outcome.