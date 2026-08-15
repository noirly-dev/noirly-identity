import { describe, expect, it } from "vitest";
import { createAuthorizationCode, validateAuthorizeRequest } from "@/lib/oauth/authorize";
import {
  exchangeAuthorizationCode,
  exchangeRefreshToken,
} from "@/lib/oauth/token";
import { OAuthError } from "@/lib/api/errors";
import { AuthorizationCode } from "@/models/AuthorizationCode";
import { hashToken, generateSecureToken } from "@/lib/security/crypto";
import {
  createAuthedSession,
  createTestClient,
  createTestUser,
  pkceChallenge,
} from "./helpers";
import { getEnv } from "@/lib/config/env";

describe("oauth authorize validation", () => {
  it("rejects invalid client", async () => {
    await expect(
      validateAuthorizeRequest({
        client_id: "missing",
        redirect_uri: "http://localhost:3001/cb",
        response_type: "code",
        scope: "openid",
        state: "abc",
      }),
    ).rejects.toBeInstanceOf(OAuthError);
  });

  it("rejects invalid redirect URI", async () => {
    const { client } = await createTestClient();
    await expect(
      validateAuthorizeRequest({
        client_id: client.clientId,
        redirect_uri: "http://evil.example/cb",
        response_type: "code",
        scope: "openid profile email",
        state: "abc",
        code_challenge: pkceChallenge("x".repeat(43)),
        code_challenge_method: "S256",
      }),
    ).rejects.toMatchObject({ error: "invalid_request" });
  });

  it("requires state at schema layer", async () => {
    const { authorizeQuerySchema } = await import("@/lib/validation/schemas");
    const parsed = authorizeQuerySchema.safeParse({
      client_id: "x",
      redirect_uri: "http://localhost:3001/cb",
      response_type: "code",
      scope: "openid",
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts select_account prompt", async () => {
    const { authorizeQuerySchema } = await import("@/lib/validation/schemas");
    const parsed = authorizeQuerySchema.safeParse({
      client_id: "x",
      redirect_uri: "http://localhost:3001/cb",
      response_type: "code",
      scope: "openid",
      state: "abc",
      prompt: "select_account",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects invalid scope", async () => {
    const { client } = await createTestClient({
      allowedScopes: ["openid", "profile", "email"],
    });
    await expect(
      validateAuthorizeRequest({
        client_id: client.clientId,
        redirect_uri: client.redirectUris[0]!,
        response_type: "code",
        scope: "openid admin",
        state: "abc",
        code_challenge: pkceChallenge("y".repeat(43)),
        code_challenge_method: "S256",
      }),
    ).rejects.toMatchObject({ error: "invalid_scope" });
  });
});

describe("oauth token exchange", () => {
  it("rejects invalid PKCE verifier", async () => {
    const { user } = await createTestUser();
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
      nonce: "nonce-1",
    });

    await expect(
      exchangeAuthorizationCode({
        code,
        redirectUri: client.redirectUris[0]!,
        clientId: client.clientId,
        clientSecret,
        codeVerifier: "wrong-verifier-wrong-verifier-wrong-verifier",
        authorizationHeader: null,
      }),
    ).rejects.toMatchObject({ error: "invalid_grant" });
  });

  it("rejects expired authorization code", async () => {
    const { user } = await createTestUser();
    const { client, clientSecret } = await createTestClient();
    const { token: sessionToken, session } = await createAuthedSession(
      String(user._id),
    );
    const verifier = generateSecureToken(32);
    const challenge = pkceChallenge(verifier);
    const code = generateSecureToken(24);

    await AuthorizationCode.create({
      codeHash: hashToken(code),
      clientId: client.clientId,
      userId: user._id,
      sessionId: session._id,
      redirectUri: client.redirectUris[0]!,
      scope: "openid profile email",
      codeChallenge: challenge,
      codeChallengeMethod: "S256",
      nonce: "n",
      authTime: new Date(),
      expiresAt: new Date(Date.now() - 1000),
    });
    void sessionToken;

    await expect(
      exchangeAuthorizationCode({
        code,
        redirectUri: client.redirectUris[0]!,
        clientId: client.clientId,
        clientSecret,
        codeVerifier: verifier,
        authorizationHeader: null,
      }),
    ).rejects.toMatchObject({ error: "invalid_grant" });
  });

  it("rejects reused authorization code", async () => {
    const { user } = await createTestUser();
    const { client, clientSecret } = await createTestClient();
    const { token: sessionToken } = await createAuthedSession(String(user._id));
    const verifier = generateSecureToken(32);
    const challenge = pkceChallenge(verifier);

    const { code } = await createAuthorizationCode({
      sessionToken,
      clientId: client.clientId,
      redirectUri: client.redirectUris[0]!,
      scope: "openid profile email offline_access",
      codeChallenge: challenge,
      codeChallengeMethod: "S256",
      nonce: "nonce-2",
    });

    const first = await exchangeAuthorizationCode({
      code,
      redirectUri: client.redirectUris[0]!,
      clientId: client.clientId,
      clientSecret,
      codeVerifier: verifier,
      authorizationHeader: null,
    });
    expect(first.access_token).toBeTruthy();

    await expect(
      exchangeAuthorizationCode({
        code,
        redirectUri: client.redirectUris[0]!,
        clientId: client.clientId,
        clientSecret,
        codeVerifier: verifier,
        authorizationHeader: null,
      }),
    ).rejects.toMatchObject({ error: "invalid_grant" });
  });

  it("rotates refresh tokens and detects reuse", async () => {
    const { user } = await createTestUser();
    const { client, clientSecret } = await createTestClient();
    const { token: sessionToken } = await createAuthedSession(String(user._id));
    const verifier = generateSecureToken(32);
    const challenge = pkceChallenge(verifier);

    const { code } = await createAuthorizationCode({
      sessionToken,
      clientId: client.clientId,
      redirectUri: client.redirectUris[0]!,
      scope: "openid profile email offline_access",
      codeChallenge: challenge,
      codeChallengeMethod: "S256",
    });

    const initial = await exchangeAuthorizationCode({
      code,
      redirectUri: client.redirectUris[0]!,
      clientId: client.clientId,
      clientSecret,
      codeVerifier: verifier,
      authorizationHeader: null,
    });

    expect(initial.refresh_token).toBeTruthy();
    const oldRefresh = initial.refresh_token!;

    const rotated = await exchangeRefreshToken({
      refreshToken: oldRefresh,
      clientId: client.clientId,
      clientSecret,
      authorizationHeader: null,
    });
    expect(rotated.refresh_token).toBeTruthy();
    expect(rotated.refresh_token).not.toBe(oldRefresh);

    await expect(
      exchangeRefreshToken({
        refreshToken: oldRefresh,
        clientId: client.clientId,
        clientSecret,
        authorizationHeader: null,
      }),
    ).rejects.toMatchObject({ error: "invalid_grant" });

    await expect(
      exchangeRefreshToken({
        refreshToken: "totally-invalid",
        clientId: client.clientId,
        clientSecret,
        authorizationHeader: null,
      }),
    ).rejects.toMatchObject({ error: "invalid_grant" });

    void getEnv;
  });
});
