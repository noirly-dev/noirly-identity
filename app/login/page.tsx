"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

async function getCsrf(): Promise<string> {
  const res = await fetch("/api/auth/csrf", { credentials: "include" });
  const data = (await res.json()) as { csrfToken: string };
  return data.csrfToken;
}

function GoogleButton({ returnTo }: { returnTo: string | null }) {
  const href = returnTo
    ? `/api/auth/google?return_to=${encodeURIComponent(returnTo)}`
    : "/api/auth/google";
  return (
    <a
      className="flex items-center justify-center rounded border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-50"
      href={href}
    >
      Continue with Google
    </a>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("return_to");
  const [error, setError] = useState<string | null>(
    searchParams.get("error"),
  );
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
        setError(data.message ?? "Please verify your email address before signing in.");
        return;
      }
      setError(data.message ?? "Login failed");
      return;
    }
    router.push(returnTo || "/");
    router.refresh();
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-6 py-16">
      <h1 className="text-2xl font-semibold">Sign in to Noirly</h1>
      {googleEnabled ? (
        <>
          <GoogleButton returnTo={returnTo} />
          <p className="text-center text-xs uppercase tracking-wide text-zinc-500">or</p>
        </>
      ) : null}
      <form className="flex flex-col gap-3" onSubmit={onSubmit}>
        <input
          className="rounded border px-3 py-2"
          name="email"
          type="email"
          placeholder="Email"
          required
        />
        <input
          className="rounded border px-3 py-2"
          name="password"
          type="password"
          placeholder="Password"
          required
        />
        <button className="rounded bg-zinc-900 px-3 py-2 text-white" type="submit">
          Sign in
        </button>
      </form>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {unverifiedEmail ? (
        <Link
          className="text-sm underline"
          href={`/check-email?email=${encodeURIComponent(unverifiedEmail)}`}
        >
          Resend verification email
        </Link>
      ) : null}
      <p className="text-sm text-zinc-600">
        No account? <Link href="/register">Register</Link>
      </p>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="p-8">Loading...</main>}>
      <LoginForm />
    </Suspense>
  );
}
