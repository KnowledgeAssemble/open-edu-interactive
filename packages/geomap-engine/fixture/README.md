# Fixtures for GeoMap Engine

This directory contains golden fixtures for the GeoMap Engine.

## Structure

All nine fixture dirs:

- `region/` — minimal region layer slice (single guided-select target)
- `marker/` — minimal marker layer slice (single city marker + focus)
- `route/` — route display with interactive endpoints
- `odisha-coastal/` — integrated example with regions, markers, and labels (the conformance default)
- `encoding/` — attr-encoding (fill), breakpoints, categories, auto-legend
- `overlay/` — two region layers with layer toggle
- `route-step/` — route stepping + scale bar
- `linear/` — interactive route segments, adjacency, legend-link
- `india-coastal/` — India coastal regions; **excluded from the golden suite** (see below)

Each fixture has:

- `input.geomap.json` — the spec under test
- `validation.json` — expected validation result from `GeoMapEngine.validate`
- `expected.scene.json`, `expected.svg`, `expected.a11y.json`, `expected.alternative.json` — golden artifacts compared byte-stable by `test/golden.test.ts`

## Golden determinism

`india-coastal/` is **not** part of the golden suite (`test/golden.test.ts` `FIXTURES`). It was dropped by `61c76f3` pending cross-platform centroid determinism: regenerating its goldens would commit platform-dependent bytes. The fixture and its goldens remain checked in for manual verification; the REGEN walker (`test/fixture-gen.test.ts`) also skips it for the same reason. Do not re-add it to either list until centroid arithmetic is resolved deterministically across platforms.

## Validation

```sh
pnpm --filter @knowledgeassemble/geomap-engine test
```

All fixtures must round-trip `GeoMapEngine.validate` as valid. `validation.json` asserts the exact issue list.

No fixture may contain authored geometry (`x`/`y`/`width`/`fill`/`stroke`). Every fixture carries a non-empty root-level `sources[]` with a `class` per source (provenance, DESIGN §9).