export class OriginParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OriginParseError";
  }
}

export const DEFAULT_NOIRLY_CALLBACK_PATH = "/api/auth/callback/noirly";

function isHttpUrl(value: URL): boolean {
  return value.protocol === "http:" || value.protocol === "https:";
}

export function originFromAppUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new OriginParseError("App origin is required");
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new OriginParseError(`Invalid app origin: ${trimmed}`);
  }

  if (!isHttpUrl(parsed)) {
    throw new OriginParseError("App origins must use http or https");
  }
  if (parsed.username || parsed.password) {
    throw new OriginParseError("App origins must not include credentials");
  }

  return parsed.origin;
}

export function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    next.push(value);
  }
  return next;
}

export function urisFromOrigins(
  origins: string[],
  callbackPath = DEFAULT_NOIRLY_CALLBACK_PATH,
): { origins: string[]; redirectUris: string[]; postLogoutRedirectUris: string[] } {
  const normalizedOrigins = uniqueStrings(origins.map(originFromAppUrl));
  const path = callbackPath.startsWith("/") ? callbackPath : `/${callbackPath}`;
  return {
    origins: normalizedOrigins,
    redirectUris: normalizedOrigins.map((origin) => `${origin}${path}`),
    postLogoutRedirectUris: normalizedOrigins.map((origin) => `${origin}/`),
  };
}

export function slugifyClientId(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}
