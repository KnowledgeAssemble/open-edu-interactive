import { EngineRegistry, type EngineEvent, type EngineHost } from '../../src/index.js';
import { TimelineEngine } from '@knowledgeassemble/timeline-engine';
import { VisualEngine } from '@knowledgeassemble/visual-engine';
import { DiagramEngine } from '@knowledgeassemble/diagram-engine';

export function makeHost(): { host: EngineHost; events: EngineEvent[] } {
  const events: EngineEvent[] = [];
  const host: EngineHost = {
    locale: 'en',
    tokens: {},
    reducedMotion: false,
    announce: () => undefined,
    onEvent: (event) => {
      events.push(structuredClone(event));
    },
    resolveAsset: (id) => id,
  };
  return { host, events };
}

export function makeRegistry(): EngineRegistry {
  const registry = new EngineRegistry();
  registry.register(new VisualEngine());
  registry.register(new TimelineEngine());
  registry.register(new DiagramEngine());
  return registry;
}