"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

async function getCsrf(): Promise<string> {
  const res = await fetch("/api/auth/csrf", { credentials: "include" });
  const data = (await res.json()) as { csrfToken: string };
  return data.csrfToken;
}

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
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-6 py-16">
      <h1 className="text-2xl font-semibold">Create Noirly account</h1>
      {googleEnabled ? (
        <>
          <a
            className="flex items-center justify-center rounded border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-50"
            href="/api/auth/google"
          >
            Continue with Google
          </a>
          <p className="text-center text-xs uppercase tracking-wide text-zinc-500">or</p>
        </>
      ) : null}
      <form className="flex flex-col gap-3" onSubmit={onSubmit}>
        <input className="rounded border px-3 py-2" name="firstName" placeholder="First name" required />
        <input className="rounded border px-3 py-2" name="lastName" placeholder="Last name" required />
        <input className="rounded border px-3 py-2" name="email" type="email" placeholder="Email" required />
        <input
          className="rounded border px-3 py-2"
          name="password"
          type="password"
          placeholder="Password"
          required
        />
        <button className="rounded bg-zinc-900 px-3 py-2 text-white" type="submit">
          Register
        </button>
      </form>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <p className="text-sm text-zinc-600">
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
    </main>
  );
}
