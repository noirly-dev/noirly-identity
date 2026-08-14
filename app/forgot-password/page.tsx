"use client";

import { FormEvent, useState } from "react";
import { EditorialShell, BusyOverlay, Notice } from "@/components/identity/EditorialShell";
import { Field } from "@/components/identity/Field";
import { ActionButton, TextLink } from "@/components/identity/Buttons";
import { DotMatrixClock } from "@/components/identity/DotMatrix";

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const form = new FormData(event.currentTarget);
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: form.get("email") }),
      });
      const data = (await res.json()) as { message?: string };
      setMessage(
        res.ok
          ? "If an account exists, a reset email has been sent."
          : data.message || "Unable to send reset email",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <EditorialShell
      label="Recovery"
      navRightHref="/login"
      navRightLabel="Sign in"
      left={
        <>
          <div>
            <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-muted">
              Credentials
            </p>
            <h1 className="text-perforated mt-4 font-display text-5xl leading-[0.9] font-bold tracking-[-0.05em] uppercase md:text-7xl">
              Forgot password
            </h1>
            <p className="mt-6 max-w-md text-base text-muted">
              Enter the email on your Noirly account. If it exists, we will send
              a reset link.
            </p>
          </div>
          <DotMatrixClock className="text-5xl md:text-7xl" />
        </>
      }
      right={
        <>
          {submitting ? <BusyOverlay label="Sending reset link" /> : null}
          <form className="flex flex-col gap-6" onSubmit={onSubmit}>
            <Field
              label="Email"
              name="email"
              type="email"
              placeholder="you@noirly.com"
              required
              autoComplete="email"
            />
            <ActionButton type="submit" busy={submitting} busyLabel="Sending">
              Send reset link
            </ActionButton>
          </form>
          {message ? <Notice>{message}</Notice> : null}
          <TextLink href="/login" tone="panel">
            Back to sign in
          </TextLink>
        </>
      }
    />
  );
}
