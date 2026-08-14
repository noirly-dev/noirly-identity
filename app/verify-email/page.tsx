"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

type VerifyStatus =
  | "loading"
  | "verified"
  | "already_verified"
  | "invalid"
  | "expired"
  | "used"
  | "missing";

function VerifyContent() {
  const params = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<VerifyStatus>(token ? "loading" : "missing");
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) {
      return;
    }
    started.current = true;

    void (async () => {
      try {
        const res = await fetch(
          `/api/auth/verify-email?token=${encodeURIComponent(token)}`,
          { method: "GET", credentials: "include" },
        );
        const data = (await res.json()) as { status?: VerifyStatus };
        if (
          data.status === "verified" ||
          data.status === "already_verified" ||
          data.status === "expired" ||
          data.status === "used" ||
          data.status === "invalid"
        ) {
          setStatus(data.status);
          return;
        }
        setStatus(res.ok ? "verified" : "invalid");
      } catch {
        setStatus("invalid");
      }
    })();
  }, [token]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-6 py-16">
      {status === "loading" ? (
        <>
          <h1 className="text-2xl font-semibold">Verifying your email...</h1>
          <p className="text-zinc-600">Please wait.</p>
        </>
      ) : null}

      {status === "verified" ? (
        <>
          <h1 className="text-2xl font-semibold">Email verified</h1>
          <p className="text-zinc-600">
            Your Noirly account has been successfully verified.
          </p>
          <Link className="rounded bg-zinc-900 px-3 py-2 text-center text-white" href="/login">
            Continue to Noirly
          </Link>
        </>
      ) : null}

      {status === "already_verified" ? (
        <>
          <h1 className="text-2xl font-semibold">Email already verified</h1>
          <p className="text-zinc-600">
            Your email address has already been verified.
          </p>
          <Link className="rounded bg-zinc-900 px-3 py-2 text-center text-white" href="/login">
            Continue to Noirly
          </Link>
        </>
      ) : null}

      {status === "expired" ? (
        <>
          <h1 className="text-2xl font-semibold">Verification link expired</h1>
          <p className="text-zinc-600">This verification link has expired.</p>
          <Link className="rounded bg-zinc-900 px-3 py-2 text-center text-white" href="/check-email">
            Send a new verification email
          </Link>
        </>
      ) : null}

      {status === "invalid" || status === "used" || status === "missing" ? (
        <>
          <h1 className="text-2xl font-semibold">Verification link is invalid</h1>
          <p className="text-zinc-600">
            This verification link is invalid or has already been used.
          </p>
          <Link className="rounded bg-zinc-900 px-3 py-2 text-center text-white" href="/check-email">
            Send a new verification email
          </Link>
        </>
      ) : null}
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-6 py-16">
          <h1 className="text-2xl font-semibold">Verifying your email...</h1>
          <p className="text-zinc-600">Please wait.</p>
        </main>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
