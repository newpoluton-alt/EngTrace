"use client";

import { Download, Filter, Focus, Link2, Search, ShieldCheck } from "lucide-react";
import { KeyboardEvent, useMemo, useState } from "react";

import { ProgressBar } from "@/components/visuals";
import type { TraceNode, TraceNodeType, TraceabilityData } from "@/types";

const nodeLabels: Record<TraceNodeType, string> = {
  requirement: "Requirement",
  component: "Component",
  test: "Test",
  risk: "Risk",
  evidence: "Evidence",
};

interface TraceabilityGraphProps {
  data: TraceabilityData;
}

export function TraceabilityGraph({ data }: TraceabilityGraphProps) {
  const [selectedId, setSelectedId] = useState(data.nodes[0]?.id ?? "");
  const [filter, setFilter] = useState<"all" | TraceNodeType>("all");
  const [criticalOnly, setCriticalOnly] = useState(false);
  const [query, setQuery] = useState("");

  const visibleNodes = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return data.nodes.filter((node) => {
      const matchesType = filter === "all" || node.type === filter;
      const matchesCritical = !criticalOnly || data.criticalPath.includes(node.id);
      const matchesQuery = !normalized || `${node.id} ${node.subtitle}`.toLowerCase().includes(normalized);
      return matchesType && matchesCritical && matchesQuery;
    });
  }, [criticalOnly, data, filter, query]);

  const visibleIds = new Set(visibleNodes.map((node) => node.id));
  const visibleEdges = data.edges.filter((edge) => visibleIds.has(edge.from) && visibleIds.has(edge.to));
  const selected = data.nodes.find((node) => node.id === selectedId) ?? data.nodes[0];
  const selectedLinks = data.edges.filter((edge) => edge.from === selected?.id || edge.to === selected?.id);

  const chooseNode = (node: TraceNode) => setSelectedId(node.id);
  const handleNodeKey = (event: KeyboardEvent<SVGGElement>, node: TraceNode) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      chooseNode(node);
    }
  };

  const exportGraph = () => {
    const file = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(file);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "engtrace-traceability-export.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="trace-stack">
      <div className="summary-strip">
        <div><span>Verified coverage</span><strong>{data.coverage}%</strong></div>
        <div><span>Direct links</span><strong>{data.directLinks.toLocaleString()}</strong></div>
        <div><span>Inferred links</span><strong>{data.inferredLinks}</strong></div>
        <div><span>Orphaned items</span><strong className="text-amber">{data.orphanedItems}</strong></div>
      </div>

      <article className="panel graph-panel">
        <div className="graph-toolbar">
          <label className="graph-search"><Search size={15} /><input aria-label="Search graph" onChange={(event) => setQuery(event.target.value)} placeholder="Find artifact…" value={query} /></label>
          <label className="select-control"><Filter size={15} /><span className="sr-only">Filter by type</span><select aria-label="Filter by artifact type" onChange={(event) => setFilter(event.target.value as "all" | TraceNodeType)} value={filter}><option value="all">All artifact types</option>{Object.entries(nodeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <div className="toolbar-spacer" />
          <button className={criticalOnly ? "ghost-button ghost-button--active" : "ghost-button"} onClick={() => setCriticalOnly((active) => !active)} type="button"><Focus size={15} />Critical path</button>
          <button className="primary-button" onClick={exportGraph} type="button"><Download size={15} />Export evidence</button>
        </div>

        <div className="graph-layout">
          <div className="graph-canvas">
            {visibleNodes.length ? (
              <svg aria-labelledby="graph-title graph-desc" preserveAspectRatio="xMidYMid meet" role="img" viewBox="0 0 1000 540">
                <title id="graph-title">Traceability graph for the Aurora EV battery safety baseline</title>
                <desc id="graph-desc">A connected graph of requirements, components, tests, risks, and evidence. Select a node for details.</desc>
                <defs>
                  <marker id="arrow-verified" markerHeight="7" markerWidth="7" orient="auto" refX="6" refY="3.5"><path d="M0,0 L7,3.5 L0,7 Z" /></marker>
                  <marker id="arrow-inferred" markerHeight="7" markerWidth="7" orient="auto" refX="6" refY="3.5"><path d="M0,0 L7,3.5 L0,7 Z" /></marker>
                  <marker id="arrow-blocked" markerHeight="7" markerWidth="7" orient="auto" refX="6" refY="3.5"><path d="M0,0 L7,3.5 L0,7 Z" /></marker>
                </defs>
                <g className="graph-grid-lines">
                  {[80, 160, 240, 320, 400, 480].map((y) => <line key={`h-${y}`} x1="20" x2="980" y1={y} y2={y} />)}
                  {[120, 280, 440, 600, 760, 920].map((x) => <line key={`v-${x}`} x1={x} x2={x} y1="20" y2="520" />)}
                </g>
                <g className="graph-edges">
                  {visibleEdges.map((edge) => {
                    const from = data.nodes.find((node) => node.id === edge.from)!;
                    const to = data.nodes.find((node) => node.id === edge.to)!;
                    const highlighted = selected?.id === from.id || selected?.id === to.id;
                    return (
                      <g className={`${edge.kind} ${highlighted ? "is-highlighted" : ""}`} key={edge.id}>
                        <line markerEnd={`url(#arrow-${edge.kind})`} x1={from.x} x2={to.x} y1={from.y} y2={to.y} />
                        <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 7}>{edge.label}</text>
                      </g>
                    );
                  })}
                </g>
                <g className="graph-nodes">
                  {visibleNodes.map((node) => (
                    <g
                      aria-label={`${nodeLabels[node.type]} ${node.label}: ${node.subtitle}`}
                      className={`graph-node graph-node--${node.type} ${selected?.id === node.id ? "is-selected" : ""}`}
                      key={node.id}
                      onClick={() => chooseNode(node)}
                      onKeyDown={(event) => handleNodeKey(event, node)}
                      role="button"
                      tabIndex={0}
                      transform={`translate(${node.x - 72}, ${node.y - 31})`}
                    >
                      <rect height="62" rx="10" width="144" />
                      <circle className={`node-health node-health--${node.status}`} cx="128" cy="15" r="4" />
                      <text className="node-type" x="14" y="19">{nodeLabels[node.type].toUpperCase()}</text>
                      <text className="node-id" x="14" y="38">{node.label}</text>
                      <text className="node-subtitle" x="14" y="53">{node.subtitle}</text>
                    </g>
                  ))}
                </g>
              </svg>
            ) : (
              <div className="empty-state"><Search size={24} /><strong>No artifacts match</strong><span>Clear the search or change the artifact filter.</span></div>
            )}
            <div className="graph-legend">
              {Object.entries(nodeLabels).map(([type, label]) => <span key={type}><i className={`legend-dot legend-dot--${type}`} />{label}</span>)}
              <span><i className="legend-line legend-line--inferred" />Inferred</span>
            </div>
          </div>

          {selected ? (
            <aside className="artifact-inspector">
              <span className={`artifact-type artifact-type--${selected.type}`}>{nodeLabels[selected.type]}</span>
              <h2>{selected.id}</h2>
              <p>{selected.subtitle}</p>
              <div className="artifact-status"><ShieldCheck size={16} /><span>Integrity state</span><strong>{selected.status}</strong></div>
              <div className="inspector-section">
                <div><span>Controlled version</span><strong>{selected.id === "REQ-BMS-001" ? "v2" : "v1"}</strong></div>
                <div><span>Baseline</span><strong>2026.07</strong></div>
                <div><span>Corpus</span><strong>Aurora EV</strong></div>
              </div>
              <div className="coverage-block"><div><span>Baseline trace coverage</span><strong>{data.coverage}%</strong></div><ProgressBar label="Baseline trace coverage" tone="amber" value={data.coverage} /></div>
              <h3>Connected artifacts</h3>
              <div className="link-list">
                {selectedLinks.map((edge) => {
                  const relatedId = edge.from === selected.id ? edge.to : edge.from;
                  return <button key={edge.id} onClick={() => setSelectedId(relatedId)} type="button"><Link2 size={14} /><span><strong>{relatedId}</strong><small>{edge.label} · {edge.kind}</small></span></button>;
                })}
              </div>
            </aside>
          ) : null}
        </div>
      </article>
    </div>
  );
}
