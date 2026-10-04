# Layout library benchmark

Evidence for [ADR-14](adr/ADR-14.md) and `docs/PLAN-P8.md` §8a. The candidates are
**not** repo dependencies — installing them would contradict the decision this
records. `scripts/measure-layout-libs.mjs` resolves them from a scratch directory
outside the repo, so it is deliberately not part of the exit gate.

```bash
node scripts/measure-layout-libs.mjs            # in-repo ring + third-party candidates
node scripts/measure-layout-libs.mjs --in-repo  # in-repo ring only, nothing installed
```

The `--in-repo` half is the part CI asserts (`packages/diagram-engine/test/media-layout.test.ts`).

## Pinned versions

| Package | Version | Unpacked |
|---------|---------|----------|
| `@hpcc-js/wasm` | 2.35.3 | 37.2 MB |
| `elkjs` | 0.12.0 | 8.0 MB |

Compare against the ~830 lines of in-repo layout code they would replace.

## Subject

The failing fixture: a 5-node media cycle (`a→b→c→d→e→a`) with 220x120 media boxes.
Canvas 800x600. "Ratio" is longest arrow ÷ shortest visible arrow — lower is more even.

## In-repo ring

Fixed radius 216, 800x600, 5-node ring — vary **only** the slot aspect:

| Slot | Arrows | Ratio |
|------|--------|-------|
| 220x120 | 172, 81, 134, 81, 172 | 2.12 |
| 170x170 | 153, 106, 84, 106, 153 | 1.82 |
| 152x152 | 158, 119, 102, 119, 158 | 1.55 |
| 120x120 | 172, 145, 134, 145, 172 | 1.28 |

Fixed 220x120 slot — vary **only** the radius:

| Radius | Arrows | Ratio |
|--------|--------|-------|
| 156 | 112, 72, 64, 72, 112 | 1.74 |
| 180 | 134, 67, 92, 67, 134 | 1.99 |
| 216 | 172, 81, 134, 81, 172 | 2.12 |
| 250 | 209, 108, 174, 108, 209 | 1.93 |
| 300 | 265, 159, 232, 159, 265 | 1.66 |

Two conclusions, and the second is the one that is easy to get wrong:

1. On a ring every chord is equal, so arrow length is decided purely by how much
   chord each box absorbs. Equalising the two insets (square slots) evens the ring.
2. The ratio is **not** invariant to box size. It is non-monotonic in radius, so
   "just make the boxes smaller" and "just make the ring bigger" both fail. An
   earlier draft of §8a claimed size-invariance from a comparison that varied box
   size and radius together; that claim was wrong and has been removed.

## Third-party candidates

`@hpcc-js/wasm` 2.35.3 (Graphviz), 5-node cycle:

| Engine | Extent | Fits 800x600 | Ring spread | Ratio |
|--------|--------|--------------|-------------|-------|
| `circo` | 653x580 | yes | 0.0 | **3.16** |
| `dot` | 282x768 | no | 300.9 | 16.64 |
| `twopi` | 211x499 | yes | 192.0 | 1055.33 |
| `neato` | 379x282 | yes | 0.2 | 8.79 |
| `fdp` | 524x370 | yes | 55.0 | 159.14 |

`elkjs` 0.12.0, 5-node cycle, `elk.spacing.nodeNode: 20`:

| Algorithm | Extent | Fits 800x600 | Ratio |
|-----------|--------|--------------|-------|
| `radial` | — | — | rejects the graph: `java.lang.IllegalArgumentException: The given graph is not a tree!` |
| `layered` | 1180x140 | no | 37.00 |
| `stress` | 394.2x295.1 | yes | 6.33 |
| `mrtree` | 220x680 | no | 22.00 |

## Reading the table

- `circo` is the only candidate that draws a true ring (spread 0.0px) and its ratio
  is **3.16 against our 1.55** — worse on the thing it was measured for.
- ELK `radial` cannot take a cycle at all. `layered` breaks the cycle with a long
  return edge. Every diagram fixture this repo ships is a cycle, a layer DAG, or a
  grid, so neither applies.
- `stress` fits and is a force-directed layout: the extent comes back as
  `394.1834104742145`, which is the float-noise signature that P4 determinism
  exists to prevent. Rejected on that ground as much as on ratio.
- No candidate fits to a canvas. A 12-stage flow returns from ELK at 2140x48, so
  `layout/fit.ts` survives whichever library is adopted.

## Honesty note on earlier drafts

An earlier version of §8a stated the in-repo baseline as "171/81/132/81/171, ratio
2.12" and called it invariant to box size. Both were wrong:

- 2.12 is real but it is a **fixed-radius 216** measurement of an 11:6 slot, not
  the pre-A1.3 baseline. The pre-A1.3 baseline was centre-to-centre edges at ratio
  **1.007** (183/183/184/183/183) — uniform, but with every arrowhead buried inside
  its target node. Border anchoring is what introduces the skew (1.74 on that ring),
  and square slots are what reduce it (1.55).
- The size-invariance claim came from comparing ratios measured at different radii.
  The table above holds either variable fixed and shows the ratio moving 1.74 → 2.12
  → 1.66.