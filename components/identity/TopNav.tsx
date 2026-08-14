import Link from "next/link";

type TopNavProps = {
  rightHref?: string;
  rightLabel?: string;
};

export function TopNav({ rightHref, rightLabel }: TopNavProps) {
  return (
    <header className="flex items-center justify-between gap-6 border-b border-dashed border-hairline px-5 py-5 md:px-10">
      <Link
        href="/"
        className="font-display text-lg font-bold tracking-[-0.04em] uppercase md:text-2xl"
      >
        Noirly Identity
      </Link>
      {rightHref && rightLabel ? (
        <Link
          href={rightHref}
          className="font-mono text-[11px] font-semibold tracking-[0.16em] uppercase transition-colors hover:bg-ink hover:text-canvas"
        >
          {rightLabel}
        </Link>
      ) : null}
    </header>
  );
}
