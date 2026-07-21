export type NavigationView =
  | "overview"
  | "traceability"
  | "intelligence"
  | "change-impact"
  | "approvals"
  | "evaluations";

export type HealthState = "healthy" | "warning" | "critical";
export type TrendDirection = "up" | "down" | "flat";

export interface KpiMetric {
  id: string;
  label: string;
  value: string;
  detail: string;
  delta: string;
  trend: TrendDirection;
  intent: "positive" | "neutral" | "negative";
  sparkline: number[];
}

export interface ActivityEvent {
  id: string;
  title: string;
  detail: string;
  time: string;
  kind: "change" | "approval" | "evidence" | "risk";
  actor: string;
}

export interface ServiceHealth {
  name: string;
  detail: string;
  value: string;
  state: HealthState;
}

export type TraceNodeType =
  | "requirement"
  | "test"
  | "risk"
  | "evidence"
  | "component";

export interface TraceNode {
  id: string;
  label: string;
  subtitle: string;
  type: TraceNodeType;
  x: number;
  y: number;
  status: HealthState;
}

export interface TraceEdge {
  id: string;
  from: string;
  to: string;
  label: string;
  kind: "verified" | "inferred" | "blocked";
}

export interface TraceabilityData {
  coverage: number;
  directLinks: number;
  inferredLinks: number;
  orphanedItems: number;
  nodes: TraceNode[];
  edges: TraceEdge[];
  criticalPath: string[];
}

export interface Citation {
  id: number;
  document: string;
  version: string;
  section: string;
  page?: number;
  excerpt: string;
  relevance: number;
  verifiedAt: string;
}

export interface IntelligenceAnswer {
  question: string;
  confidence: number;
  generatedAt: string;
  summary: string;
  findings: Array<{
    text: string;
    citations: number[];
  }>;
  citations: Citation[];
  model: string;
  retrieval: string;
}

export interface DiffLine {
  number: number;
  kind: "context" | "added" | "removed";
  text: string;
}

export interface ImpactedArtifact {
  id: string;
  type: "Test" | "Risk" | "Evidence" | "Requirement";
  title: string;
  owner: string;
  impact: "High" | "Medium" | "Low";
  action: string;
}

export interface ChangeImpactData {
  requirementId: string;
  title: string;
  fromVersion: string;
  toVersion: string;
  changedBy: string;
  changedAt: string;
  rationale: string;
  diff: DiffLine[];
  impacted: ImpactedArtifact[];
  recommendation: string;
}

export type ApprovalStatus = "Pending" | "Escalated" | "In review";

export interface ApprovalItem {
  id: string;
  requirementId: string;
  title: string;
  requestedBy: string;
  requestedAt: string;
  dueIn: string;
  riskScore: number;
  status: ApprovalStatus;
  domain: string;
  changeSummary: string;
  evidenceReady: number;
  checks: Array<{
    label: string;
    passed: boolean;
  }>;
}

export interface EvaluationMetric {
  id: string;
  label: string;
  value: number;
  formatted: string;
  target: string;
  passed: boolean;
  delta: string;
  history: number[];
}

export interface EvaluationRun {
  id: string;
  label: string;
  dataset: string;
  completedAt: string;
  status: "Passed" | "Warning" | "Failed";
  metrics: EvaluationMetric[];
  latency: Array<{
    stage: string;
    milliseconds: number;
  }>;
  injectionProbes: Array<{
    category: string;
    blocked: number;
    total: number;
  }>;
  costPerAnswer: number;
  trendLabels: string[];
}

export interface PlatformSnapshot {
  generatedAt: string;
  workspace: string;
  release: string;
  metrics: KpiMetric[];
  activity: ActivityEvent[];
  services: ServiceHealth[];
  traceability: TraceabilityData;
  intelligence: IntelligenceAnswer;
  changeImpact: ChangeImpactData;
  approvals: ApprovalItem[];
  evaluation: EvaluationRun;
}
