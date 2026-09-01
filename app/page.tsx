import Link from "next/link";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageContainer,
  SHELL_GUTTER_CLASS,
} from "@noirly-dev/ui";

const endpoints = [
  { href: "/login", title: "Login", copy: "Access the secure portal." },
  { href: "/register", title: "Register", copy: "Provision a new identity token." },
  { href: "/account", title: "Account", copy: "Profile, password, and session." },
  { href: "/check-email", title: "Check email", copy: "Complete verification." },
  {
    href: "/.well-known/openid-configuration",
    title: "OpenID configuration",
    copy: "/.well-known/openid-configuration",
  },
  {
    href: "/.well-known/jwks.json",
    title: "JWKS",
    copy: "/.well-known/jwks.json",
  },
];

export default function Home() {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <div
        className="aura pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2"
        aria-hidden
      />
      <header className={`relative z-10 border-b border-[var(--hairline)] py-4 ${SHELL_GUTTER_CLASS}`}>
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <span className="font-display text-lg font-semibold tracking-tight">
            Noirly Identity
          </span>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </header>

      <PageContainer size="lg" className="flex flex-1 flex-col items-center justify-center text-center">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
          OpenID Connect
        </p>
        <h1 className="mt-4 font-display text-5xl font-semibold tracking-tight md:text-7xl">
          Identity
        </h1>
        <p className="mt-4 max-w-xl text-[var(--muted-foreground)]">
          Central authentication and OpenID Connect provider for Noirly
          applications.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/register">Register</Link>
          </Button>
        </div>
      </PageContainer>

      <PageContainer size="lg" className="grid gap-4 pb-16 md:grid-cols-2 lg:grid-cols-3">
        {endpoints.map((item) => (
          <Link key={item.href} href={item.href} className="group">
            <Card className="h-full transition-colors group-hover:border-[var(--accent)]/30">
              <CardHeader>
                <CardTitle>{item.title}</CardTitle>
                <CardDescription>{item.copy}</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-xs uppercase tracking-[0.12em] text-[var(--accent)]">
                  Open
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </PageContainer>

      <footer
        className={`relative z-10 border-t border-[var(--hairline)] py-6 text-center text-[10px] uppercase tracking-[0.16em] text-[var(--muted-foreground)] ${SHELL_GUTTER_CLASS}`}
      >
        Noirly Identity · Auth / OIDC / PKCE
      </footer>
    </div>
  );
}
