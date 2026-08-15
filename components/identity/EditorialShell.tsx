import type { ReactNode } from "react";
import { TopNav } from "@/components/identity/TopNav";
import { VerticalLabel } from "@/components/identity/VerticalLabel";

type EditorialShellProps = {
  label: string;
  navRightHref?: string;
  navRightLabel?: string;
  left: ReactNode;
  right: ReactNode;
  rightTone?: "panel" | "canvas";
};

export function EditorialShell({
  label,
  navRightHref,
  navRightLabel,
  left,
  right,
  rightTone = "panel",
}: EditorialShellProps) {
  const rightClasses =
    rightTone === "panel"
      ? "bg-panel text-panel-ink"
      : "bg-canvas text-ink border-t border-dashed border-hairline lg:border-t-0 lg:border-l";

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <TopNav rightHref={navRightHref} rightLabel={navRightLabel} />
      <div className="relative flex min-h-0 flex-1 flex-col lg:flex-row">
        <VerticalLabel>{label}</VerticalLabel>
        <section className="flex flex-1 flex-col justify-between gap-12 px-5 py-10 md:px-12 md:py-16">
          {left}
        </section>
        <section
          className={`flex w-full flex-col justify-center gap-6 px-5 py-10 md:px-12 md:py-16 lg:w-[42%] lg:max-w-xl ${rightClasses}`}
        >
          {right}
        </section>
      </div>
    </div>
  );
}

export function PopupAuthShell({
  eyebrow,
  title,
  navRightHref,
  navRightLabel,
  children,
}: {
  eyebrow: string;
  title: string;
  navRightHref?: string;
  navRightLabel?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-panel text-panel-ink">
      <TopNav rightHref={navRightHref} rightLabel={navRightLabel} />
      <div className="flex flex-1 flex-col gap-6 px-5 py-8">
        <div>
          <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-panel-ink/55">
            {eyebrow}
          </p>
          <h1 className="mt-3 font-display text-4xl leading-[0.9] font-bold tracking-[-0.05em] uppercase">
            {title}
          </h1>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ScreenFallback({ title }: { title: string }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <TopNav />
      <main className="flex flex-1 flex-col justify-center px-5 py-16 md:px-12">
        <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-muted">
          Status
        </p>
        <h1 className="mt-4 font-display text-4xl font-bold tracking-[-0.04em] uppercase">
          {title}
        </h1>
      </main>
    </div>
  );
}

export function BusyOverlay({ label = "Working" }: { label?: string }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/85"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-5 px-6">
        <span className="busy-dots font-mono text-4xl font-bold tracking-[0.45em] text-ink">
          ···
        </span>
        <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-muted">
          {label}
        </p>
      </div>
    </div>
  );
}

export function Notice({
  children,
  tone = "panel",
}: {
  children: ReactNode;
  tone?: "canvas" | "panel";
}) {
  return (
    <p
      role="alert"
      className={`border border-dashed px-3 py-2 text-sm ${
        tone === "panel"
          ? "border-panel-ink/40 text-panel-ink"
          : "border-ink/40 text-ink"
      }`}
    >
      {children}
    </p>
  );
}
