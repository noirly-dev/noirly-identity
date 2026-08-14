"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { EditorialShell, BusyOverlay, Notice, ScreenFallback } from "@/components/identity/EditorialShell";
import { Field } from "@/components/identity/Field";
import { ActionButton, TextLink } from "@/components/identity/Buttons";
import { withReturnTo } from "@/lib/auth/return-to";
import { DotMatrixNumeral } from "@/components/identity/DotMatrix";

function maskEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  const at = normalized.indexOf("@");
  if (at <= 0) return "***";
  return `${normalized.slice(0, 1)}***@${normalized.slice(at + 1)}`;
}

function CheckEmailContent() {
  const params = useSearchParams();
  const emailFromQuery = params.get("email") ?? "";
  const returnTo = params.get("return_to");
  const [email, setEmail] = useState(emailFromQuery);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [sending, setSending] = useState(false);

  const masked = useMemo(() => (email ? maskEmail(email) : null), [email]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setInterval(() => {
      setCooldown((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [cooldown]);

  async function resend(event?: FormEvent) {
    event?.preventDefault();
    setError(null);
    setMessage(null);
    if (!email) {
      setError("Enter the email address you registered with.");
      return;
    }
    if (cooldown > 0 || sending) {
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as {
        message?: string;
        cooldownSeconds?: number;
        details?: { retryAfterSeconds?: number };
      };

      if (!res.ok) {
        if (res.status === 429) {
          const wait = data.details?.retryAfterSeconds ?? data.cooldownSeconds ?? 60;
          setCooldown(wait);
          setError(`Resend available in ${wait} seconds`);
          return;
        }
        setError(data.message ?? "Unable to resend verification email");
        return;
      }

      setMessage("Verification email sent. Please check your inbox.");
      setCooldown(data.cooldownSeconds ?? 60);
    } catch {
      setError("Unable to resend verification email");
    } finally {
      setSending(false);
    }
  }

  return (
    <EditorialShell
      label="Verify"
      navRightHref={withReturnTo("/login", returnTo)}
      navRightLabel="Sign in"
      left={
        <>
          <div>
            <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-muted">
              Inbox
            </p>
            <h1 className="text-perforated mt-4 font-display text-5xl leading-[0.9] font-bold tracking-[-0.05em] uppercase md:text-7xl">
              Check your email
            </h1>
            <p className="mt-6 max-w-md text-base text-muted">
              We&apos;ve sent a verification link
              {masked ? (
                <>
                  {" "}
                  to <span className="text-ink">{masked}</span>
                </>
              ) : (
                "."
              )}{" "}
              Click the button in the email to verify your account.
              After that you will return to the app that sent you here.
            </p>
          </div>
          <DotMatrixNumeral className="text-7xl md:text-9xl">
            {String(cooldown || 60).padStart(2, "0")}
          </DotMatrixNumeral>
        </>
      }
      right={
        <>
          {sending ? <BusyOverlay label="Sending verification email" /> : null}
          <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-panel-ink/55">
            Didn&apos;t receive it?
          </p>
          <form className="flex flex-col gap-6" onSubmit={resend}>
            {!emailFromQuery ? (
              <Field
                label="Email address"
                type="email"
                placeholder="you@noirly.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            ) : null}
            <ActionButton type="submit" busy={sending} disabled={cooldown > 0} busyLabel="Sending">
              {cooldown > 0
                ? `Resend available in ${cooldown}s`
                : "Resend verification email"}
            </ActionButton>
          </form>
          {message ? <Notice>{message}</Notice> : null}
          {error ? <Notice>{error}</Notice> : null}
          <TextLink href={withReturnTo("/login", returnTo)} tone="panel">
            Already verified? Sign in
          </TextLink>
        </>
      }
    />
  );
}

export default function CheckEmailPage() {
  return (
    <Suspense fallback={<ScreenFallback title="Loading" />}>
      <CheckEmailContent />
    </Suspense>
  );
}
