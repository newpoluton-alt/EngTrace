import type { CSSProperties } from "react";

interface SparklineProps {
  values: number[];
  className?: string;
  label?: string;
}

function toPoints(values: number[], width = 120, height = 40): string {
  if (values.length < 2) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - min) / range) * (height - 8) - 4;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function Sparkline({ values, className = "", label = "Trend" }: SparklineProps) {
  const points = toPoints(values);
  const area = points ? `0,40 ${points} 120,40` : "";

  return (
    <svg
      aria-label={label}
      className={`sparkline ${className}`}
      preserveAspectRatio="none"
      role="img"
      viewBox="0 0 120 40"
    >
      <defs>
        <linearGradient id={`spark-${values.join("-")}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.2" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon fill={`url(#spark-${values.join("-")})`} points={area} />
      <polyline fill="none" points={points} stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

interface ProgressRingProps {
  value: number;
  label: string;
  caption?: string;
}

export function ProgressRing({ value, label, caption }: ProgressRingProps) {
  const style = { "--progress": `${Math.max(0, Math.min(100, value)) * 3.6}deg` } as CSSProperties;

  return (
    <div aria-label={`${label}: ${value}%`} className="progress-ring" role="img" style={style}>
      <div className="progress-ring__inner">
        <strong>{value}%</strong>
        <span>{caption ?? label}</span>
      </div>
    </div>
  );
}

interface BarProps {
  value: number;
  max?: number;
  tone?: "teal" | "amber" | "red" | "blue";
  label: string;
}

export function ProgressBar({ value, max = 100, tone = "teal", label }: BarProps) {
  const width = `${Math.max(0, Math.min(100, (value / max) * 100))}%`;
  return (
    <div aria-label={`${label}: ${value} of ${max}`} className="progress-bar" role="img">
      <span className={`progress-bar__fill progress-bar__fill--${tone}`} style={{ width }} />
    </div>
  );
}
