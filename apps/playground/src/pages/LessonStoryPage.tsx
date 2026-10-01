import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { mountLesson, type LessonMountResult } from "@knowledgeassemble/dev-harness";
import type { A11yNode } from "@knowledgeassemble/interactive-engine";
import { loadSpec, getCatalog, type FixtureEntry } from "../lib/specLoader.js";
import { DEFAULT_HOST_CONFIG, stubHostOptions, type HostConfig } from "../lib/hostPresets.js";
import { a11yTreeFromSnapshot, formatEvents, waitForInstances } from "../lib/inspectorHelpers.js";
import { COMPARE_CELL, COMPARE_GRID } from "../lib/layout.js";
import { InspectorColumn } from "../components/InspectorColumn.js";
import { HostPanel } from "../components/HostPanel.js";

export function LessonStoryPage(): React.JSX.Element {
  const { slug } = useParams();
  const containerRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<LessonMountResult | null>(null);
  const [hostConfig, setHostConfig] = useState<HostConfig>(DEFAULT_HOST_CONFIG);
  const [snapshot, setSnapshot] = useState<string>("");
  const [events, setEvents] = useState<string[]>([]);
  const [a11yTree, setA11yTree] = useState<A11yNode | null>(null);
  const [error, setError] = useState<string | null>(null);

  const entry = useMemo(
    () => getCatalog().find((c: FixtureEntry) => c.kind === "composition" && c.slug === slug),
    [slug],
  );

  const lessonSpec = useMemo(() => (entry ? loadSpec(entry.specPath) : undefined), [entry]);
  const specJson = useMemo(() => (lessonSpec ? JSON.stringify(lessonSpec, null, 2) : ""), [lessonSpec]);

  function refreshFromHandle(): void {
    if (!resultRef.current) return;
    const instanceId = resultRef.current.instances()[0] ?? "";
    const snap = resultRef.current.snapshot(instanceId);
    setSnapshot(JSON.stringify(snap, null, 2));
    setEvents(formatEvents(resultRef.current.events()));
    setA11yTree(a11yTreeFromSnapshot(snap));
  }

  useEffect(() => {
    if (!containerRef.current || !entry || !lessonSpec) return;
    resultRef.current?.teardown();
    containerRef.current.replaceChildren();
    let cancelled = false;

    async function mount(): Promise<void> {
      try {
        const result = mountLesson(lessonSpec as never, containerRef.current!, {
          host: stubHostOptions(hostConfig),
        });
        if (cancelled) {
          result.teardown();
          return;
        }
        resultRef.current = result;
        await waitForInstances(() => resultRef.current?.instances() ?? []);
        if (cancelled || !resultRef.current) return;
        refreshFromHandle();
        setError(null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    }

    mount();
    return () => {
      cancelled = true;
      resultRef.current?.teardown();
      resultRef.current = null;
    };
  }, [entry, lessonSpec, hostConfig]);

  return (
    <div>
      <h2>Lesson: {slug}</h2>
      {error && <div role="alert" style={{ color: "red" }}>{error}</div>}
      <HostPanel config={hostConfig} onChange={setHostConfig} />
      <div style={COMPARE_GRID}>
        <div style={COMPARE_CELL}>
          <div ref={containerRef} data-oedu-root />
          <div style={{ marginTop: 8 }}>
            <button type="button" onClick={refreshFromHandle}>Refresh Events</button>
            <button type="button" onClick={refreshFromHandle}>Refresh Snapshot</button>
          </div>
        </div>
        <div style={COMPARE_CELL}>
          <InspectorColumn
            specJson={specJson}
            events={events}
            snapshotJson={snapshot}
            a11yTree={a11yTree}
          />
        </div>
      </div>
    </div>
  );
}
