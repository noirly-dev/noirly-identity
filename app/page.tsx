import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Noirly Identity</h1>
      <p className="text-zinc-600">
        Central authentication and OpenID Connect provider for Noirly applications.
        UI is intentionally minimal; use the APIs and OAuth/OIDC endpoints.
      </p>
      <ul className="list-disc space-y-2 pl-5 text-sm">
        <li>
          <Link className="underline" href="/login">
            Login
          </Link>
        </li>
        <li>
          <Link className="underline" href="/register">
            Register
          </Link>
        </li>
        <li>
          <Link className="underline" href="/check-email">
            Check email
          </Link>
        </li>
        <li>
          <Link className="underline" href="/.well-known/openid-configuration">
            OpenID configuration
          </Link>
        </li>
        <li>
          <Link className="underline" href="/.well-known/jwks.json">
            JWKS
          </Link>
        </li>
      </ul>
    </main>
  );
}
