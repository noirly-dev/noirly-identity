"use client";

import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

function ResetForm() {
  const params = useSearchParams();
  const [token, setToken] = useState(params.get("token") ?? "");
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        token,
        newPassword: form.get("newPassword"),
      }),
    });
    const data = (await res.json()) as { message?: string };
    setMessage(res.ok ? "Password updated" : data.message || "Reset failed");
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-6 py-16">
      <h1 className="text-2xl font-semibold">Reset password</h1>
      <form className="flex flex-col gap-3" onSubmit={onSubmit}>
        <input
          className="rounded border px-3 py-2"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Reset token"
          required
        />
        <input
          className="rounded border px-3 py-2"
          name="newPassword"
          type="password"
          placeholder="New password"
          required
        />
        <button className="rounded bg-zinc-900 px-3 py-2 text-white" type="submit">
          Reset password
        </button>
      </form>
      {message ? <p className="text-sm">{message}</p> : null}
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className="p-8">Loading...</main>}>
      <ResetForm />
    </Suspense>
  );
}
