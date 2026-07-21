"use client";

import {
  Activity,
  Bell,
  BotMessageSquare,
  CheckCheck,
  ChevronDown,
  CircleHelp,
  GitCompareArrows,
  LayoutDashboard,
  Menu,
  Moon,
  Network,
  Search,
  ShieldCheck,
  Sun,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import { ApprovalQueue } from "@/components/approval-queue";
import { ChangeImpact } from "@/components/change-impact";
import { EvaluationResults } from "@/components/evaluation-results";
import { IntelligencePanel } from "@/components/intelligence-panel";
import { Overview } from "@/components/overview";
import { TraceabilityGraph } from "@/components/traceability-graph";
import { loadPlatformSnapshot, type DataSource } from "@/data/api";
import type { NavigationView, PlatformSnapshot } from "@/types";

const navigation = [
  { id: "overview", label: "Command center", icon: LayoutDashboard },
  { id: "traceability", label: "Traceability", icon: Network },
  { id: "intelligence", label: "Cited intelligence", icon: BotMessageSquare },
  { id: "change-impact", label: "Change impact", icon: GitCompareArrows },
  { id: "approvals", label: "Approval queue", icon: CheckCheck },
  { id: "evaluations", label: "Evaluation lab", icon: Activity },
] satisfies Array<{
  id: NavigationView;
  label: string;
  icon: typeof LayoutDashboard;
}>;

const pageCopy: Record<NavigationView, { eyebrow: string; title: string; description: string }> = {
  overview: {
    eyebrow: "Baseline 2026.07 · Live command center",
    title: "Engineering truth, connected.",
    description: "Requirements, validation, risk, and evidence in one reviewable operating picture.",
  },
  traceability: {
    eyebrow: "Coverage explorer",
    title: "Traceability graph",
    description: "Follow verified and inferred relationships from requirement to objective evidence.",
  },
  intelligence: {
    eyebrow: "Evidence-grounded RAG",
    title: "Cited intelligence",
    description: "Answers stay anchored to controlled source versions and reviewable excerpts.",
  },
  "change-impact": {
    eyebrow: "Version intelligence",
    title: "Change impact",
    description: "See exactly what changed, what it touches, and what must happen before approval.",
  },
  approvals: {
    eyebrow: "Human-in-the-loop control",
    title: "Approval queue",
    description: "Prioritize high-consequence decisions with complete context and accountable owners.",
  },
  evaluations: {
    eyebrow: "Quality and safety observability",
    title: "Evaluation results",
    description: "Measure retrieval, citations, faithfulness, resistance, latency, and unit cost.",
  },
};

interface DashboardShellProps {
  initialSnapshot: PlatformSnapshot;
}

export function DashboardShell({ initialSnapshot }: DashboardShellProps) {
  const [activeView, setActiveView] = useState<NavigationView>("overview");
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [source, setSource] = useState<DataSource>("synthetic");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [askedQuestion, setAskedQuestion] = useState<string | undefined>();

  useEffect(() => {
    const controller = new AbortController();
    void loadPlatformSnapshot(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setSnapshot(result.snapshot);
        setSource(result.source);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const selectView = (view: NavigationView) => {
    setActiveView(view);
    setMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const question = searchInput.trim();
    if (question) setAskedQuestion(question);
    selectView("intelligence");
  };

  const copy = pageCopy[activeView];

  return (
    <div className="app-shell" data-theme={theme}>
      <a className="skip-link" href="#main-content">Skip to main content</a>

      {mobileNavOpen ? (
        <button
          aria-label="Close navigation"
          className="nav-overlay"
          onClick={() => setMobileNavOpen(false)}
          type="button"
        />
      ) : null}

      <aside className={`sidebar ${mobileNavOpen ? "sidebar--open" : ""}`}>
        <div className="brand-row">
          <button className="brand" onClick={() => selectView("overview")} type="button">
            <span aria-hidden="true" className="brand-mark"><span /><span /><span /></span>
            <span className="brand-copy"><strong>ENGTRACE</strong><small>Requirements intelligence</small></span>
          </button>
          <button
            aria-label="Close navigation"
            className="icon-button sidebar-close"
            onClick={() => setMobileNavOpen(false)}
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        <button className="workspace-switcher" type="button">
            <span className="workspace-monogram">AE</span>
          <span><small>Active workspace</small><strong>{snapshot.workspace}</strong></span>
          <ChevronDown aria-hidden="true" size={16} />
        </button>

        <nav aria-label="Primary navigation" className="primary-nav">
          <span className="nav-label">Platform</span>
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <button
                aria-current={activeView === item.id ? "page" : undefined}
                className={activeView === item.id ? "nav-item nav-item--active" : "nav-item"}
                key={item.id}
                onClick={() => selectView(item.id)}
                type="button"
              >
                <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
                <span>{item.label}</span>
                {item.id === "approvals" ? <span className="nav-count">{snapshot.approvals.length}</span> : null}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-context">
          <div className="context-heading"><ShieldCheck size={17} /><span>Controlled environment</span></div>
          <p>EV Battery Safety · 2026.07</p>
          <div className="context-meter"><span style={{ width: `${snapshot.traceability.coverage}%` }} /></div>
          <div className="context-caption"><span>Trace coverage</span><strong>{snapshot.traceability.coverage}%</strong></div>
        </div>

        <div className="sidebar-footer">
          <button className="account-button" type="button">
            <span className="avatar">AR</span>
            <span><strong>Alex Rivera</strong><small>System reviewer</small></span>
            <ChevronDown size={15} />
          </button>
          <button aria-label="Help and documentation" className="icon-button" type="button"><CircleHelp size={18} /></button>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <button
            aria-label="Open navigation"
            className="icon-button menu-button"
            onClick={() => setMobileNavOpen(true)}
            type="button"
          >
            <Menu size={20} />
          </button>
          <form className="global-search" onSubmit={submitSearch} role="search">
            <Search aria-hidden="true" size={17} />
            <input
              aria-label="Ask EngTrace"
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Ask across requirements and evidence…"
              value={searchInput}
            />
            <kbd>↵</kbd>
          </form>
          <div className="topbar-actions">
            <span className={`source-indicator source-indicator--${source}`}>
              <span aria-hidden="true" />{source === "api" ? "Live API" : "Synthetic workspace"}
            </span>
            <button
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
              className="icon-button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              type="button"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button aria-label="Notifications, 3 unread" className="icon-button notification-button" type="button">
              <Bell size={18} /><span aria-hidden="true" />
            </button>
          </div>
        </header>

        <main className="content" id="main-content">
          <header className="page-header">
            <div>
              <span className="eyebrow">{copy.eyebrow}</span>
              <h1>{copy.title}</h1>
              <p>{copy.description}</p>
            </div>
            <div className="page-context">
              <span className="status-chip status-chip--success"><span />All systems nominal</span>
              <small>Snapshot · synthetic baseline 2026.07</small>
            </div>
          </header>

          <section aria-label={copy.title} className="view-panel" key={activeView}>
            {activeView === "overview" ? <Overview data={snapshot} onNavigate={selectView} /> : null}
            {activeView === "traceability" ? <TraceabilityGraph data={snapshot.traceability} /> : null}
            {activeView === "intelligence" ? (
              <IntelligencePanel data={snapshot.intelligence} promptOverride={askedQuestion} />
            ) : null}
            {activeView === "change-impact" ? <ChangeImpact data={snapshot.changeImpact} /> : null}
            {activeView === "approvals" ? <ApprovalQueue approvals={snapshot.approvals} /> : null}
            {activeView === "evaluations" ? <EvaluationResults run={snapshot.evaluation} /> : null}
          </section>
        </main>

        <footer className="app-footer">
          <span>EngTrace demonstrator · Synthetic engineering data</span>
          <span>Release {snapshot.release}</span>
        </footer>
      </div>
    </div>
  );
}
