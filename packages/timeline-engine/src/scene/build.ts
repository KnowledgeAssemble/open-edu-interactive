import { EngineError } from '@knowledgeassemble/interactive-engine';
import type { TimelineContent, TimelineEvent, TimelineTrack } from '../schema.js';
import { parseDate } from '../layout/time.js';
import type { Scene, SceneNode } from './types.js';

function assertUnique(seen: Set<string>, id: string, what: string): void {
  if (seen.has(id)) {
    throw new EngineError('INVALID_ENTITY', `timeline: duplicate ${what} id "${id}"`);
  }
  seen.add(id);
}

export function buildScene(content: TimelineContent): Scene {
  const seen = new Set<string>();
  const semantics: Record<string, SceneNode> = {};
  const nodes: SceneNode[] = [];

  const eventById = new Map<string, TimelineEvent>();
  const trackById = new Map<string, TimelineTrack>();
  const eventTrack = new Map<string, string>();

  for (const event of content.events) {
    assertUnique(seen, event.id, 'event');
    eventById.set(event.id, event);
  }

  if (content.periods) {
    for (const period of content.periods) {
      assertUnique(seen, period.id, 'period');
    }
  }

  if (content.tracks) {
    for (const track of content.tracks) {
      assertUnique(seen, track.id, 'track');
      trackById.set(track.id, track);
      for (const eventId of track.events) {
        if (!eventById.has(eventId)) {
          throw new EngineError('INVALID_REFERENCE', `timeline: track "${track.id}" references unknown event "${eventId}"`);
        }
        if (eventTrack.has(eventId)) {
          throw new EngineError('INVALID_ENTITY', `timeline: event "${eventId}" belongs to multiple tracks ("${eventTrack.get(eventId)}" and "${track.id}")`);
        }
        eventTrack.set(eventId, track.id);
      }
    }
  }

  const trackIds = content.tracks ? new Set(content.tracks.map((t) => t.id)) : new Set<string>();
  for (const event of content.events) {
    if (event.trackId && !trackIds.has(event.trackId)) {
      throw new EngineError('INVALID_REFERENCE', `timeline: event "${event.id}" references unknown track "${event.trackId}"`);
    }
    if (event.trackId && content.tracks) {
      const track = content.tracks.find((t) => t.id === event.trackId);
      if (track && !track.events.includes(event.id)) {
        eventTrack.set(event.id, event.trackId);
      }
    }
  }

  const defaultTrackId = 'track-default';

  for (const event of content.events) {
    const dn = parseDate(event.date);
    const trackId = eventTrack.get(event.id) ?? event.trackId ?? defaultTrackId;
    const marker: SceneNode = {
      id: event.id,
      role: 'selectable',
      kind: 'event-marker',
      label: `${event.label} (${event.date})`,
      interactive: event.interactive !== false,
      acceptsActions: event.interactive === false ? undefined : ['select', 'focus'],
      metadata: {
        date: dn,
        dateString: event.date,
        label: event.label,
        trackId,
        links: event.links,
      },
      children: [],
    };
    semantics[event.id] = marker;
    nodes.push(marker);

    if (event.duration !== undefined) {
      const dnTo = parseDate(event.duration);
      const span: SceneNode = {
        id: `${event.id}-span`,
        role: 'period-band',
        kind: 'event-span',
        label: `${event.label} (${event.date} – ${event.duration})`,
        interactive: false,
        metadata: {
          fromDay: dn,
          toDay: dnTo,
          from: event.date,
          to: event.duration,
          label: event.label,
          eventId: event.id,
        },
        children: [],
      };
      semantics[`${event.id}-span`] = span;
      nodes.push(span);
    }
  }

  const periodIds = new Set<string>();
  if (content.periods) {
    for (const period of content.periods) {
      const fromDay = parseDate(period.from);
      const toDay = parseDate(period.to);
      const pid = `period-${period.id}`;
      assertUnique(seen, pid, 'period-node');
      periodIds.add(pid);
      const band: SceneNode = {
        id: pid,
        role: 'period-band',
        kind: 'period-band',
        label: `${period.label} (${period.from} – ${period.to})`,
        interactive: false,
        metadata: {
          fromDay,
          toDay,
          from: period.from,
          to: period.to,
          label: period.label,
          description: period.description,
          role: period.style?.role ?? 'secondary-period',
        },
        children: [],
      };
      semantics[pid] = band;
      nodes.push(band);
    }
  }

  const trackLanes = new Map<string, SceneNode>();
  if (content.tracks) {
    for (const track of content.tracks) {
      const tid = `track-${track.id}`;
      const lane: SceneNode = {
        id: tid,
        role: 'track-lane',
        kind: 'track-lane',
        label: track.label,
        metadata: { eventIds: track.events, label: track.label },
        children: [],
      };
      semantics[tid] = lane;
      trackLanes.set(track.id, lane);
      nodes.push(lane);
    }
  }

  const defaultLane: SceneNode = {
    id: `track-${defaultTrackId}`,
    role: 'track-lane',
    kind: 'track-lane',
    label: '',
    metadata: { eventIds: content.events.filter((e) => (eventTrack.get(e.id) ?? e.trackId ?? defaultTrackId) === defaultTrackId).map((e) => e.id), label: '' },
    children: [],
  };
  semantics[defaultLane.id] = defaultLane;
  nodes.push(defaultLane);

  const axis: SceneNode = {
    id: 'axis-time',
    role: 'axis',
    kind: 'axis',
    label: 'Time',
    children: [],
  };
  semantics[axis.id] = axis;
  nodes.push(axis);

  return { nodes, semantics };
}