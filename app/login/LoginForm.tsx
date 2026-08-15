"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getCsrf } from "@/lib/auth/csrf-client";
import { goReturnTo, isPopupLogin, withPopup, withReturnTo } from "@/lib/auth/return-to";
import { forgetEmail, listRecentEmails, rememberEmail } from "@/lib/auth/recent-emails";
import {
  EditorialShell,
  PopupAuthShell,
  BusyOverlay,
  Notice,
  ScreenFallback,
} from "@/components/identity/EditorialShell";
import { Field } from "@/components/identity/Field";
import { ActionButton, GoogleButton, TextLink } from "@/components/identity/Buttons";
import { GoogleOneTap } from "@/components/identity/GoogleOneTap";
import { OrDivider } from "@/components/identity/OrDivider";
import { DotMatrixClock } from "@/components/identity/DotMatrix";

export function LoginForm({
  popup = false,
  currentEmail = null,
  selectAccount = false,
}: {
  popup?: boolean;
  currentEmail?: string | null;
  selectAccount?: boolean;
}) {
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("return_to");
  const compact = popup || isPopupLogin(searchParams.get("popup"));
  const [error, setError] = useState<string | null>(searchParams.get("error"));
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [csrf, setCsrf] = useState("");
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const [recentEmails, setRecentEmails] = useState<string[]>([]);
  const [email, setEmail] = useState(currentEmail ?? "");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void getCsrf().then(setCsrf);
    if (currentEmail) rememberEmail(currentEmail);
    setRecentEmails(listRecentEmails());
    void fetch("/api/auth/oauth-providers")
      .then((res) => res.json() as Promise<{ google?: boolean; googleClientId?: string | null }>)
      .then((data) => {
        setGoogleEnabled(Boolean(data.google));
        setGoogleClientId(data.googleClientId ?? null);
      })
      .catch(() => undefined);
  }, [currentEmail]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setUnverifiedEmail(null);
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    const submittedEmail = String(form.get("email") ?? email);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": csrf,
        },
        body: JSON.stringify({
          email: submittedEmail,
          password: form.get("password"),
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { message?: string; error?: string };
        if (data.error === "email_not_verified") {
          setUnverifiedEmail(submittedEmail.trim().toLowerCase());
          setError(
            data.message ?? "Please verify your email address before signing in.",
          );
        } else {
          setError(data.message ?? "Login failed");
        }
        setSubmitting(false);
        return;
      }
      rememberEmail(submittedEmail);
      goReturnTo(returnTo ?? "/account");
    } catch {
      setError("Login failed");
      setSubmitting(false);
    }
  }

  const registerHref = withPopup(withReturnTo("/register", returnTo), compact);
  const googleBlock =
    googleEnabled && googleClientId ? (
      <>
        <GoogleOneTap
          clientId={googleClientId}
          returnTo={returnTo}
          popup={compact}
          autoPrompt={!selectAccount}
        />
        <OrDivider />
      </>
    ) : googleEnabled ? (
      <>
        <GoogleButton returnTo={returnTo ?? "/account"} />
        <OrDivider />
      </>
    ) : null;

  const accountsBlock =
    recentEmails.length > 0 || currentEmail ? (
      <div className="flex flex-col gap-2">
        <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-panel-ink/55">
          {selectAccount ? "Choose an account" : "Accounts on this device"}
        </p>
        {currentEmail && selectAccount ? (
          <button
            type="button"
            className="border border-dashed border-panel-ink px-3 py-3 text-left"
            onClick={() => goReturnTo(returnTo ?? "/account")}
          >
            <span className="block font-mono text-[10px] tracking-[0.14em] uppercase text-panel-ink/55">
              Continue as
            </span>
            <span className="mt-1 block truncate text-sm">{currentEmail}</span>
          </button>
        ) : null}
        {recentEmails.map((item) => {
          const googleHref = withReturnTo(
            `/api/auth/google?login_hint=${encodeURIComponent(item)}`,
            returnTo,
          );
          const isCurrent = currentEmail === item;
          return (
            <div
              key={item}
              className="flex items-center gap-2 border border-dashed border-panel-ink/35 px-3 py-2"
            >
              <button
                type="button"
                className="min-w-0 flex-1 truncate text-left text-sm"
                onClick={() => {
                  if (selectAccount && isCurrent) {
                    goReturnTo(returnTo ?? "/account");
                    return;
                  }
                  setEmail(item);
                }}
              >
                {item}
                {isCurrent ? (
                  <span className="ml-2 font-mono text-[10px] tracking-[0.12em] uppercase text-panel-ink/50">
                    current
                  </span>
                ) : null}
              </button>
              {googleEnabled ? (
                <a
                  href={googleHref}
                  className="shrink-0 font-mono text-[10px] tracking-[0.12em] uppercase text-panel-ink/70 underline decoration-dashed underline-offset-4"
                >
                  Google
                </a>
              ) : null}
              <button
                type="button"
                aria-label={`Remove ${item}`}
                className="shrink-0 font-mono text-[11px] uppercase text-panel-ink/50 hover:text-panel-ink"
                onClick={() => setRecentEmails(forgetEmail(item))}
              >
                ×
              </button>
            </div>
          );
        })}
        <OrDivider />
      </div>
    ) : null;

  const panel = (
    <>
      {submitting ? <BusyOverlay label="Signing in" /> : null}
      {selectAccount ? (
        <>
          {accountsBlock}
          {googleBlock}
        </>
      ) : (
        <>
          {googleBlock}
          {accountsBlock}
        </>
      )}
      <form className="flex flex-col gap-6" onSubmit={onSubmit}>
        <Field
          label="Email"
          name="email"
          type="email"
          placeholder="you@noirly.com"
          required
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Field
          label="Password"
          name="password"
          type="password"
          placeholder="••••••••••"
          required
          autoComplete="current-password"
        />
        <ActionButton type="submit" busy={submitting} busyLabel="Signing in">
          Sign in
        </ActionButton>
      </form>
      {error ? <Notice>{error}</Notice> : null}
      {unverifiedEmail ? (
        <TextLink
          href={withPopup(
            withReturnTo(
              `/check-email?email=${encodeURIComponent(unverifiedEmail)}`,
              returnTo,
            ),
            compact,
          )}
          tone="panel"
        >
          Resend verification email
        </TextLink>
      ) : null}
      <div className="flex flex-wrap justify-between gap-3 font-mono text-[11px] tracking-[0.08em] uppercase">
        <TextLink href={withPopup("/forgot-password", compact)} tone="panel">
          Forgot password?
        </TextLink>
        <TextLink href={registerHref} tone="panel">
          No account? Register
        </TextLink>
      </div>
    </>
  );

  if (compact) {
    return (
      <PopupAuthShell
        eyebrow="Access"
        title={selectAccount ? "Choose account" : "Sign in"}
        navRightHref={registerHref}
        navRightLabel="Register"
      >
        {panel}
      </PopupAuthShell>
    );
  }

  return (
    <EditorialShell
      label="Session"
      navRightHref={registerHref}
      navRightLabel="Register"
      left={
        <>
          <div>
            <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-muted">
              Access
            </p>
            <h1 className="text-perforated mt-4 font-display text-5xl leading-[0.9] font-bold tracking-[-0.05em] uppercase md:text-7xl">
              {selectAccount ? "Choose a Noirly account" : "Sign in to Noirly"}
            </h1>
          </div>
          <DotMatrixClock className="text-6xl md:text-8xl" />
        </>
      }
      right={panel}
    />
  );
}

export function LoginPageClient({
  popup = false,
  currentEmail = null,
  selectAccount = false,
}: {
  popup?: boolean;
  currentEmail?: string | null;
  selectAccount?: boolean;
}) {
  return (
    <Suspense fallback={<ScreenFallback title="Loading" />}>
      <LoginForm
        popup={popup}
        currentEmail={currentEmail}
        selectAccount={selectAccount}
      />
    </Suspense>
  );
}
