"use client";

import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  FileCheck2,
  MessageSquarePlus,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

import { ProgressBar } from "@/components/visuals";
import type { ApprovalItem } from "@/types";

type QueueFilter = "all" | "critical" | "agent";

interface ApprovalQueueProps {
  approvals: ApprovalItem[];
}

export function ApprovalQueue({ approvals }: ApprovalQueueProps) {
  const [filter, setFilter] = useState<QueueFilter>("all");
  const [selectedId, setSelectedId] = useState(approvals[0]?.id ?? "");
  const [decisions, setDecisions] = useState<Record<string, "approved" | "changes">>({});

  const filtered = useMemo(() => approvals.filter((approval) => {
    if (filter === "critical") return approval.riskScore >= 90;
    if (filter === "agent") return approval.requestedBy === "engtrace-agent";
    return true;
  }), [approvals, filter]);

  const selected = approvals.find((approval) => approval.id === selectedId) ?? filtered[0];
  const decide = (decision: "approved" | "changes") => {
    if (!selected) return;
    setDecisions((current) => ({ ...current, [selected.id]: decision }));
  };

  return (
    <div className="approval-stack">
      <div className="approval-summary summary-strip">
        <div><span>Pending decisions</span><strong>{approvals.length}</strong></div>
        <div><span>Critical changes</span><strong className="text-red">{approvals.filter((item) => item.riskScore >= 90).length}</strong></div>
        <div><span>AI-proposed links</span><strong className="text-amber">{approvals.filter((item) => item.requestedBy === "engtrace-agent").length}</strong></div>
        <div><span>Required role</span><strong>Approver</strong></div>
      </div>

      <div className="approval-layout">
        <section aria-label="Approval requests" className="panel queue-panel">
          <div className="queue-heading">
            <div><span className="section-kicker">Decision inbox</span><h2>Release approvals</h2></div>
            <div className="segmented-control segmented-control--wide" role="group" aria-label="Filter approval queue">
              <button aria-pressed={filter === "all"} onClick={() => setFilter("all")} type="button">All</button>
              <button aria-pressed={filter === "critical"} onClick={() => setFilter("critical")} type="button">Critical</button>
              <button aria-pressed={filter === "agent"} onClick={() => setFilter("agent")} type="button">AI-proposed</button>
            </div>
          </div>

          <div className="queue-list">
            {filtered.map((approval) => {
              const decision = decisions[approval.id];
              return (
                <button
                  className={selected?.id === approval.id ? "queue-item queue-item--selected" : "queue-item"}
                  key={approval.id}
                  onClick={() => setSelectedId(approval.id)}
                  type="button"
                >
                  <span className={`risk-score ${approval.riskScore >= 75 ? "risk-score--high" : "risk-score--medium"}`}>{approval.riskScore}</span>
                  <span className="queue-copy"><span><strong>{approval.title}</strong>{decision ? <span className={`decision-pill decision-pill--${decision}`}>{decision === "approved" ? "Approved" : "Changes asked"}</span> : <span className={`queue-status queue-status--${approval.status.toLowerCase().replace(" ", "-")}`}>{approval.status}</span>}</span><small>{approval.requirementId} · {approval.domain}</small><span className="queue-meta"><span><UserRound size={12} />{approval.requestedBy}</span><span><Clock3 size={12} />{approval.dueIn}</span></span></span>
                  <ChevronRight size={17} />
                </button>
              );
            })}
          </div>
        </section>

        {selected ? (
          <aside className="panel approval-detail">
            <div className="approval-detail__header">
              <div><span className="artifact-type artifact-type--requirement">{selected.id}</span><h2>{selected.title}</h2><p>{selected.requirementId} · {selected.domain}</p></div>
              <span className={`risk-shield ${selected.riskScore >= 75 ? "risk-shield--high" : ""}`}><ShieldCheck size={18} /><strong>{selected.riskScore}</strong><small>risk</small></span>
            </div>

            <div className="detail-section"><span className="section-kicker">Change summary</span><p>{selected.changeSummary}</p></div>

            <div className="evidence-readiness">
              <div><span>Evidence readiness</span><strong>{selected.evidenceReady}%</strong></div>
              <ProgressBar label="Evidence readiness" tone={selected.evidenceReady < 80 ? "amber" : "teal"} value={selected.evidenceReady} />
            </div>

            <div className="approval-checks">
              <h3>Pre-approval controls</h3>
              {selected.checks.map((check) => <div key={check.label}>{check.passed ? <CheckCircle2 className="text-teal" size={16} /> : <Circle className="text-muted" size={16} />}<span>{check.label}</span><strong>{check.passed ? "Passed" : "Open"}</strong></div>)}
            </div>

            {selected.checks.some((check) => !check.passed) ? <div className="approval-warning"><AlertTriangle size={17} /><span>Open controls require reviewer justification before approval.</span></div> : <div className="approval-ready"><CheckCircle2 size={17} /><span>All automated controls passed.</span></div>}

            {decisions[selected.id] ? (
              <div className={`decision-confirmation decision-confirmation--${decisions[selected.id]}`}>
                {decisions[selected.id] === "approved" ? <Check size={18} /> : <MessageSquarePlus size={18} />}
                <div><strong>{decisions[selected.id] === "approved" ? "Decision recorded" : "Changes requested"}</strong><span>This demo keeps the action locally for review.</span></div>
                <button aria-label="Undo local decision" onClick={() => setDecisions((current) => { const next = { ...current }; delete next[selected.id]; return next; })} type="button"><X size={15} /></button>
              </div>
            ) : (
              <div className="decision-actions"><button className="ghost-button" onClick={() => decide("changes")} type="button"><MessageSquarePlus size={16} />Request changes</button><button className="primary-button" onClick={() => decide("approved")} type="button"><FileCheck2 size={16} />Approve with record</button></div>
            )}
          </aside>
        ) : null}
      </div>
    </div>
  );
}
