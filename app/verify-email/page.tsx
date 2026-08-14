"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { TopNav } from "@/components/identity/TopNav";
import { VerticalLabel } from "@/components/identity/VerticalLabel";
import { ActionLink } from "@/components/identity/Buttons";
import { DotMatrixNumeral } from "@/components/identity/DotMatrix";
import { ScreenFallback } from "@/components/identity/EditorialShell";

type VerifyStatus =
  | "loading"
  | "verified"
  | "already_verified"
  | "invalid"
  | "expired"
  | "used"
  | "missing";

const copy: Record<
  Exclude<VerifyStatus, "loading">,
  { title: string; body: string; cta: string; href: string; code: string }
> = {
  verified: {
    title: "Email verified",
    body: "Your Noirly account has been successfully verified.",
    cta: "Continue to Noirly",
    href: "/login",
    code: "OK",
  },
  already_verified: {
    title: "Already verified",
    body: "Your email address has already been verified.",
    cta: "Continue to Noirly",
    href: "/login",
    code: "01",
  },
  expired: {
    title: "Link expired",
    body: "This verification link has expired.",
    cta: "Send a new verification email",
    href: "/check-email",
    code: "--",
  },
  invalid: {
    title: "Link invalid",
    body: "This verification link is invalid or has already been used.",
    cta: "Send a new verification email",
    href: "/check-email",
    code: "--",
  },
  used: {
    title: "Link used",
    body: "This verification link has already been used.",
    cta: "Send a new verification email",
    href: "/check-email",
    code: "--",
  },
  missing: {
    title: "Link missing",
    body: "This verification link is invalid or has already been used.",
    cta: "Send a new verification email",
    href: "/check-email",
    code: "--",
  },
};

function VerifyFrame({
  title,
  body,
  code,
  cta,
  href,
}: {
  title: string;
  body: string;
  code: string;
  cta: string;
  href: string;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <TopNav rightHref="/login" rightLabel="Sign in" />
      <div className="flex flex-1 flex-col lg:flex-row">
        <VerticalLabel>Status</VerticalLabel>
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <section className="px-5 py-10 md:px-12">
            <DotMatrixNumeral className="text-7xl md:text-9xl">{code}</DotMatrixNumeral>
          </section>
          <section className="bg-panel px-5 py-12 text-panel-ink md:px-12 md:py-16">
            <h1 className="text-perforated font-display text-5xl leading-[0.9] font-bold tracking-[-0.05em] uppercase md:text-7xl">
              {title}
            </h1>
            <p className="mt-6 max-w-xl text-base text-panel-ink/70">{body}</p>
            <div className="mt-10 flex flex-wrap gap-3">
              <ActionLink href={href} tone="panel">
                {cta}
              </ActionLink>
              <ActionLink href="/login" tone="panel" outline>
                Sign in
              </ActionLink>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function VerifyContent() {
  const params = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<VerifyStatus>(token ? "loading" : "missing");
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) {
      return;
    }
    started.current = true;

    void (async () => {
      try {
        const res = await fetch(
          `/api/auth/verify-email?token=${encodeURIComponent(token)}`,
          { method: "GET", credentials: "include" },
        );
        const data = (await res.json()) as { status?: VerifyStatus };
        if (
          data.status === "verified" ||
          data.status === "already_verified" ||
          data.status === "expired" ||
          data.status === "used" ||
          data.status === "invalid"
        ) {
          setStatus(data.status);
          return;
        }
        setStatus(res.ok ? "verified" : "invalid");
      } catch {
        setStatus("invalid");
      }
    })();
  }, [token]);

  if (status === "loading") {
    return (
      <VerifyFrame
        title="Verifying your email"
        body="Please wait."
        code=".."
        cta="Sign in"
        href="/login"
      />
    );
  }

  const view = copy[status];
  return (
    <VerifyFrame
      title={view.title}
      body={view.body}
      code={view.code}
      cta={view.cta}
      href={view.href}
    />
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<ScreenFallback title="Verifying your email" />}>
      <VerifyContent />
    </Suspense>
  );
}
