import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Tone = "canvas" | "panel";

function invertClasses(tone: Tone, outline: boolean): string {
  if (outline) {
    return tone === "panel"
      ? "border border-dashed border-panel-ink text-panel-ink hover:bg-panel-ink hover:text-panel"
      : "border border-dashed border-ink text-ink hover:bg-ink hover:text-canvas";
  }
  return tone === "panel"
    ? "bg-panel-ink text-panel hover:bg-transparent hover:text-panel-ink hover:outline hover:outline-1 hover:outline-dashed hover:outline-panel-ink"
    : "bg-ink text-canvas hover:bg-transparent hover:text-ink hover:outline hover:outline-1 hover:outline-dashed hover:outline-ink";
}

const base =
  "inline-flex items-center justify-center px-4 py-3 font-mono text-[11px] font-semibold tracking-[0.16em] uppercase transition-colors disabled:opacity-40";

export function ActionButton({
  tone = "panel",
  outline = false,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: Tone;
  outline?: boolean;
}) {
  return (
    <button
      className={`${base} ${invertClasses(tone, outline)} ${className}`}
      {...props}
    />
  );
}

export function ActionLink({
  href,
  tone = "canvas",
  outline = false,
  className = "",
  children,
}: {
  href: string;
  tone?: Tone;
  outline?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const classNameFull = `${base} ${invertClasses(tone, outline)} ${className}`;
  if (href.startsWith("/api/") || href.startsWith("http://") || href.startsWith("https://")) {
    return (
      <a href={href} className={classNameFull}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={classNameFull}>
      {children}
    </Link>
  );
}

export function GoogleButton({
  returnTo,
  tone = "panel",
}: {
  returnTo?: string | null;
  tone?: Tone;
}) {
  const href = returnTo
    ? `/api/auth/google?return_to=${encodeURIComponent(returnTo)}`
    : "/api/auth/google";
  return (
    <a
      href={href}
      className={`${base} w-full ${invertClasses(tone, true)}`}
    >
      Continue with Google
    </a>
  );
}

export function TextLink({
  href,
  children,
  tone = "canvas",
}: {
  href: string;
  children: ReactNode;
  tone?: Tone;
}) {
  return (
    <Link
      href={href}
      className={`text-sm underline decoration-dashed underline-offset-4 ${
        tone === "panel" ? "text-panel-ink/80" : "text-muted"
      }`}
    >
      {children}
    </Link>
  );
}
