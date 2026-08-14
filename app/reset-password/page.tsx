"use client";

import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { EditorialShell, BusyOverlay, Notice, ScreenFallback } from "@/components/identity/EditorialShell";
import { Field } from "@/components/identity/Field";
import { ActionButton, TextLink } from "@/components/identity/Buttons";
import { DotMatrixClock } from "@/components/identity/DotMatrix";

function ResetForm() {
  const params = useSearchParams();
  const tokenFromQuery = params.get("token") ?? "";
  const [token, setToken] = useState(tokenFromQuery);
  const [message, setMessage] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get("newPassword") ?? "");
    const confirm = String(form.get("confirmPassword") ?? "");
    if (newPassword !== confirm) {
      setOk(false);
      setMessage("Passwords do not match");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token,
          newPassword,
        }),
      });
      const data = (await res.json()) as { message?: string };
      setOk(res.ok);
      setMessage(res.ok ? "Password updated" : data.message || "Reset failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <EditorialShell
      label="Security"
      navRightHref="/login"
      navRightLabel="Sign in"
      left={
        <>
          <div>
            <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-muted">
              Credentials
            </p>
            <h1 className="text-perforated mt-4 font-display text-5xl leading-[0.9] font-bold tracking-[-0.05em] uppercase md:text-7xl">
              Reset password
            </h1>
            <p className="mt-6 max-w-md text-base text-muted">
              Choose a new password for your Noirly account.
            </p>
          </div>
          <DotMatrixClock className="text-5xl md:text-7xl" />
        </>
      }
      right={
        <>
          {submitting ? <BusyOverlay label="Updating password" /> : null}
          <form className="flex flex-col gap-6" onSubmit={onSubmit}>
            {!tokenFromQuery ? (
              <Field
                label="Reset token"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                required
              />
            ) : null}
            <Field
              label="New password"
              name="newPassword"
              type="password"
              placeholder="••••••••••"
              required
              autoComplete="new-password"
            />
            <Field
              label="Confirm password"
              name="confirmPassword"
              type="password"
              placeholder="••••••••••"
              required
              autoComplete="new-password"
            />
            <ActionButton type="submit" busy={submitting} busyLabel="Updating">
              Reset password
            </ActionButton>
          </form>
          {message ? <Notice>{message}</Notice> : null}
          {ok ? (
            <TextLink href="/login" tone="panel">
              Continue to sign in
            </TextLink>
          ) : (
            <TextLink href="/login" tone="panel">
              Back to sign in
            </TextLink>
          )}
        </>
      }
    />
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ScreenFallback title="Loading" />}>
      <ResetForm />
    </Suspense>
  );
}
