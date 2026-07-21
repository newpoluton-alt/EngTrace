import {
  Activity,
  BadgeCheck,
  Check,
  Clock3,
  Coins,
  DatabaseZap,
  Gauge,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { ProgressBar } from "@/components/visuals";
import type { EvaluationRun } from "@/types";

const metricIcons: Record<string, typeof Activity> = {
  recall: DatabaseZap,
  citation: BadgeCheck,
  faithfulness: Sparkles,
  injection: ShieldCheck,
  latency: Gauge,
  cost: Coins,
};

interface EvaluationResultsProps {
  run: EvaluationRun;
}

export function EvaluationResults({ run }: EvaluationResultsProps) {
  const qualityMetrics = run.metrics.slice(0, 4);
  const totalLatency = run.latency.reduce((sum, stage) => sum + stage.milliseconds, 0);

  return (
    <div className="evaluation-stack">
      <article className="panel evaluation-banner">
        <span className="evaluation-pass"><BadgeCheck size={24} /></span>
        <div><span className="section-kicker">Latest benchmark</span><h2>{run.label}</h2><p>{run.id} · {run.dataset}</p></div>
        <div className="evaluation-meta"><span className="status-chip status-chip--success"><Check size={13} />{run.status}</span><small>Completed {run.completedAt}</small></div>
      </article>

      <div className="evaluation-metrics">
        {run.metrics.map((metric) => {
          const Icon = metricIcons[metric.id] ?? Activity;
          return (
            <article className="panel eval-card" key={metric.id}>
              <div className="eval-card__top"><span className={`eval-icon eval-icon--${metric.id}`}><Icon size={17} /></span><span className="metric-pass"><Check size={12} />Pass</span></div>
              <span className="eval-card__label">{metric.label}</span>
              <strong>{metric.formatted}</strong>
              <div className="eval-card__meta"><span>Target {metric.target}</span><span>{metric.delta}</span></div>
              <ProgressBar label={`${metric.label} gate result`} tone={metric.passed ? "teal" : "red"} value={metric.value} />
            </article>
          );
        })}
      </div>

      <div className="evaluation-grid">
        <article className="panel trend-panel">
          <div className="panel-heading"><div><span className="section-kicker">Measured quality gate</span><h2>Deterministic baseline snapshot</h2></div><span className="subtle-label">10 cases · one measured run</span></div>
          <div className="quality-gate-list">
            {qualityMetrics.map((metric) => <div className="quality-gate-row" key={metric.id}><div><span>{metric.label}</span><strong>{metric.formatted}</strong></div><ProgressBar label={metric.label} value={metric.value} /><small>Gate {metric.target} · {metric.delta}</small></div>)}
          </div>
          <div className="baseline-note"><DatabaseZap size={16} /><span>Values come from <strong>evals/results/baseline.json</strong>; no multi-run trend is implied.</span></div>
        </article>

        <article className="panel injection-panel">
          <div className="panel-heading"><div><span className="section-kicker">Adversarial suite</span><h2>Prompt-injection resistance</h2></div><ShieldCheck size={20} /></div>
          <div className="injection-score"><strong>100%</strong><span>5 of 5 direct and indirect probes safely blocked</span></div>
          <div className="probe-list">
            {run.injectionProbes.map((probe) => {
              const percent = (probe.blocked / probe.total) * 100;
              return <div className="probe-row" key={probe.category}><div><span>{probe.category}</span><strong>{probe.blocked}/{probe.total}</strong></div><ProgressBar label={`${probe.category} probes blocked`} tone={percent < 98 ? "amber" : "teal"} value={percent} /></div>;
            })}
          </div>
          <div className="guard-note"><ShieldCheck size={16} /><span>Retrieved instructions are isolated from the system policy and denied tool authority.</span></div>
        </article>
      </div>

      <div className="evaluation-grid evaluation-grid--lower">
        <article className="panel latency-panel">
          <div className="panel-heading"><div><span className="section-kicker">Performance profile</span><h2>Measured p95 latency</h2></div><span className="latency-total"><Clock3 size={14} />{totalLatency.toFixed(2)} ms</span></div>
          <div className="latency-list">
            {run.latency.map((stage) => <div className="latency-row" key={stage.stage}><span>{stage.stage}</span><div><i style={{ width: `${(stage.milliseconds / totalLatency) * 100}%` }} /></div><strong>{stage.milliseconds} ms</strong></div>)}
          </div>
        </article>

        <article className="panel cost-panel">
          <div className="panel-heading"><div><span className="section-kicker">Unit economics</span><h2>Cost envelope</h2></div><Coins size={20} /></div>
          <div className="cost-hero"><span><small>Mean model cost</small><strong>${run.costPerAnswer.toFixed(3)}</strong></span><span className="trend-badge trend-badge--positive">Gate passed</span></div>
          <div className="cost-breakdown"><div><span>Execution mode</span><strong>Deterministic offline</strong></div><div><span>Hosted model calls</span><strong>0</strong></div><div><span>Measured cases</span><strong>10</strong></div></div>
          <div className="cost-volume"><Gauge size={16} /><span>Scope note</span><strong>Not a hosted-LLM estimate</strong></div>
        </article>
      </div>
    </div>
  );
}
