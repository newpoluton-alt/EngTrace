"use client";

import {
  BookOpenCheck,
  Check,
  CheckCircle2,
  Clipboard,
  Clock3,
  FileText,
  MessageSquareText,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { useState } from "react";

import type { IntelligenceAnswer } from "@/types";

interface IntelligencePanelProps {
  data: IntelligenceAnswer;
  promptOverride?: string;
}

export function IntelligencePanel({ data, promptOverride }: IntelligencePanelProps) {
  const [selectedCitation, setSelectedCitation] = useState(data.citations[0]?.id ?? 1);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const activeCitation = data.citations.find((citation) => citation.id === selectedCitation) ?? data.citations[0];
  const displayQuestion = promptOverride || data.question;

  const copyAnswer = async () => {
    const findings = data.findings.map((finding) => finding.text).join("\n");
    await navigator.clipboard.writeText(`${displayQuestion}\n\n${data.summary}\n\n${findings}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="intelligence-stack">
      <div className="answer-query panel">
        <div className="query-icon"><MessageSquareText size={20} /></div>
        <div>
          <span className="section-kicker">Engineering question</span>
          <h2>{displayQuestion}</h2>
          {promptOverride ? <p>Showing the closest evidence-grounded scenario in this synthetic workspace.</p> : null}
        </div>
        <button className="ghost-button" type="button"><RefreshCw size={15} />New analysis</button>
      </div>

      <div className="intelligence-grid">
        <article className="panel answer-card">
          <div className="answer-meta">
            <span className="ai-label"><Sparkles size={15} />EngTrace answer</span>
            <div><span className="confidence-pill"><CheckCircle2 size={14} />{data.confidence}% confidence</span><span className="subtle-label">{data.generatedAt}</span></div>
          </div>

          <p className="answer-lead">{data.summary}</p>

          <div className="finding-list">
            {data.findings.map((finding, index) => (
              <div className="finding" key={finding.text}>
                <span className="finding-number">{String(index + 1).padStart(2, "0")}</span>
                <p>
                  {finding.text}{" "}
                  <span className="inline-citations">
                    {finding.citations.map((citationId) => (
                      <button
                        aria-label={`Open citation ${citationId}`}
                        className={selectedCitation === citationId ? "citation-marker citation-marker--active" : "citation-marker"}
                        key={citationId}
                        onClick={() => setSelectedCitation(citationId)}
                        type="button"
                      >
                        {citationId}
                      </button>
                    ))}
                  </span>
                </p>
              </div>
            ))}
          </div>

          <div className="answer-guard">
            <ShieldCheck size={19} />
            <div><strong>Answer guard passed</strong><span>All decision-bearing claims have version-pinned citations. No untrusted source instructions were followed.</span></div>
          </div>

          <div className="answer-footer">
            <div><button aria-label="Mark answer helpful" className={feedback === "up" ? "icon-button is-active" : "icon-button"} onClick={() => setFeedback("up")} type="button"><ThumbsUp size={16} /></button><button aria-label="Mark answer not helpful" className={feedback === "down" ? "icon-button is-active" : "icon-button"} onClick={() => setFeedback("down")} type="button"><ThumbsDown size={16} /></button></div>
            <button className="ghost-button" onClick={copyAnswer} type="button">{copied ? <Check size={15} /> : <Clipboard size={15} />}{copied ? "Copied" : "Copy answer"}</button>
          </div>
        </article>

        <aside className="panel evidence-panel">
          <div className="panel-heading evidence-heading">
            <div><span className="section-kicker">Source set</span><h2>Evidence cited</h2></div>
            <span className="citation-count">{data.citations.length}</span>
          </div>
          <div className="citation-list">
            {data.citations.map((citation) => (
              <button
                className={selectedCitation === citation.id ? "citation-item citation-item--active" : "citation-item"}
                key={citation.id}
                onClick={() => setSelectedCitation(citation.id)}
                type="button"
              >
                <span className="citation-index">{citation.id}</span>
                <span><strong>{citation.document}</strong><small>{citation.version}{citation.page ? ` · p. ${citation.page}` : ""}</small></span>
                <span className="relevance-score">{citation.relevance}%</span>
              </button>
            ))}
          </div>

          {activeCitation ? (
            <div className="citation-preview">
              <div className="preview-label"><BookOpenCheck size={16} /><span>{activeCitation.section}</span></div>
              <blockquote>“{activeCitation.excerpt}”</blockquote>
              <div className="preview-meta"><span><FileText size={13} />Controlled source</span><span><Clock3 size={13} />Verified {activeCitation.verifiedAt}</span></div>
              <button className="text-button" type="button">Open controlled source</button>
            </div>
          ) : null}

          <div className="retrieval-meta">
            <div><span>Pipeline</span><strong>{data.model}</strong></div>
            <div><span>Retrieval</span><strong>{data.retrieval}</strong></div>
          </div>
        </aside>
      </div>
    </div>
  );
}
