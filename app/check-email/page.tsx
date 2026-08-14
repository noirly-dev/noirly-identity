"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

function maskEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  const at = normalized.indexOf("@");
  if (at <= 0) return "***";
  return `${normalized.slice(0, 1)}***@${normalized.slice(at + 1)}`;
}

function CheckEmailContent() {
  const params = useSearchParams();
  const emailFromQuery = params.get("email") ?? "";
  const [email, setEmail] = useState(emailFromQuery);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [sending, setSending] = useState(false);

  const masked = useMemo(
    () => (email ? maskEmail(email) : null),
    [email],
  );

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
          const wait =
            data.details?.retryAfterSeconds ?? data.cooldownSeconds ?? 60;
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
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-6 py-16">
      <h1 className="text-2xl font-semibold">Check your email</h1>
      <p className="text-zinc-600">
        We&apos;ve sent a verification link
        {masked ? (
          <>
            {" "}
            to: <strong>{masked}</strong>
          </>
        ) : (
          "."
        )}
      </p>
      <p className="text-zinc-600">
        Click the button in the email to verify your account.
      </p>

      <div className="mt-4 space-y-3 border-t pt-4">
        <p className="text-sm text-zinc-600">Didn&apos;t receive it?</p>
        <form className="flex flex-col gap-3" onSubmit={resend}>
          {!emailFromQuery ? (
            <input
              className="rounded border px-3 py-2"
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          ) : null}
          <button
            className="rounded bg-zinc-900 px-3 py-2 text-white disabled:opacity-50"
            type="submit"
            disabled={sending || cooldown > 0}
          >
            {cooldown > 0
              ? `Resend available in ${cooldown} seconds`
              : sending
                ? "Sending..."
                : "Resend verification email"}
          </button>
        </form>
        {message ? <p className="text-sm text-green-700">{message}</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>

      <p className="text-sm text-zinc-600">
        Already verified? <Link href="/login">Sign in</Link>
      </p>
    </main>
  );
}

export default function CheckEmailPage() {
  return (
    <Suspense fallback={<main className="p-8">Loading...</main>}>
      <CheckEmailContent />
    </Suspense>
  );
}
