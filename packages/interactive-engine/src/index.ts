import { ENGINE_TYPES, NAMESPACED_EVENT_PATTERN } from './composition/schema.js';

export type { A11yNode } from './accessibility/primitives.js';
export { a11yTreeOf } from './accessibility/primitives.js';
export type { EngineAction } from './core/action.js';
export type { Engine, EngineInstance, EngineType } from './core/engine.js';
export { EngineError, ERROR_CODES } from './core/errors.js';
export type { ErrorCode } from './core/errors.js';
export { LIFECYCLE_EVENTS } from './core/event.js';
export type { EngineEvent } from './core/event.js';
export type { EngineHost } from './core/host.js';
export { EngineRegistry } from './core/registry.js';
export { initialState } from './core/state.js';
export type { EngineState } from './core/state.js';
export { baseReducer } from './runtime/reducer.js';
export { EventLog } from './runtime/event-log.js';
export { createPlatformInstance } from './runtime/instance.js';
export { ACTION_TYPES } from './schemas/actions.js';
export type { ActionType } from './schemas/actions.js';
export type { EngineSpec } from './schemas/envelope.js';
export type { ValidationHooks, ValidationIssue, ValidationLevel, ValidationResult } from './validation/pipeline.js';
export { runPipeline } from './validation/pipeline.js';
export { validateEnvelope } from './validation/validate.js';
export { Lesson } from './composition/lesson.js';
export type { LessonRuntime } from './composition/lesson.js';
export { Router } from './composition/router.js';
export { LessonSchema, ENGINE_TYPES, NAMESPACED_EVENT_PATTERN } from './composition/schema.js';
export type { LessonDefinition, EngineEntry, BindingAction, Binding } from './composition/schema.js';
export const COMPOSITION = {
  ENGINE_TYPES,
  EVENT_NAME_PATTERN: NAMESPACED_EVENT_PATTERN.source,
} as const;

export { runEngineConformance, assertEngineConformance } from './conformance/helpers.js';
export type { EngineConformanceResult } from './conformance/helpers.js';
