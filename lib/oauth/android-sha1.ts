export class Sha1ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "Sha1ParseError";
  }
}

/** Normalize Android cert SHA-1 to `AA:BB:…` (20 bytes). */
export function normalizeAndroidSha1(value: string): string {
  const hex = value.trim().replace(/[^a-fA-F0-9]/g, "").toUpperCase();
  if (hex.length !== 40) {
    throw new Sha1ParseError(
      `Invalid Android SHA-1 fingerprint (expected 40 hex chars): ${value.trim()}`,
    );
  }
  return hex.match(/.{1,2}/g)!.join(":");
}

export function parseAndroidSha1List(values: string[]): string[] {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const raw of values) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const normalized = normalizeAndroidSha1(trimmed);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    next.push(normalized);
  }
  return next;
}
