export function OrDivider() {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 border-t border-[var(--hairline)]" />
      <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
        or
      </span>
      <span className="h-px flex-1 border-t border-[var(--hairline)]" />
    </div>
  );
}
