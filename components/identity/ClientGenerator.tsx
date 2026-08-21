"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { getCsrf } from "@/lib/auth/csrf-client";
import { slugifyClientId, urisFromOrigins } from "@/lib/oauth/app-origins";
import type { ClientType, PublicOAuthClient } from "@/types";
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

type MutateResponse = {
  client?: PublicOAuthClient;
  clientSecret?: string | null;
  created?: boolean;
  deleted?: boolean;
  message?: string;
};

type BusyState = "register" | "update" | "rotate" | "disable" | "delete" | null;

function parseLines(value: string): string[] {
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

function emptyForm() {
  return {
    name: "",
    clientId: "",
    clientIdTouched: false,
    clientType: "confidential" as ClientType,
    originsText: "",
    redirectUrisText: "",
    sha1Text: "",
  };
}

export function ClientGenerator({ issuer, initialClients }: Props) {
  const [csrf, setCsrf] = useState("");
  const [clients, setClients] = useState(initialClients);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [issued, setIssued] = useState<{ clientId: string; secret: string } | null>(
    null,
  );
  const [busy, setBusy] = useState<BusyState>(null);

  useEffect(() => {
    void getCsrf().then(setCsrf);
  }, []);

  const derivedId = slugifyClientId(form.name);
  const effectiveId =
    (form.clientIdTouched ? form.clientId : derivedId) || form.clientId;
  const preview = useMemo(() => {
    try {
      const origins = parseLines(form.originsText);
      if (!origins.length) return null;
      return urisFromOrigins(origins);
    } catch {
      return null;
    }
  }, [form.originsText]);

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

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm());
    setIssued(null);
  }

  function beginEdit(client: PublicOAuthClient) {
    setError(null);
    setNotice(null);
    setIssued(null);
    setEditingId(client.clientId);
    setForm({
      name: client.name,
      clientId: client.clientId,
      clientIdTouched: true,
      clientType: client.clientType,
      originsText: "",
      redirectUrisText: client.redirectUris.join("\n"),
      sha1Text: (client.androidSha1Fingerprints ?? []).join("\n"),
    });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setIssued(null);

    if (editingId) {
      setBusy("update");
      try {
        const redirectUris = parseLines(form.redirectUrisText);
        const origins = parseLines(form.originsText);
        const res = await adminFetch(
          `/api/admin/clients/${encodeURIComponent(editingId)}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              name: form.name.trim(),
              clientType: form.clientType,
              ...(redirectUris.length
                ? { redirectUris, replaceUris: true }
                : origins.length
                  ? { origins, replaceUris: true }
                  : {}),
              androidSha1Fingerprints: parseLines(form.sha1Text),
            }),
          },
        );
        const data = (await res.json()) as MutateResponse;
        if (!res.ok || !data.client) {
          setError(data.message ?? "Could not update client");
          return;
        }
        setClients((current) =>
          current
            .map((item) =>
              item.clientId === data.client!.clientId ? data.client! : item,
            )
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
        if (data.clientSecret) {
          setIssued({ clientId: data.client.clientId, secret: data.clientSecret });
          setNotice(
            "Client updated. A new secret was issued — copy it now; it will not be shown again.",
          );
        } else {
          setNotice(`${data.client.clientId} updated.`);
        }
        setEditingId(null);
        setForm(emptyForm());
      } catch {
        setError("Could not update client");
      } finally {
        setBusy(null);
      }
      return;
    }

    setBusy("register");
    try {
      const origins = parseLines(form.originsText);
      const redirectUris = parseLines(form.redirectUrisText);
      const res = await adminFetch("/api/admin/clients", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          clientId: effectiveId.trim(),
          clientType: form.clientType,
          origins: origins.length ? origins : undefined,
          redirectUris: redirectUris.length ? redirectUris : undefined,
          androidSha1Fingerprints: parseLines(form.sha1Text),
        }),
      });
      const data = (await res.json()) as MutateResponse;
      if (!res.ok || !data.client) {
        setError(data.message ?? "Could not register client");
        return;
      }
      setClients((current) => {
        const next = current.filter(
          (item) => item.clientId !== data.client!.clientId,
        );
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
          data.created
            ? "Public client created (no secret)."
            : "Client already existed. New URIs were added. Secret was not changed.",
        );
      }
      setForm(emptyForm());
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
      const data = (await res.json()) as MutateResponse;
      if (!res.ok || !data.client || !data.clientSecret) {
        setError(data.message ?? "Could not rotate secret");
        return;
      }
      setClients((current) =>
        current.map((item) =>
          item.clientId === data.client!.clientId ? data.client! : item,
        ),
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
      const data = (await res.json()) as MutateResponse;
      if (!res.ok || !data.client) {
        setError(data.message ?? "Could not update client");
        return;
      }
      setClients((current) =>
        current.map((item) =>
          item.clientId === data.client!.clientId ? data.client! : item,
        ),
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

  async function onDelete(client: PublicOAuthClient) {
    if (
      !window.confirm(
        `Delete OAuth client ${client.clientId}? Apps using it will stop authenticating.`,
      )
    ) {
      return;
    }
    setError(null);
    setBusy("delete");
    try {
      const res = await adminFetch(
        `/api/admin/clients/${encodeURIComponent(client.clientId)}`,
        { method: "DELETE" },
      );
      const data = (await res.json()) as MutateResponse;
      if (!res.ok || !data.deleted) {
        setError(data.message ?? "Could not delete client");
        return;
      }
      setClients((current) =>
        current.filter((item) => item.clientId !== client.clientId),
      );
      if (editingId === client.clientId) {
        resetForm();
      }
      setNotice(`${client.clientId} deleted.`);
    } catch {
      setError("Could not delete client");
    } finally {
      setBusy(null);
    }
  }

  async function copySnippet() {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(
        envSnippet(issuer, issued.clientId, issued.secret),
      );
      setNotice("Copied env values to clipboard.");
    } catch {
      setError("Could not copy to clipboard");
    }
  }

  const busyLabel =
    busy === "rotate"
      ? "Rotating secret"
      : busy === "disable"
        ? "Updating client"
        : busy === "update"
          ? "Saving client"
          : busy === "delete"
            ? "Deleting client"
            : "Registering client";

  return (
    <>
      {busy ? <BusyOverlay label={busyLabel} /> : null}
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
                Register Flow, Ledger, Pulse, or any future Noirly app. Use
                confidential clients for web (Auth.js) and public clients for
                native mobile. Edit or delete existing apps from the list.
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
                    className={`border border-dashed p-4 ${
                      editingId === client.clientId
                        ? "border-ink"
                        : "border-hairline"
                    }`}
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h2 className="font-display text-lg font-semibold tracking-[-0.03em]">
                        {client.name}
                      </h2>
                      <p className="font-mono text-[10px] tracking-[0.16em] uppercase text-muted">
                        {client.clientType} · {client.status}
                      </p>
                    </div>
                    <p className="mt-1 font-mono text-[11px] text-muted">
                      {client.clientId}
                    </p>
                    <ul className="mt-3 space-y-1 font-mono text-[11px] break-all text-muted">
                      {client.redirectUris.map((uri) => (
                        <li key={uri}>{uri}</li>
                      ))}
                    </ul>
                    {client.androidSha1Fingerprints?.length ? (
                      <ul className="mt-2 space-y-1 font-mono text-[11px] break-all text-muted">
                        {client.androidSha1Fingerprints.map((fp) => (
                          <li key={fp}>SHA-1 {fp}</li>
                        ))}
                      </ul>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-3">
                      <button
                        type="button"
                        className="font-mono text-[11px] font-semibold tracking-[0.16em] uppercase text-muted underline decoration-dashed underline-offset-4 hover:text-ink"
                        onClick={() => beginEdit(client)}
                      >
                        Edit
                      </button>
                      {client.clientType === "confidential" ? (
                        <button
                          type="button"
                          className="font-mono text-[11px] font-semibold tracking-[0.16em] uppercase text-muted underline decoration-dashed underline-offset-4 hover:text-ink"
                          onClick={() => void onRotate(client.clientId)}
                        >
                          Rotate secret
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="font-mono text-[11px] font-semibold tracking-[0.16em] uppercase text-muted underline decoration-dashed underline-offset-4 hover:text-ink"
                        onClick={() => void onToggleStatus(client)}
                      >
                        {client.status === "active" ? "Disable" : "Enable"}
                      </button>
                      <button
                        type="button"
                        className="font-mono text-[11px] font-semibold tracking-[0.16em] uppercase text-muted underline decoration-dashed underline-offset-4 hover:text-ink"
                        onClick={() => void onDelete(client)}
                      >
                        Delete
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
          <form className="flex flex-col gap-5" onSubmit={onSubmit}>
            <div>
              <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-panel-ink/55">
                {editingId ? "Editor" : "Generator"}
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold tracking-[-0.04em] uppercase">
                {editingId ? "Edit app" : "Register app"}
              </h2>
            </div>
            <Field
              label="App name"
              name="name"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Noirly Ledger"
              required
            />
            <Field
              label="Client ID"
              name="clientId"
              value={
                editingId
                  ? form.clientId
                  : form.clientIdTouched
                    ? form.clientId
                    : derivedId
              }
              onChange={(event) => {
                if (editingId) return;
                setForm((current) => ({
                  ...current,
                  clientIdTouched: true,
                  clientId: event.target.value,
                }));
              }}
              placeholder="noirly-ledger"
              required
              readOnly={Boolean(editingId)}
            />
            <label className="flex flex-col gap-2">
              <span className="font-mono text-[11px] font-semibold tracking-[0.18em] uppercase text-panel-ink/55">
                Client type
              </span>
              <select
                className="border-0 border-b border-dashed border-panel-ink/40 bg-transparent px-0 py-2 text-base text-panel-ink outline-none focus:border-panel-ink"
                value={form.clientType}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    clientType: event.target.value as ClientType,
                  }))
                }
              >
                <option value="confidential">Confidential (web)</option>
                <option value="public">Public (native mobile)</option>
              </select>
            </label>
            <TextArea
              label="App origins"
              name="origins"
              value={form.originsText}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  originsText: event.target.value,
                }))
              }
              placeholder={`http://localhost:3003\nhttps://noirly.ledger.aneesh-pissay.in`}
            />
            <TextArea
              label="Redirect URIs"
              name="redirectUris"
              value={form.redirectUrisText}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  redirectUrisText: event.target.value,
                }))
              }
              placeholder={`noirlyflow://oauth\nor leave blank to derive from origins`}
            />
            <TextArea
              label="Android SHA-1"
              name="androidSha1"
              value={form.sha1Text}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  sha1Text: event.target.value,
                }))
              }
              placeholder={`AA:BB:CC:DD:… (debug / release signing cert)\nOne fingerprint per line`}
            />
            <p className="font-mono text-[10px] leading-relaxed tracking-[0.04em] text-panel-ink/55">
              Web apps: paste origins. Native apps: paste redirect URIs (e.g.
              noirlyflow://oauth) and optional Android SHA-1 fingerprints.
              {editingId
                ? " Saving replaces redirect URIs and SHA-1s with the values below."
                : null}
            </p>
            {preview && !editingId ? (
              <div className="font-mono text-[11px] leading-relaxed text-panel-ink/70">
                <p className="tracking-[0.16em] uppercase text-panel-ink/45">
                  Callbacks
                </p>
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
            <div className="flex flex-wrap gap-4">
              <ActionButton
                type="submit"
                busy={busy === "register" || busy === "update"}
              >
                {editingId ? "Save changes" : "Generate client"}
              </ActionButton>
              {editingId ? (
                <button
                  type="button"
                  className="font-mono text-[11px] font-semibold tracking-[0.16em] uppercase text-panel-ink/70 underline decoration-dashed underline-offset-4"
                  onClick={() => {
                    resetForm();
                    setError(null);
                    setNotice(null);
                  }}
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        }
      />
    </>
  );
}
