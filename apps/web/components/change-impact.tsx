"use client";

import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronRight,
  Clock3,
  GitCompareArrows,
  GitPullRequestArrow,
  ListTree,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import { useState } from "react";

import type { ChangeImpactData, DiffLine, ImpactedArtifact } from "@/types";

const impactTone: Record<ImpactedArtifact["impact"], string> = {
  High: "red",
  Medium: "amber",
  Low: "teal",
};

function DiffRow({ line }: { line: DiffLine }) {
  const prefix = line.kind === "added" ? "+" : line.kind === "removed" ? "−" : " ";
  return (
    <div className={`diff-line diff-line--${line.kind}`}>
      <span className="diff-number">{line.number}</span><span className="diff-prefix">{prefix}</span><code>{line.text}</code>
    </div>
  );
}

interface ChangeImpactProps {
  data: ChangeImpactData;
}

export function ChangeImpact({ data }: ChangeImpactProps) {
  const [mode, setMode] = useState<"unified" | "split">("unified");
  const [validationQueued, setValidationQueued] = useState(false);
  const removed = data.diff.filter((line) => line.kind !== "added");
  const added = data.diff.filter((line) => line.kind !== "removed");

  return (
    <div className="impact-stack">
      <article className="panel change-summary-card">
        <div className="version-route">
          <span><small>Previous baseline</small><strong>{data.fromVersion}</strong></span>
          <span className="version-arrow"><ArrowRight size={20} /></span>
          <span><small>Proposed version</small><strong>{data.toVersion}</strong></span>
        </div>
        <div className="change-summary-copy">
          <span className="artifact-type artifact-type--requirement">Requirement change</span>
          <h2>{data.requirementId} · {data.title}</h2>
          <p>{data.rationale}</p>
          <div className="change-byline"><span><UserRound size={14} />{data.changedBy}</span><span><Clock3 size={14} />{data.changedAt}</span></div>
        </div>
        <div className="change-score"><small>Impact score</small><strong>86</strong><span>High</span></div>
      </article>

      <div className="impact-grid">
        <article className="panel diff-panel">
          <div className="panel-heading">
            <div><span className="section-kicker">Controlled document diff</span><h2>Acceptance criteria</h2></div>
            <div className="segmented-control" role="group" aria-label="Diff layout">
              <button aria-pressed={mode === "unified"} onClick={() => setMode("unified")} type="button">Unified</button>
              <button aria-pressed={mode === "split"} onClick={() => setMode("split")} type="button">Split</button>
            </div>
          </div>
          <div className={`code-diff code-diff--${mode}`}>
            <div className="diff-filebar"><GitCompareArrows size={15} /><span>SRS-HVDC / 4.3.8 Torque derating</span><span>+2 −1</span></div>
            {mode === "unified" ? (
              <div>{data.diff.map((line, index) => <DiffRow key={`${line.kind}-${line.number}-${index}`} line={line} />)}</div>
            ) : (
              <div className="split-diff"><div><span className="split-label">{data.fromVersion}</span>{removed.map((line, index) => <DiffRow key={`old-${index}`} line={line} />)}</div><div><span className="split-label">{data.toVersion}</span>{added.map((line, index) => <DiffRow key={`new-${index}`} line={line} />)}</div></div>
            )}
          </div>
        </article>

        <aside className="panel impact-summary">
          <div className="panel-heading"><div><span className="section-kicker">Automated assessment</span><h2>Impact summary</h2></div><ListTree size={20} /></div>
          <div className="impact-counts"><div><strong>4</strong><span>artifacts affected</span></div><div><strong>2</strong><span>owners required</span></div><div><strong>1</strong><span>gate blocker</span></div></div>
          <div className="recommendation"><ShieldAlert size={19} /><div><strong>Recommendation</strong><p>{data.recommendation}</p></div></div>
          <button className="primary-button primary-button--full" onClick={() => setValidationQueued(true)} type="button">{validationQueued ? <Check size={16} /> : <GitPullRequestArrow size={16} />}{validationQueued ? "Revalidation queued" : "Request revalidation"}</button>
        </aside>
      </div>

      <article className="panel impacted-panel">
        <div className="panel-heading"><div><span className="section-kicker">Downstream analysis</span><h2>Impacted artifacts</h2></div><span className="subtle-label">Ranked by consequence and link confidence</span></div>
        <div className="impacted-list">
          {data.impacted.map((artifact) => (
            <button className="impacted-row" key={artifact.id} type="button">
              <span className={`impact-icon impact-icon--${artifact.type.toLowerCase()}`}>{artifact.type === "Risk" ? <AlertTriangle size={17} /> : <GitCompareArrows size={17} />}</span>
              <span className="impacted-id"><small>{artifact.type}</small><strong>{artifact.id}</strong></span>
              <span className="impacted-title"><strong>{artifact.title}</strong><small>{artifact.owner}</small></span>
              <span className={`severity-badge severity-badge--${impactTone[artifact.impact]}`}>{artifact.impact}</span>
              <span className="impacted-action"><small>Required action</small><strong>{artifact.action}</strong></span>
              <ChevronRight size={17} />
            </button>
          ))}
        </div>
      </article>
    </div>
  );
}
