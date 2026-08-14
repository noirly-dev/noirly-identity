"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

async function getCsrf(): Promise<string> {
  const res = await fetch("/api/auth/csrf", { credentials: "include" });
  const data = (await res.json()) as { csrfToken: string };
  return data.csrfToken;
}

function ConsentForm() {
  const params = useSearchParams();
  const [csrf, setCsrf] = useState("");
  const [error, setError] = useState<string | null>(null);

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
      const data = (await res.json().catch(() => ({}))) as { message?: string; error_description?: string };
      setError(data.error_description || data.message || "Consent failed");
    }
  }

  async function onApprove(event: FormEvent) {
    event.preventDefault();
    await decide("approve");
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-6 py-16">
      <h1 className="text-2xl font-semibold">Authorize application</h1>
      <p className="text-sm text-zinc-600">
        <strong>{params.get("client_id")}</strong> requests access with scopes:{" "}
        <code>{params.get("scope")}</code>
      </p>
      <form className="flex gap-3" onSubmit={onApprove}>
        <button className="rounded bg-zinc-900 px-3 py-2 text-white" type="submit">
          Allow
        </button>
        <button
          className="rounded border px-3 py-2"
          type="button"
          onClick={() => void decide("deny")}
        >
          Deny
        </button>
      </form>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </main>
  );
}

export default function ConsentPage() {
  return (
    <Suspense fallback={<main className="p-8">Loading...</main>}>
      <ConsentForm />
    </Suspense>
  );
}
