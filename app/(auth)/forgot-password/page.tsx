"use client";

import { FormEvent, useState } from "react";
import { AuthShell } from "@noirly-dev/ui";
import { AuthLogo } from "@/components/AuthLogo";
import {
  BusyOverlay,
  FormField,
  Notice,
  SubmitButton,
  TextLink,
} from "@/components/auth-ui";

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
    <AuthShell
      logo={<AuthLogo />}
      title="Forgot password"
      lead="Enter the email on your Noirly account. If it exists, we will send a reset link."
      footer={<TextLink href="/login">Back to sign in</TextLink>}
    >
      {submitting ? <BusyOverlay label="Sending reset link" /> : null}
      <div className="flex flex-col gap-6">
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <FormField
            label="Email"
            name="email"
            type="email"
            placeholder="you@noirly.com"
            required
            autoComplete="email"
          />
          <SubmitButton busy={submitting} busyLabel="Sending">
            Send reset link
          </SubmitButton>
        </form>
        {message ? (
          <Notice tone={message.includes("sent") ? "success" : "error"}>
            {message}
          </Notice>
        ) : null}
      </div>
    </AuthShell>
  );
}
