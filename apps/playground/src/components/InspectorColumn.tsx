import type { A11yNode } from "@knowledgeassemble/interactive-engine";
import { InspectorPanel } from "./InspectorPanel.js";
import { A11yTreeView } from "./A11yTreeView.js";

export function InspectorColumn({
  specJson,
  events,
  snapshotJson,
  validationIssues,
  a11yTree,
}: {
  specJson: string;
  events: string[];
  snapshotJson: string;
  validationIssues?: string;
  a11yTree: A11yNode | null;
}): React.JSX.Element {
  return (
    <div>
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
  );
}