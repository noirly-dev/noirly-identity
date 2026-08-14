"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getCsrf } from "@/lib/auth/csrf-client";
import { EditorialShell, Notice, ScreenFallback } from "@/components/identity/EditorialShell";
import { ActionButton } from "@/components/identity/Buttons";
import { DotMatrixNumeral } from "@/components/identity/DotMatrix";

function ConsentForm() {
  const params = useSearchParams();
  const [csrf, setCsrf] = useState("");
  const [error, setError] = useState<string | null>(null);
  const clientId = params.get("client_id") ?? "unknown-client";
  const redirectUri = params.get("redirect_uri") ?? "";
  const scopes = useMemo(
    () =>
      (params.get("scope") ?? "")
        .split(/\s+/)
        .map((scope) => scope.trim())
        .filter(Boolean),
    [params],
  );

  useEffect(() => {
    void getCsrf().then(setCsrf);
  }, []);

  async function decide(decision: "approve" | "deny") {
    setError(null);
    const res = await fetch("/api/oauth/consent", {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": csrf,
      },
      body: JSON.stringify({
        client_id: params.get("client_id"),
        redirect_uri: params.get("redirect_uri"),
        scope: params.get("scope"),
        state: params.get("state"),
        code_challenge: params.get("code_challenge") || undefined,
        code_challenge_method: params.get("code_challenge_method") || undefined,
        nonce: params.get("nonce") || undefined,
        decision,
      }),
      redirect: "manual",
    });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (location) {
        window.location.href = location;
        return;
      }
    }

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as {
        message?: string;
        error_description?: string;
      };
      setError(data.error_description || data.message || "Consent failed");
    }
  }

  async function onApprove(event: FormEvent) {
    event.preventDefault();
    await decide("approve");
  }

  return (
    <EditorialShell
      label="OAuth 2.0"
      left={
        <>
          <div>
            <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-muted">
              Authorization
            </p>
            <h1 className="text-perforated mt-4 font-display text-5xl leading-[0.9] font-bold tracking-[-0.05em] uppercase md:text-6xl">
              Authorize application
            </h1>
            <p className="mt-6 max-w-md text-base text-muted">
              <span className="text-ink">{clientId}</span> requests access to
              your Noirly Identity account.
            </p>
            <div className="mt-8 flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-hairline font-mono text-[10px] tracking-[0.14em] uppercase">
              App
            </div>
          </div>
          <p className="font-mono text-[10px] tracking-[0.12em] break-all uppercase text-muted">
            {redirectUri}
          </p>
        </>
      }
      right={
        <>
          <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-panel-ink/55">
            Requested scopes
          </p>
          <ul className="flex flex-col">
            {(scopes.length ? scopes : ["openid"]).map((scope, index) => (
              <li
                key={scope}
                className="flex items-baseline justify-between gap-4 border-b border-dashed border-panel-ink/25 py-4"
              >
                <DotMatrixNumeral className="text-2xl">
                  {String(index + 1).padStart(2, "0")}
                </DotMatrixNumeral>
                <span className="font-mono text-sm tracking-[0.08em] uppercase">
                  {scope}
                </span>
              </li>
            ))}
          </ul>
          <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={onApprove}>
            <ActionButton className="flex-1" type="submit">
              Allow
            </ActionButton>
            <ActionButton
              className="flex-1"
              type="button"
              outline
              onClick={() => void decide("deny")}
            >
              Deny
            </ActionButton>
          </form>
          {error ? <Notice>{error}</Notice> : null}
          <p className="font-mono text-[10px] tracking-[0.12em] uppercase text-panel-ink/45">
            client_id {clientId}
          </p>
        </>
      }
    />
  );
}

export default function ConsentPage() {
  return (
    <Suspense fallback={<ScreenFallback title="Loading" />}>
      <ConsentForm />
    </Suspense>
  );
}
