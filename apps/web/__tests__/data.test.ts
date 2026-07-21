import { afterEach, describe, expect, it, vi } from "vitest";

import { buildDashboardEndpoint, loadPlatformSnapshot } from "@/data/api";
import { demoSnapshot } from "@/data/demo";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("synthetic EngTrace snapshot", () => {
  it("contains six complete command-center data surfaces", () => {
    expect(demoSnapshot.metrics.length).toBeGreaterThanOrEqual(4);
    expect(demoSnapshot.traceability.nodes.length).toBeGreaterThanOrEqual(8);
    expect(demoSnapshot.intelligence.citations.length).toBeGreaterThanOrEqual(3);
    expect(demoSnapshot.changeImpact.impacted.length).toBeGreaterThanOrEqual(3);
    expect(demoSnapshot.approvals.length).toBeGreaterThanOrEqual(3);
    expect(demoSnapshot.evaluation.metrics.length).toBeGreaterThanOrEqual(6);
  });

  it("keeps every trace edge connected to known artifacts", () => {
    const nodeIds = new Set(demoSnapshot.traceability.nodes.map((node) => node.id));
    for (const edge of demoSnapshot.traceability.edges) {
      expect(nodeIds.has(edge.from), `${edge.id} source`).toBe(true);
      expect(nodeIds.has(edge.to), `${edge.id} target`).toBe(true);
    }
  });

  it("keeps every cited finding backed by a known citation", () => {
    const citationIds = new Set(
      demoSnapshot.intelligence.citations.map((citation) => citation.id),
    );
    for (const finding of demoSnapshot.intelligence.findings) {
      for (const citation of finding.citations) {
        expect(citationIds.has(citation)).toBe(true);
      }
    }
  });

  it("normalizes a configured API base URL", () => {
    expect(buildDashboardEndpoint("https://engtrace.test///")).toBe(
      "https://engtrace.test/api/v1/dashboard",
    );
    expect(buildDashboardEndpoint("https://engtrace.test/api/v1/")).toBe(
      "https://engtrace.test/api/v1/dashboard",
    );
  });

  it("adapts the FastAPI dashboard summary into the typed UI snapshot", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://engtrace.test/");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        counts: { requirements: 8, tests: 7, risks: 3, evidence: 6, pending_approvals: 3 },
        trace_coverage: 0.875,
        critical_unverified: [],
        baseline: "EV Battery Safety / 2026.07",
      }),
    }));

    const result = await loadPlatformSnapshot();

    expect(result.source).toBe("api");
    expect(result.snapshot.metrics.find((metric) => metric.id === "requirements")?.value).toBe("8");
    expect(result.snapshot.traceability.coverage).toBe(87.5);
    expect(result.snapshot.traceability.orphanedItems).toBe(1);
  });
});
