import { demoSnapshot } from "@/data/demo";
import type { PlatformSnapshot } from "@/types";

export type DataSource = "synthetic" | "api";

export interface SnapshotResult {
  snapshot: PlatformSnapshot;
  source: DataSource;
}

export function buildDashboardEndpoint(baseUrl: string): string {
  const normalized = baseUrl.replace(/\/+$/, "");
  return normalized.endsWith("/api/v1")
    ? `${normalized}/dashboard`
    : `${normalized}/api/v1/dashboard`;
}

function isPlatformSnapshot(value: unknown): value is PlatformSnapshot {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PlatformSnapshot>;
  return (
    typeof candidate.workspace === "string" &&
    Array.isArray(candidate.metrics) &&
    Array.isArray(candidate.approvals) &&
    typeof candidate.traceability === "object" &&
    typeof candidate.evaluation === "object"
  );
}

interface DashboardSummary {
  counts: {
    requirements: number;
    tests: number;
    risks: number;
    evidence: number;
    pending_approvals: number;
  };
  trace_coverage: number;
  critical_unverified: string[];
  baseline: string;
}

function isDashboardSummary(value: unknown): value is DashboardSummary {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<DashboardSummary>;
  return (
    typeof candidate.trace_coverage === "number" &&
    typeof candidate.baseline === "string" &&
    Array.isArray(candidate.critical_unverified) &&
    !!candidate.counts &&
    typeof candidate.counts.requirements === "number" &&
    typeof candidate.counts.tests === "number" &&
    typeof candidate.counts.risks === "number" &&
    typeof candidate.counts.evidence === "number" &&
    typeof candidate.counts.pending_approvals === "number"
  );
}

function mergeDashboardSummary(summary: DashboardSummary): PlatformSnapshot {
  const coverage = Number((summary.trace_coverage * 100).toFixed(1));
  const verifiedRequirements = Math.round(summary.counts.requirements * summary.trace_coverage);
  return {
    ...demoSnapshot,
    release: summary.baseline,
    metrics: demoSnapshot.metrics.map((metric) => {
      if (metric.id === "requirements") {
        return { ...metric, value: String(summary.counts.requirements), detail: `${summary.counts.requirements} controlled in ${summary.baseline}` };
      }
      if (metric.id === "coverage") {
        return { ...metric, value: `${coverage}%`, detail: `${verifiedRequirements} of ${summary.counts.requirements} requirements linked to tests` };
      }
      if (metric.id === "risk") {
        return { ...metric, value: `${summary.counts.tests} / ${summary.counts.evidence}`, detail: `${summary.counts.risks} risks · one quarantined source` };
      }
      if (metric.id === "approvals") {
        return { ...metric, value: String(summary.counts.pending_approvals), detail: "RBAC-protected human decisions" };
      }
      return metric;
    }),
    traceability: {
      ...demoSnapshot.traceability,
      coverage,
      orphanedItems: Math.max(0, summary.counts.requirements - verifiedRequirements),
    },
  };
}

export async function loadPlatformSnapshot(
  signal?: AbortSignal,
): Promise<SnapshotResult> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!apiUrl) return { snapshot: demoSnapshot, source: "synthetic" };

  try {
    const response = await fetch(buildDashboardEndpoint(apiUrl), {
      signal,
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`Dashboard API returned ${response.status}`);

    const data: unknown = await response.json();
    if (isPlatformSnapshot(data)) return { snapshot: data, source: "api" };
    if (isDashboardSummary(data)) {
      return { snapshot: mergeDashboardSummary(data), source: "api" };
    }
    throw new Error("Dashboard API payload is invalid");
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return { snapshot: demoSnapshot, source: "synthetic" };
  }
}
