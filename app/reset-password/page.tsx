"use client";

import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuthShell } from "@noirly-dev/ui";
import {
  BusyOverlay,
  FormField,
  Notice,
  ScreenFallback,
  SubmitButton,
  TextLink,
} from "@/components/auth-ui";

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
    <AuthShell
      title="Reset password"
      lead="Choose a new password for your Noirly account."
      footer={
        <TextLink href="/login">
          {ok ? "Continue to sign in" : "Back to sign in"}
        </TextLink>
      }
    >
      {submitting ? <BusyOverlay label="Updating password" /> : null}
      <div className="flex flex-col gap-6">
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          {!tokenFromQuery ? (
            <FormField
              label="Reset token"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              required
            />
          ) : null}
          <FormField
            label="New password"
            name="newPassword"
            type="password"
            placeholder="••••••••••"
            required
            autoComplete="new-password"
          />
          <FormField
            label="Confirm password"
            name="confirmPassword"
            type="password"
            placeholder="••••••••••"
            required
            autoComplete="new-password"
          />
          <SubmitButton busy={submitting} busyLabel="Updating">
            Reset password
          </SubmitButton>
        </form>
        {message ? (
          <Notice tone={ok ? "success" : "error"}>{message}</Notice>
        ) : null}
      </div>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ScreenFallback title="Loading" />}>
      <ResetForm />
    </Suspense>
  );
}
