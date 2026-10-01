import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { mountEngine } from "@knowledgeassemble/dev-harness";
import type { A11yNode } from "@knowledgeassemble/interactive-engine";
import { loadSpec, getCatalog, type FixtureEntry } from "../lib/specLoader.js";
import { DEFAULT_HOST_CONFIG, stubHostOptions, type HostConfig } from "../lib/hostPresets.js";
import { a11yTreeFromSnapshot, formatEvents, formatValidationIssues } from "../lib/inspectorHelpers.js";
import { COMPARE_CELL, COMPARE_GRID } from "../lib/layout.js";
import { InspectorPanel } from "../components/InspectorPanel.js";
import { A11yTreeView } from "../components/A11yTreeView.js";
import { HostPanel } from "../components/HostPanel.js";

type MountHandle = {
  teardown: () => void;
  snapshot: () => unknown;
  events: () => readonly { seq: number; name: string; action?: unknown }[];
  validate: (spec: unknown) => { issues: { code: string; message: string }[] };
  dispatch: (action: unknown) => void;
};

export function EngineStoryPage(): React.JSX.Element {
  const { engine, slug } = useParams();
  const containerRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<MountHandle | null>(null);
  const [hostConfig, setHostConfig] = useState<HostConfig>(DEFAULT_HOST_CONFIG);
  const [snapshotJson, setSnapshotJson] = useState<string>("");
  const [events, setEvents] = useState<string[]>([]);
  const [validationIssues, setValidationIssues] = useState<string>("");
  const [a11yTree, setA11yTree] = useState<A11yNode | null>(null);
  const [error, setError] = useState<string | null>(null);

  const entry = useMemo(
    () => getCatalog().find((c: FixtureEntry) => c.kind === "engine" && c.engine === engine && c.slug === slug),
    [engine, slug],
  );

  const spec = useMemo(() => (entry ? loadSpec(entry.specPath) : undefined), [entry]);
  const specJson = useMemo(() => (spec ? JSON.stringify(spec, null, 2) : ""), [spec]);
  const actions = (spec as { interaction?: { actions?: string[] } } | undefined)?.interaction?.actions;

  function refreshFromHandle(handle: MountHandle): void {
    const snap = handle.snapshot();
    setSnapshotJson(JSON.stringify(snap, null, 2));
    setEvents(formatEvents(handle.events()));
    setA11yTree(a11yTreeFromSnapshot(snap));
  }

  useEffect(() => {
    if (!containerRef.current || !entry || !spec) return;
    resultRef.current?.teardown();
    containerRef.current.replaceChildren();
    try {
      const handle: MountHandle = {
        teardown: () => {},
        snapshot: () => ({}),
        events: () => [],
        validate: () => ({ issues: [] }),
        dispatch: () => {},
      };
      const result = mountEngine(spec as never, containerRef.current, {
        host: {
          ...stubHostOptions(hostConfig),
          onEvent: () => {
            if (resultRef.current) {
              refreshFromHandle(resultRef.current);
            }
          },
        },
      });
      handle.teardown = result.teardown.bind(result);
      handle.snapshot = result.snapshot.bind(result);
      handle.events = result.events.bind(result);
      handle.validate = result.validate.bind(result);
      handle.dispatch = result.dispatch.bind(result) as (action: unknown) => void;
      resultRef.current = handle;
      const validation = result.validate(spec);
      setValidationIssues(formatValidationIssues(validation.issues));
      refreshFromHandle(resultRef.current);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    return () => {
      resultRef.current?.teardown();
      resultRef.current = null;
    };
  }, [entry, spec, hostConfig]);

  function handleDispatch(actionType: string): void {
    if (!resultRef.current) return;
    const targetId = prompt("Target ID (leave empty if none):", "");
    const action: Record<string, unknown> = { type: actionType };
    if (targetId) action.target = { id: targetId };
    resultRef.current.dispatch(action as never);
    refreshFromHandle(resultRef.current);
  }

  return (
    <div>
      <h2>{engine}/{slug}</h2>
      {error && <div role="alert" style={{ color: "red" }}>{error}</div>}
      <HostPanel config={hostConfig} onChange={setHostConfig} />
      <div style={COMPARE_GRID}>
        <div style={COMPARE_CELL}>
          <div ref={containerRef} data-oedu-root />
          <div style={{ marginTop: 8, display: "flex", gap: 4, flexWrap: "wrap" }}>
            <button type="button" onClick={() => { if (resultRef.current) refreshFromHandle(resultRef.current); }}>
              Refresh Events
            </button>
            <button type="button" onClick={() => { if (resultRef.current) refreshFromHandle(resultRef.current); }}>
              Refresh Snapshot
            </button>
            {entry != null && spec != null && (
              <button
                type="button"
                onClick={() => {
                  if (!resultRef.current) return;
                  const v = resultRef.current.validate(spec);
                  setValidationIssues(formatValidationIssues(v.issues));
                }}
              >
                Validate
              </button>
            )}
            {actions?.map((actionType) => (
              <button key={actionType} type="button" onClick={() => handleDispatch(actionType)}>
                {actionType}
              </button>
            ))}
          </div>
        </div>
        <div style={COMPARE_CELL}>
          <InspectorPanel title="Input Spec" content={specJson} copyLabel="Copy JSON" />
          <InspectorPanel title={`Events (${events.length})`} content={events.join("\n")} copyLabel="Copy" />
          <InspectorPanel title="Snapshot" content={snapshotJson} copyLabel="Copy JSON" />
          {validationIssues && (
            <InspectorPanel
              title="Validation"
              content={validationIssues}
              color={validationIssues === "Valid" ? "green" : "red"}
              copyLabel="Copy"
            />
          )}
          {a11yTree && (
            <InspectorPanel title="A11y Tree" copyLabel="Copy JSON" content={JSON.stringify(a11yTree, null, 2)}>
              <A11yTreeView tree={a11yTree} />
            </InspectorPanel>
          )}
        </div>
      </div>
    </div>
  );
}
