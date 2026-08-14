import { createHash, timingSafeEqual } from "node:crypto";
import { OAuthError } from "@/lib/api/errors";

export function verifyPkceS256(codeVerifier: string, codeChallenge: string): boolean {
  const computed = createHash("sha256").update(codeVerifier).digest("base64url");
  const a = Buffer.from(computed);
  const b = Buffer.from(codeChallenge);
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

export function requirePkceForClient(options: {
  clientType: "public" | "confidential";
  requirePkce: boolean;
  codeChallenge?: string | null;
  codeChallengeMethod?: string | null;
}): void {
  const needsPkce =
    options.clientType === "public" || options.requirePkce || !!options.codeChallenge;

  if (!needsPkce) {
    return;
  }

  if (!options.codeChallenge || options.codeChallengeMethod !== "S256") {
    throw new OAuthError(
      "invalid_request",
      "PKCE with code_challenge_method=S256 is required",
    );
  }
}
