import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  CircleDot,
  Clock3,
  FileCheck2,
  GitCommitHorizontal,
  ShieldAlert,
} from "lucide-react";

import { ProgressBar, ProgressRing, Sparkline } from "@/components/visuals";
import type { NavigationView, PlatformSnapshot } from "@/types";

interface OverviewProps {
  data: PlatformSnapshot;
  onNavigate: (view: NavigationView) => void;
}

const eventIcons = {
  change: GitCommitHorizontal,
  approval: FileCheck2,
  evidence: CheckCircle2,
  risk: ShieldAlert,
};

export function Overview({ data, onNavigate }: OverviewProps) {
  return (
    <div className="overview-stack">
      <div className="metric-grid">
        {data.metrics.map((metric) => (
          <article className="metric-card" key={metric.id}>
            <div className="metric-card__heading">
              <span>{metric.label}</span>
              <span className={`trend-badge trend-badge--${metric.intent}`}>
                {metric.trend === "up" ? <ArrowUpRight size={13} /> : null}
                {metric.trend === "down" ? <ArrowDownRight size={13} /> : null}
                {metric.delta}
              </span>
            </div>
            <strong className="metric-card__value">{metric.value}</strong>
            <span className="metric-card__detail">{metric.detail}</span>
            {metric.sparkline.length > 1 ? <Sparkline label={`${metric.label} trend`} values={metric.sparkline} /> : <span className="metric-baseline">Auditable seed snapshot</span>}
          </article>
        ))}
      </div>

      <div className="dashboard-grid dashboard-grid--hero">
        <article className="panel release-panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">Release gate readiness</span>
              <h2>EV Battery Safety · 2026.07</h2>
            </div>
            <span className="status-chip status-chip--success"><span />On track</span>
          </div>

          <div className="release-body">
            <ProgressRing caption="traced" label="Verified trace coverage" value={data.traceability.coverage} />
            <div className="release-breakdown">
              <div className="breakdown-row">
                <div><span>Requirements linked to tests</span><strong>87.5%</strong></div>
                <ProgressBar label="Requirements linked to tests" value={87.5} />
              </div>
              <div className="breakdown-row">
                <div><span>Active evidence</span><strong>5 / 6</strong></div>
                <ProgressBar label="Active evidence" tone="amber" value={83.3} />
              </div>
              <div className="breakdown-row">
                <div><span>Injection probes blocked</span><strong>5 / 5</strong></div>
                <ProgressBar label="Injection probes blocked" value={100} />
              </div>
              <div className="release-stats">
                <div><strong>{data.traceability.directLinks}</strong><span>trace links</span></div>
                <div><strong>{data.traceability.orphanedItems}</strong><span>unverified requirement</span></div>
                <div><strong>{data.approvals.length}</strong><span>pending decisions</span></div>
              </div>
            </div>
          </div>
          <button className="text-button" onClick={() => onNavigate("traceability")} type="button">
            Explore traceability <ArrowRight size={15} />
          </button>
        </article>

        <article className="panel risk-panel">
          <div className="panel-heading">
            <div><span className="section-kicker">Safety exposure</span><h2>Risk register</h2></div>
            <button className="ghost-button ghost-button--compact" onClick={() => onNavigate("change-impact")} type="button">Review all</button>
          </div>
          <div className="risk-matrix" aria-label="Open impacts by severity" role="img">
            <div className="risk-column risk-column--high"><span style={{ height: "100%" }}><strong>2</strong></span><small>Critical</small></div>
            <div className="risk-column risk-column--medium"><span style={{ height: "54%" }}><strong>1</strong></span><small>High</small></div>
            <div className="risk-column risk-column--low"><span style={{ height: "18%" }}><strong>0</strong></span><small>Medium</small></div>
          </div>
          <div className="risk-callout">
            <ShieldAlert size={18} />
            <div><strong>REQ-BMS-001 requires approval</strong><span>The critical thermal trigger changed from 65 °C / 10 s to 60 °C / 5 s.</span></div>
            <ArrowRight size={16} />
          </div>
        </article>
      </div>

      <div className="dashboard-grid dashboard-grid--lower">
        <article className="panel activity-panel">
          <div className="panel-heading">
            <div><span className="section-kicker">Controlled activity</span><h2>Latest engineering events</h2></div>
            <span className="subtle-label">Live audit trail</span>
          </div>
          <ol className="activity-list">
            {data.activity.map((event) => {
              const Icon = eventIcons[event.kind];
              return (
                <li key={event.id}>
                  <span className={`event-icon event-icon--${event.kind}`}><Icon size={16} /></span>
                  <div><strong>{event.title}</strong><p>{event.detail}</p><small>{event.actor}</small></div>
                  <time>{event.time}</time>
                </li>
              );
            })}
          </ol>
        </article>

        <article className="panel health-panel">
          <div className="panel-heading">
            <div><span className="section-kicker">Platform health</span><h2>Intelligence pipeline</h2></div>
            <span className="health-score"><CircleDot size={14} />99.97%</span>
          </div>
          <div className="service-list">
            {data.services.map((service) => (
              <div className="service-row" key={service.name}>
                <span className={`service-status service-status--${service.state}`} />
                <div><strong>{service.name}</strong><small>{service.detail}</small></div>
                <span>{service.value}</span>
              </div>
            ))}
          </div>
          <div className="health-footer">
            <Clock3 size={16} /><span>Measured evaluation</span><strong>10 cases · passed</strong>
            <button aria-label="Open evaluation results" onClick={() => onNavigate("evaluations")} type="button"><ArrowRight size={15} /></button>
          </div>
        </article>
      </div>
    </div>
  );
}
