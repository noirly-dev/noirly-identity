"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AuthShell, Button, Label } from "@noirly-dev/ui";
import { AuthLogo } from "@/components/AuthLogo";
import {
  BusyOverlay,
  FormField,
  FormTextarea,
  Notice,
  SubmitButton,
  TextLink,
} from "@/components/auth-ui";
import { getCsrf } from "@/lib/auth/csrf-client";
import { slugifyClientId, urisFromOrigins } from "@/lib/oauth/app-origins";
import type { ClientType, PublicOAuthClient } from "@/types";

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
      <AuthShell
        logo={<AuthLogo />}
        title="OAuth apps"
        lead="Register Flow, Ledger, Pulse, or any future Noirly app."
        size="lg"
        align="top"
        className="py-8"
        footer={<TextLink href="/account">Back to account</TextLink>}
      >
        <div className="mb-8 space-y-4">
          {clients.length === 0 ? (
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
              No clients yet
            </p>
          ) : (
            clients.map((client) => (
              <article
                key={client.clientId}
                className={`rounded-xl border p-4 ${
                  editingId === client.clientId
                    ? "border-[var(--accent)]"
                    : "border-[var(--hairline)]"
                }`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-display text-lg font-semibold tracking-tight">
                    {client.name}
                  </h2>
                  <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                    {client.clientType} · {client.status}
                  </p>
                </div>
                <p className="mt-1 font-mono text-[11px] text-[var(--muted-foreground)]">
                  {client.clientId}
                </p>
                <ul className="mt-3 space-y-1 break-all font-mono text-[11px] text-[var(--muted-foreground)]">
                  {client.redirectUris.map((uri) => (
                    <li key={uri}>{uri}</li>
                  ))}
                </ul>
                {client.androidSha1Fingerprints?.length ? (
                  <ul className="mt-2 space-y-1 break-all font-mono text-[11px] text-[var(--muted-foreground)]">
                    {client.androidSha1Fingerprints.map((fp) => (
                      <li key={fp}>SHA-1 {fp}</li>
                    ))}
                  </ul>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => beginEdit(client)}>
                    Edit
                  </Button>
                  {client.clientType === "confidential" ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => void onRotate(client.clientId)}
                    >
                      Rotate secret
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void onToggleStatus(client)}
                  >
                    {client.status === "active" ? "Disable" : "Enable"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void onDelete(client)}
                  >
                    Delete
                  </Button>
                </div>
              </article>
            ))
          )}
        </div>

        <form className="flex flex-col gap-4 border-t border-[var(--hairline)] pt-8" onSubmit={onSubmit}>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
              {editingId ? "Editor" : "Generator"}
            </p>
            <h2 className="mt-2 font-display text-xl font-semibold tracking-tight">
              {editingId ? "Edit app" : "Register app"}
            </h2>
          </div>
          <FormField
            label="App name"
            name="name"
            value={form.name}
            onChange={(event) =>
              setForm((current) => ({ ...current, name: event.target.value }))
            }
            placeholder="Noirly Ledger"
            required
          />
          <FormField
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
          <div className="flex flex-col gap-2">
            <Label htmlFor="client-type">Client type</Label>
            <select
              id="client-type"
              className="flex h-10 w-full rounded-xl border border-[var(--hairline)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
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
          </div>
          <FormTextarea
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
          <FormTextarea
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
          <FormTextarea
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
          <p className="text-[10px] leading-relaxed text-[var(--muted-foreground)]">
            Web apps: paste origins. Native apps: paste redirect URIs (e.g.
            noirlyflow://oauth) and optional Android SHA-1 fingerprints.
            {editingId
              ? " Saving replaces redirect URIs and SHA-1s with the values below."
              : null}
          </p>
          {preview && !editingId ? (
            <div className="font-mono text-[11px] leading-relaxed text-[var(--muted-foreground)]">
              <p className="uppercase tracking-[0.12em]">Callbacks</p>
              <ul className="mt-2 space-y-1 break-all">
                {preview.redirectUris.map((uri) => (
                  <li key={uri}>{uri}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {error ? <Notice tone="error">{error}</Notice> : null}
          {notice ? <Notice tone="success">{notice}</Notice> : null}
          {issued ? (
            <div className="rounded-xl border border-[var(--hairline)] p-3">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                Paste into the app env
              </p>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
                {envSnippet(issuer, issued.clientId, issued.secret)}
              </pre>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-3"
                onClick={() => void copySnippet()}
              >
                Copy
              </Button>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <SubmitButton
              busy={busy === "register" || busy === "update"}
              busyLabel={editingId ? "Saving" : "Registering"}
            >
              {editingId ? "Save changes" : "Generate client"}
            </SubmitButton>
            {editingId ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  resetForm();
                  setError(null);
                  setNotice(null);
                }}
              >
                Cancel
              </Button>
            ) : null}
          </div>
        </form>
      </AuthShell>
    </>
  );
}
