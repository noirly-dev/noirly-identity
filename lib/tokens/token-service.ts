import { getEnv } from "@/lib/config/env";
import { generateSecureToken, hashToken } from "@/lib/security/crypto";
import { AccessToken } from "@/models/AccessToken";
import { RefreshToken } from "@/models/RefreshToken";
import type { Types } from "mongoose";

export async function issueAccessToken(input: {
  clientId: string;
  userId: Types.ObjectId | string;
  sessionId: Types.ObjectId | string;
  scope: string;
}): Promise<{ token: string; expiresIn: number }> {
  const env = getEnv();
  const token = generateSecureToken(32);
  const expiresIn = env.ACCESS_TOKEN_TTL_SECONDS;
  await AccessToken.create({
    tokenHash: hashToken(token),
    clientId: input.clientId,
    userId: input.userId,
    sessionId: input.sessionId,
    scope: input.scope,
    expiresAt: new Date(Date.now() + expiresIn * 1000),
  });
  return { token, expiresIn };
}

export async function resolveAccessToken(token: string) {
  const record = await AccessToken.findOne({ tokenHash: hashToken(token) });
  if (!record || record.revokedAt || record.expiresAt.getTime() <= Date.now()) {
    return null;
  }
  return record;
}

export async function revokeAccessTokensForSession(
  sessionId: Types.ObjectId | string,
): Promise<void> {
  await AccessToken.updateMany(
    { sessionId, revokedAt: null },
    { revokedAt: new Date() },
  );
}

export async function issueRefreshToken(input: {
  clientId: string;
  userId: Types.ObjectId | string;
  sessionId: Types.ObjectId | string;
  scope: string;
  familyId?: string;
}): Promise<{ token: string; familyId: string }> {
  const env = getEnv();
  const token = generateSecureToken(40);
  const familyId = input.familyId ?? generateSecureToken(16);
  await RefreshToken.create({
    tokenHash: hashToken(token),
    familyId,
    clientId: input.clientId,
    userId: input.userId,
    sessionId: input.sessionId,
    scope: input.scope,
    expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_SECONDS * 1000),
  });
  return { token, familyId };
}

export async function rotateRefreshToken(rawToken: string, clientId: string) {
  const existing = await RefreshToken.findOne({ tokenHash: hashToken(rawToken) });
  if (!existing) {
    return { error: "invalid_grant" as const };
  }

  if (existing.clientId !== clientId) {
    return { error: "invalid_grant" as const };
  }

  if (existing.expiresAt.getTime() <= Date.now()) {
    return { error: "invalid_grant" as const };
  }

  // Reuse detection: previously rotated/revoked token presented again.
  if (existing.revokedAt || existing.replacedByTokenHash) {
    existing.reuseDetectedAt = new Date();
    await existing.save();
    await RefreshToken.updateMany(
      { familyId: existing.familyId, revokedAt: null },
      { revokedAt: new Date() },
    );
    return { error: "reuse_detected" as const, familyId: existing.familyId };
  }

  const next = await issueRefreshToken({
    clientId: existing.clientId,
    userId: existing.userId,
    sessionId: existing.sessionId,
    scope: existing.scope,
    familyId: existing.familyId,
  });

  existing.revokedAt = new Date();
  existing.replacedByTokenHash = hashToken(next.token);
  await existing.save();

  return {
    error: null,
    previous: existing,
    refreshToken: next.token,
    familyId: next.familyId,
  };
}

export async function revokeRefreshTokensForSession(
  sessionId: Types.ObjectId | string,
): Promise<void> {
  await RefreshToken.updateMany(
    { sessionId, revokedAt: null },
    { revokedAt: new Date() },
  );
}
