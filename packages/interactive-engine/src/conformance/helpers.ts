import type { Engine, EngineSpec, EngineAction, EngineHost, ValidationResult, EngineEvent } from '../index.js';

export interface EngineConformanceResult {
  engine: string;
  validated: boolean;
  monotonicSeq: boolean;
  rejectInvalidAction: boolean;
  snapshotStable: boolean;
}

function makeHost(): EngineHost {
  const events: EngineEvent[] = [];
  const host: EngineHost = {
    locale: 'en' as const,
    tokens: {},
    reducedMotion: false,
    announce: () => undefined,
    onEvent: (event) => {
      if (events.length < 1000) events.push(event);
    },
    resolveAsset: (id: string) => id,
  };
  return host;
}

function monotonic(events: Array<{ seq: number }>): boolean {
  for (let i = 1; i < events.length; i++) {
    if (events[i]!.seq <= events[i - 1]!.seq) return false;
  }
  return true;
}

export function runEngineConformance(engine: Engine, spec: EngineSpec, action: EngineAction): EngineConformanceResult {
  const host = makeHost();
  const validation = engine.validate(spec);
  const instance = engine.instantiate(spec, host, `conformance-${engine.type}`);
  const emitted: EngineEvent[] = [];
  instance.subscribe((event) => emitted.push(event));
  instance.dispatch(action);
  const snap1 = JSON.stringify(instance.snapshot());
  const snap2 = JSON.stringify(instance.snapshot());
  instance.teardown();

  const badSpec = {
    ...spec,
    interaction: { ...(spec.interaction ?? {}), actions: ['not-a-d5-action'] },
  } as unknown;
  const badValidation = engine.validate(badSpec as EngineSpec) as ValidationResult;

  return {
    engine: engine.type,
    validated: validation.valid,
    monotonicSeq: monotonic(emitted),
    rejectInvalidAction: badValidation.valid === false,
    snapshotStable: snap1 === snap2,
  };
}

export function assertEngineConformance(result: EngineConformanceResult): void {
  const failures: string[] = [];
  if (!result.validated) failures.push('valid spec did not validate');
  if (!result.monotonicSeq) failures.push('event seq not monotonic');
  if (!result.rejectInvalidAction) failures.push('non-D5 action not rejected');
  if (!result.snapshotStable) failures.push('snapshot not stable');
  if (failures.length > 0) {
    throw new Error(`conformance ${result.engine}: ${failures.join('; ')}`);
  }
}