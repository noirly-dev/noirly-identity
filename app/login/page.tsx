"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getCsrf } from "@/lib/auth/csrf-client";
import { EditorialShell, Notice, ScreenFallback } from "@/components/identity/EditorialShell";
import { Field } from "@/components/identity/Field";
import { ActionButton, GoogleButton, TextLink } from "@/components/identity/Buttons";
import { OrDivider } from "@/components/identity/OrDivider";
import { DotMatrixClock } from "@/components/identity/DotMatrix";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("return_to");
  const [error, setError] = useState<string | null>(searchParams.get("error"));
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [csrf, setCsrf] = useState("");
  const [googleEnabled, setGoogleEnabled] = useState(false);

  useEffect(() => {
    void getCsrf().then(setCsrf);
    void fetch("/api/auth/oauth-providers")
      .then((res) => res.json() as Promise<{ google?: boolean }>)
      .then((data) => setGoogleEnabled(Boolean(data.google)))
      .catch(() => undefined);
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setUnverifiedEmail(null);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": csrf,
      },
      body: JSON.stringify({
        email,
        password: form.get("password"),
      }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { message?: string; error?: string };
      if (data.error === "email_not_verified") {
        setUnverifiedEmail(email.trim().toLowerCase());
        setError(
          data.message ?? "Please verify your email address before signing in.",
        );
        return;
      }
      setError(data.message ?? "Login failed");
      return;
    }
    router.push(returnTo || "/");
    router.refresh();
  }

  return (
    <EditorialShell
      label="Session"
      navRightHref="/register"
      navRightLabel="Register"
      left={
        <>
          <div>
            <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-muted">
              Access
            </p>
            <h1 className="text-perforated mt-4 font-display text-5xl leading-[0.9] font-bold tracking-[-0.05em] uppercase md:text-7xl">
              Sign in to Noirly
            </h1>
          </div>
          <DotMatrixClock className="text-6xl md:text-8xl" />
        </>
      }
      right={
        <>
          {googleEnabled ? (
            <>
              <GoogleButton returnTo={returnTo} />
              <OrDivider />
            </>
          ) : null}
          <form className="flex flex-col gap-6" onSubmit={onSubmit}>
            <Field
              label="Email"
              name="email"
              type="email"
              placeholder="you@noirly.com"
              required
              autoComplete="email"
            />
            <Field
              label="Password"
              name="password"
              type="password"
              placeholder="••••••••••"
              required
              autoComplete="current-password"
            />
            <ActionButton type="submit">Sign in</ActionButton>
          </form>
          {error ? <Notice>{error}</Notice> : null}
          {unverifiedEmail ? (
            <TextLink
              href={`/check-email?email=${encodeURIComponent(unverifiedEmail)}`}
              tone="panel"
            >
              Resend verification email
            </TextLink>
          ) : null}
          <div className="flex flex-wrap justify-between gap-3 font-mono text-[11px] tracking-[0.08em] uppercase">
            <TextLink href="/forgot-password" tone="panel">
              Forgot password?
            </TextLink>
            <TextLink href="/register" tone="panel">
              No account? Register
            </TextLink>
          </div>
        </>
      }
    />
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<ScreenFallback title="Loading" />}>
      <LoginForm />
    </Suspense>
  );
}
