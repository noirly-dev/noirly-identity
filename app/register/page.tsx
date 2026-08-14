"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCsrf } from "@/lib/auth/csrf-client";
import { EditorialShell, Notice } from "@/components/identity/EditorialShell";
import { Field } from "@/components/identity/Field";
import { ActionButton, GoogleButton, TextLink } from "@/components/identity/Buttons";
import { OrDivider } from "@/components/identity/OrDivider";
import { DotMatrixNumeral } from "@/components/identity/DotMatrix";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
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
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": csrf,
      },
      body: JSON.stringify({
        email,
        password: form.get("password"),
        firstName: form.get("firstName"),
        lastName: form.get("lastName"),
      }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { message?: string };
      setError(data.message ?? "Registration failed");
      return;
    }
    router.push(`/check-email?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    router.refresh();
  }

  return (
    <EditorialShell
      label="Register"
      navRightHref="/login"
      navRightLabel="Sign in"
      left={
        <>
          <div>
            <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-muted">
              Provision
            </p>
            <h1 className="text-perforated mt-4 font-display text-5xl leading-[0.9] font-bold tracking-[-0.05em] uppercase md:text-7xl">
              Create Noirly account
            </h1>
            <p className="mt-6 max-w-md text-base text-muted">
              One Noirly identity across Flow, CRM, Docs, and the rest of the
              ecosystem.
            </p>
          </div>
          <DotMatrixNumeral className="text-7xl md:text-8xl">01</DotMatrixNumeral>
        </>
      }
      right={
        <>
          {googleEnabled ? (
            <>
              <GoogleButton />
              <OrDivider />
            </>
          ) : null}
          <form className="flex flex-col gap-5" onSubmit={onSubmit}>
            <Field label="First name" name="firstName" placeholder="Ada" required autoComplete="given-name" />
            <Field label="Last name" name="lastName" placeholder="Lovelace" required autoComplete="family-name" />
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
              autoComplete="new-password"
            />
            <ActionButton type="submit">Register</ActionButton>
          </form>
          {error ? <Notice>{error}</Notice> : null}
          <TextLink href="/login" tone="panel">
            Already have an account? Sign in
          </TextLink>
        </>
      }
    />
  );
}
