import Link from "next/link";
import { TopNav } from "@/components/identity/TopNav";
import { VerticalLabel } from "@/components/identity/VerticalLabel";
import { DotMatrixNumeral } from "@/components/identity/DotMatrix";

const endpoints = [
  { href: "/login", index: "01", title: "Login", copy: "Access the secure portal." },
  { href: "/register", index: "02", title: "Register", copy: "Provision a new identity token." },
  { href: "/check-email", index: "03", title: "Check email", copy: "Complete verification." },
  {
    href: "/.well-known/openid-configuration",
    index: "04",
    title: "OpenID configuration",
    copy: "/.well-known/openid-configuration",
  },
  {
    href: "/.well-known/jwks.json",
    index: "05",
    title: "JWKS",
    copy: "/.well-known/jwks.json",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <TopNav rightHref="/login" rightLabel="Sign in" />
      <div className="flex flex-1 flex-col lg:flex-row">
        <VerticalLabel>auth.noirly.com</VerticalLabel>
        <div className="flex min-w-0 flex-1 flex-col">
          <section className="relative overflow-hidden px-5 py-12 md:px-12 md:py-20">
            <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-muted">
              Protocol 2.0
            </p>
            <h1 className="text-perforated mt-4 max-w-[12ch] font-display text-[18vw] leading-[0.8] font-bold tracking-[-0.07em] uppercase md:text-[9rem]">
              Identity
            </h1>
            <DotMatrixNumeral className="mt-6 block text-5xl md:text-7xl">
              2.0
            </DotMatrixNumeral>
          </section>

          <section className="bg-panel px-5 py-10 text-panel-ink md:px-12 md:py-14">
            <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-panel-ink/50">
              OpenID Connect
            </p>
            <p className="mt-4 max-w-2xl font-display text-2xl leading-snug font-medium tracking-[-0.03em] md:text-4xl">
              Central authentication and OpenID Connect provider for Noirly
              applications.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex bg-panel-ink px-4 py-3 font-mono text-[11px] font-semibold tracking-[0.16em] text-panel uppercase hover:bg-transparent hover:text-panel-ink hover:outline hover:outline-1 hover:outline-dashed"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="inline-flex border border-dashed border-panel-ink px-4 py-3 font-mono text-[11px] font-semibold tracking-[0.16em] uppercase hover:bg-panel-ink hover:text-panel"
              >
                Register
              </Link>
            </div>
          </section>

          <section className="grid gap-0 border-t border-dashed border-hairline md:grid-cols-2 xl:grid-cols-3">
            {endpoints.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex min-h-44 flex-col justify-between gap-6 border-b border-r border-dashed border-hairline px-5 py-8 transition-colors hover:bg-ink hover:text-canvas md:px-8"
              >
                <DotMatrixNumeral className="text-3xl">{item.index}</DotMatrixNumeral>
                <div>
                  <h2 className="font-display text-xl font-semibold tracking-[-0.03em]">
                    {item.title}
                  </h2>
                  <p className="mt-1 font-mono text-[11px] tracking-[0.08em] uppercase opacity-60">
                    {item.copy}
                  </p>
                </div>
              </Link>
            ))}
          </section>

          <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-dashed border-hairline px-5 py-6 font-mono text-[10px] tracking-[0.16em] uppercase text-muted md:px-12">
            <span>Noirly Identity</span>
            <span>Auth / OIDC / PKCE</span>
          </footer>
        </div>
      </div>
    </div>
  );
}
