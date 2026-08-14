export function OrDivider({ tone = "panel" }: { tone?: "canvas" | "panel" }) {
  const line = tone === "panel" ? "border-panel-ink/30" : "border-ink/30";
  const text = tone === "panel" ? "text-panel-ink/50" : "text-muted";
  return (
    <div className="flex items-center gap-3">
      <span className={`h-px flex-1 border-t border-dashed ${line}`} />
      <span className={`font-mono text-[10px] tracking-[0.2em] uppercase ${text}`}>
        or
      </span>
      <span className={`h-px flex-1 border-t border-dashed ${line}`} />
    </div>
  );
}
