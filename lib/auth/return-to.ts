const OAUTH_RETURN_COOKIE = "noirly_oauth_return";

export function withReturnTo(path: string, returnTo: string | null | undefined): string {
  if (!returnTo) return path;
  const [pathname, search = ""] = path.split("?");
  const params = new URLSearchParams(search);
  params.set("return_to", returnTo);
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function withPopup(path: string, popup: boolean): string {
  if (!popup) return path;
  const [pathname, search = ""] = path.split("?");
  const params = new URLSearchParams(search);
  params.set("popup", "1");
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function isPopupLogin(candidate?: string | null): boolean {
  return candidate === "1" || candidate === "popup";
}

export function stripAuthorizePrompt(candidate: string): string {
  try {
    const absolute =
      candidate.startsWith("http://") || candidate.startsWith("https://");
    const url = absolute
      ? new URL(candidate)
      : new URL(candidate, "https://noirly.invalid");
    if (url.pathname === "/api/oauth/authorize") {
      url.searchParams.delete("prompt");
    }
    if (absolute) return url.toString();
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return candidate;
  }
}

export function sanitizeReturnTo(
  candidate: string | null | undefined,
  origin?: string,
): string | null {
  if (!candidate) return null;
  const allowedOrigin =
    origin ?? (typeof window !== "undefined" ? window.location.origin : "");

  if (candidate.startsWith("/") && !candidate.startsWith("//") && !candidate.startsWith("/\\")) {
    return candidate;
  }

  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (allowedOrigin && url.origin !== allowedOrigin) return null;
    if (!allowedOrigin) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function readOauthReturnCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${OAUTH_RETURN_COOKIE}=`));
  if (!match) return null;
  try {
    return sanitizeReturnTo(
      decodeURIComponent(match.slice(OAUTH_RETURN_COOKIE.length + 1)),
    );
  } catch {
    return null;
  }
}

export function goReturnTo(returnTo: string | null | undefined): void {
  const dest =
    sanitizeReturnTo(returnTo) ?? readOauthReturnCookie() ?? "/";
  window.location.assign(stripAuthorizePrompt(dest));
}
