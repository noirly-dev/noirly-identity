import { SignJWT } from "jose";
import { getEnv } from "@/lib/config/env";
import { getSigningKeys } from "@/lib/oidc/keys";
import type { UserDocument } from "@/models/User";

export async function createIdToken(input: {
  user: UserDocument;
  clientId: string;
  scope: string;
  nonce?: string | null;
  authTime: Date;
}): Promise<string> {
  const env = getEnv();
  const keys = await getSigningKeys();
  const scopes = new Set(input.scope.split(/\s+/));
  const now = Math.floor(Date.now() / 1000);

  const claims: Record<string, unknown> = {
    auth_time: Math.floor(input.authTime.getTime() / 1000),
  };

  if (input.nonce) {
    claims.nonce = input.nonce;
  }

  if (scopes.has("email")) {
    claims.email = input.user.email;
    claims.email_verified = input.user.emailVerified;
  }

  if (scopes.has("profile")) {
    claims.name = input.user.displayName;
    claims.given_name = input.user.firstName;
    claims.family_name = input.user.lastName;
    if (input.user.avatarUrl) {
      claims.picture = input.user.avatarUrl;
    }
  }

  if (scopes.has("roles")) {
    claims.roles = input.user.roles;
  }

  return new SignJWT(claims)
    .setProtectedHeader({ alg: "RS256", kid: keys.kid, typ: "JWT" })
    .setIssuer(env.OIDC_ISSUER)
    .setSubject(String(input.user._id))
    .setAudience(input.clientId)
    .setIssuedAt(now)
    .setExpirationTime(now + env.ACCESS_TOKEN_TTL_SECONDS)
    .sign(keys.privateKey);
}
