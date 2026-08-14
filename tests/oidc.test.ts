import { describe, expect, it } from "vitest";
import { decodeJwt } from "jose";
import { createAuthorizationCode } from "@/lib/oauth/authorize";
import { exchangeAuthorizationCode } from "@/lib/oauth/token";
import { buildUserInfo } from "@/lib/oidc/userinfo";
import { buildDiscoveryDocument } from "@/lib/oidc/discovery";
import { getJwks } from "@/lib/oidc/keys";
import {
  createAuthedSession,
  createTestClient,
  createTestUser,
  pkceChallenge,
} from "./helpers";
import { generateSecureToken } from "@/lib/security/crypto";

describe("oidc", () => {
  it("issues ID token with expected claims and nonce", async () => {
    const { user } = await createTestUser({ email: "oidc@example.com" });
    const { client, clientSecret } = await createTestClient();
    const { token: sessionToken } = await createAuthedSession(String(user._id));
    const verifier = generateSecureToken(32);
    const challenge = pkceChallenge(verifier);

    const { code } = await createAuthorizationCode({
      sessionToken,
      clientId: client.clientId,
      redirectUri: client.redirectUris[0]!,
      scope: "openid profile email",
      codeChallenge: challenge,
      codeChallengeMethod: "S256",
      nonce: "expected-nonce",
    });

    const tokens = await exchangeAuthorizationCode({
      code,
      redirectUri: client.redirectUris[0]!,
      clientId: client.clientId,
      clientSecret,
      codeVerifier: verifier,
      authorizationHeader: null,
    });

    const claims = decodeJwt(tokens.id_token);
    expect(claims.sub).toBe(String(user._id));
    expect(claims.sub).not.toBe(user.email);
    expect(claims.aud).toBe(client.clientId);
    expect(claims.nonce).toBe("expected-nonce");
    expect(claims.email).toBe("oidc@example.com");
    expect(claims.iss).toBe("http://localhost:3000");
  });

  it("returns scoped userinfo", async () => {
    const { user } = await createTestUser({ email: "info@example.com" });
    const { client, clientSecret } = await createTestClient();
    const { token: sessionToken } = await createAuthedSession(String(user._id));
    const verifier = generateSecureToken(32);

    const { code } = await createAuthorizationCode({
      sessionToken,
      clientId: client.clientId,
      redirectUri: client.redirectUris[0]!,
      scope: "openid email",
      codeChallenge: pkceChallenge(verifier),
      codeChallengeMethod: "S256",
    });

    const tokens = await exchangeAuthorizationCode({
      code,
      redirectUri: client.redirectUris[0]!,
      clientId: client.clientId,
      clientSecret,
      codeVerifier: verifier,
      authorizationHeader: null,
    });

    const info = await buildUserInfo(tokens.access_token);
    expect(info.sub).toBe(String(user._id));
    expect(info.email).toBe("info@example.com");
    expect(info.name).toBeUndefined();
  });

  it("serves discovery metadata and JWKS", async () => {
    const discovery = buildDiscoveryDocument();
    expect(discovery.issuer).toBe("http://localhost:3000");
    expect(discovery.authorization_endpoint).toContain("/api/oauth/authorize");
    expect(discovery.code_challenge_methods_supported).toContain("S256");
    expect(discovery.id_token_signing_alg_values_supported).toContain("RS256");

    const jwks = await getJwks();
    expect(jwks.keys.length).toBe(1);
    expect(jwks.keys[0]?.kty).toBe("RSA");
    expect(jwks.keys[0]?.kid).toBe("test-key-1");
    expect(jwks.keys[0]?.d).toBeUndefined();
  });
});
