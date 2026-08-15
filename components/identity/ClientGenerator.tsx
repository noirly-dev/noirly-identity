"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { getCsrf } from "@/lib/auth/csrf-client";
import { slugifyClientId, urisFromOrigins } from "@/lib/oauth/app-origins";
import type { PublicOAuthClient } from "@/types";
import {
  EditorialShell,
  BusyOverlay,
  Notice,
} from "@/components/identity/EditorialShell";
import { Field, TextArea } from "@/components/identity/Field";
import { ActionButton, TextLink } from "@/components/identity/Buttons";
import { DotMatrixClock } from "@/components/identity/DotMatrix";

type Props = {
  issuer: string;
  initialClients: PublicOAuthClient[];
};

type RegisterResponse = {
  client?: PublicOAuthClient;
  clientSecret?: string | null;
  created?: boolean;
  message?: string;
};

function parseOrigins(value: string): string[] {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function envSnippet(issuer: string, clientId: string, secret: string): string {
  return [
    `AUTH_NOIRLY_ISSUER=${issuer}`,
    `AUTH_NOIRLY_CLIENT_ID=${clientId}`,
    `AUTH_NOIRLY_CLIENT_SECRET=${secret}`,
  ].join("\n");
}

export function ClientGenerator({ issuer, initialClients }: Props) {
  const [csrf, setCsrf] = useState("");
  const [clients, setClients] = useState(initialClients);
  const [name, setName] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientIdTouched, setClientIdTouched] = useState(false);
  const [originsText, setOriginsText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [issued, setIssued] = useState<{ clientId: string; secret: string } | null>(
    null,
  );
  const [busy, setBusy] = useState<"register" | "rotate" | "disable" | null>(null);

  useEffect(() => {
    void getCsrf().then(setCsrf);
  }, []);

  const derivedId = slugifyClientId(name);
  const effectiveId = (clientIdTouched ? clientId : derivedId) || clientId;
  const preview = useMemo(() => {
    try {
      const origins = parseOrigins(originsText);
      if (!origins.length) return null;
      return urisFromOrigins(origins);
    } catch {
      return null;
    }
  }, [originsText]);

  async function adminFetch(url: string, init: RequestInit) {
    return fetch(url, {
      ...init,
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": csrf,
        ...(init.headers ?? {}),
      },
    });
  }

  async function onRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setIssued(null);
    setBusy("register");
    try {
      const res = await adminFetch("/api/admin/clients", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          clientId: effectiveId.trim(),
          origins: parseOrigins(originsText),
        }),
      });
      const data = (await res.json()) as RegisterResponse;
      if (!res.ok || !data.client) {
        setError(data.message ?? "Could not register client");
        return;
      }
      setClients((current) => {
        const next = current.filter((item) => item.clientId !== data.client!.clientId);
        return [...next, data.client!].sort((a, b) => a.name.localeCompare(b.name));
      });
      if (data.clientSecret) {
        setIssued({ clientId: data.client.clientId, secret: data.clientSecret });
        setNotice(
          data.created
            ? "Client created. Copy the secret now — it will not be shown again."
            : "Secret rotated.",
        );
      } else {
        setNotice(
          "Client already existed. New origins were added. Secret was not changed.",
        );
      }
    } catch {
      setError("Could not register client");
    } finally {
      setBusy(null);
    }
  }

  async function onRotate(targetId: string) {
    if (
      !window.confirm(
        `Rotate the secret for ${targetId}? Existing apps will stop signing in until you update AUTH_NOIRLY_CLIENT_SECRET.`,
      )
    ) {
      return;
    }
    setError(null);
    setNotice(null);
    setBusy("rotate");
    try {
      const res = await adminFetch(`/api/admin/clients/${encodeURIComponent(targetId)}`, {
        method: "PATCH",
        body: JSON.stringify({ rotateSecret: true }),
      });
      const data = (await res.json()) as RegisterResponse;
      if (!res.ok || !data.client || !data.clientSecret) {
        setError(data.message ?? "Could not rotate secret");
        return;
      }
      setClients((current) =>
        current.map((item) => (item.clientId === data.client!.clientId ? data.client! : item)),
      );
      setIssued({ clientId: data.client.clientId, secret: data.clientSecret });
      setNotice("Secret rotated. Copy it now — it will not be shown again.");
    } catch {
      setError("Could not rotate secret");
    } finally {
      setBusy(null);
    }
  }

  async function onToggleStatus(client: PublicOAuthClient) {
    const nextStatus = client.status === "active" ? "disabled" : "active";
    setError(null);
    setBusy("disable");
    try {
      const res = await adminFetch(
        `/api/admin/clients/${encodeURIComponent(client.clientId)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: nextStatus }),
        },
      );
      const data = (await res.json()) as RegisterResponse;
      if (!res.ok || !data.client) {
        setError(data.message ?? "Could not update client");
        return;
      }
      setClients((current) =>
        current.map((item) => (item.clientId === data.client!.clientId ? data.client! : item)),
      );
      setNotice(
        nextStatus === "disabled"
          ? `${client.clientId} is disabled.`
          : `${client.clientId} is active.`,
      );
    } catch {
      setError("Could not update client");
    } finally {
      setBusy(null);
    }
  }

  async function copySnippet() {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(envSnippet(issuer, issued.clientId, issued.secret));
      setNotice("Copied env values to clipboard.");
    } catch {
      setError("Could not copy to clipboard");
    }
  }

  return (
    <>
      {busy ? (
        <BusyOverlay
          label={
            busy === "rotate"
              ? "Rotating secret"
              : busy === "disable"
                ? "Updating client"
                : "Registering client"
          }
        />
      ) : null}
      <EditorialShell
        label="Clients"
        navRightHref="/account"
        navRightLabel="Account"
        left={
          <>
            <div>
              <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-muted">
                Admin
              </p>
              <h1 className="mt-4 font-display text-5xl font-bold tracking-[-0.05em] uppercase md:text-6xl">
                OAuth apps
              </h1>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
                Register Flow, Ledger, Pulse, or any future Noirly app. Paste
                localhost and production origins — Identity fills in the Auth.js
                callback and logout URLs.
              </p>
            </div>

            <div className="space-y-4">
              {clients.length === 0 ? (
                <p className="font-mono text-xs tracking-[0.12em] uppercase text-muted">
                  No clients yet
                </p>
              ) : (
                clients.map((client) => (
                  <article
                    key={client.clientId}
                    className="border border-dashed border-hairline p-4"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h2 className="font-display text-lg font-semibold tracking-[-0.03em]">
                        {client.name}
                      </h2>
                      <p className="font-mono text-[10px] tracking-[0.16em] uppercase text-muted">
                        {client.status}
                      </p>
                    </div>
                    <p className="mt-1 font-mono text-[11px] text-muted">{client.clientId}</p>
                    <ul className="mt-3 space-y-1 font-mono text-[11px] break-all text-muted">
                      {client.redirectUris.map((uri) => (
                        <li key={uri}>{uri}</li>
                      ))}
                    </ul>
                    <div className="mt-3 flex flex-wrap gap-3">
                      <button
                        type="button"
                        className="font-mono text-[11px] font-semibold tracking-[0.16em] uppercase text-muted underline decoration-dashed underline-offset-4 hover:text-ink"
                        onClick={() => void onRotate(client.clientId)}
                      >
                        Rotate secret
                      </button>
                      <button
                        type="button"
                        className="font-mono text-[11px] font-semibold tracking-[0.16em] uppercase text-muted underline decoration-dashed underline-offset-4 hover:text-ink"
                        onClick={() => void onToggleStatus(client)}
                      >
                        {client.status === "active" ? "Disable" : "Enable"}
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <DotMatrixClock />
              <TextLink href="/account">Back to account</TextLink>
            </div>
          </>
        }
        right={
          <form className="flex flex-col gap-5" onSubmit={onRegister}>
            <div>
              <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-panel-ink/55">
                Generator
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold tracking-[-0.04em] uppercase">
                Register app
              </h2>
            </div>
            <Field
              label="App name"
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Noirly Ledger"
              required
            />
            <Field
              label="Client ID"
              name="clientId"
              value={clientIdTouched ? clientId : derivedId}
              onChange={(event) => {
                setClientIdTouched(true);
                setClientId(event.target.value);
              }}
              placeholder="noirly-ledger"
              required
            />
            <TextArea
              label="App origins"
              name="origins"
              value={originsText}
              onChange={(event) => setOriginsText(event.target.value)}
              placeholder={`http://localhost:3003\nhttps://noirly.ledger.aneesh-pissay.in`}
              required
            />
            {preview ? (
              <div className="font-mono text-[11px] leading-relaxed text-panel-ink/70">
                <p className="tracking-[0.16em] uppercase text-panel-ink/45">Callbacks</p>
                <ul className="mt-2 space-y-1 break-all">
                  {preview.redirectUris.map((uri) => (
                    <li key={uri}>{uri}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {error ? <Notice>{error}</Notice> : null}
            {notice ? <Notice>{notice}</Notice> : null}
            {issued ? (
              <div className="border border-dashed border-panel-ink/40 p-3">
                <p className="font-mono text-[11px] tracking-[0.16em] uppercase text-panel-ink/55">
                  Paste into the app env
                </p>
                <pre className="mt-2 overflow-x-auto font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-panel-ink">
                  {envSnippet(issuer, issued.clientId, issued.secret)}
                </pre>
                <button
                  type="button"
                  className="mt-3 font-mono text-[11px] font-semibold tracking-[0.16em] uppercase underline decoration-dashed underline-offset-4"
                  onClick={() => void copySnippet()}
                >
                  Copy
                </button>
              </div>
            ) : null}
            <ActionButton type="submit" busy={busy === "register"}>
              Generate client
            </ActionButton>
          </form>
        }
      />
    </>
  );
}
