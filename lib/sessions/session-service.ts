import type { Types } from "mongoose";
import { getEnv } from "@/lib/config/env";
import { generateSecureToken, hashToken } from "@/lib/security/crypto";
import { Session, type SessionDocument } from "@/models/Session";

export type CreateSessionInput = {
  userId: Types.ObjectId | string;
  ipAddress?: string | null;
  userAgent?: string | null;
  ttlSeconds?: number;
};

export type SessionContext = {
  session: SessionDocument;
  userId: string;
};

export async function createSession(
  input: CreateSessionInput,
): Promise<{ token: string; session: SessionDocument }> {
  const env = getEnv();
  const token = generateSecureToken(32);
  const ttl = input.ttlSeconds ?? env.SESSION_TTL_SECONDS;
  const expiresAt = new Date(Date.now() + ttl * 1000);

  const session = await Session.create({
    userId: input.userId,
    tokenHash: hashToken(token),
    expiresAt,
    lastActivityAt: new Date(),
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
  });

  return { token, session };
}

export async function validateSession(
  token: string | null | undefined,
): Promise<SessionContext | null> {
  if (!token) {
    return null;
  }

  const session = await Session.findOne({ tokenHash: hashToken(token) });
  if (!session) {
    return null;
  }

  if (session.revokedAt) {
    return null;
  }

  if (session.expiresAt.getTime() <= Date.now()) {
    return null;
  }

  session.lastActivityAt = new Date();
  await session.save();

  return {
    session,
    userId: String(session.userId),
  };
}

export async function refreshSessionExpiry(
  sessionId: Types.ObjectId | string,
  ttlSeconds?: number,
): Promise<SessionDocument | null> {
  const ttl = ttlSeconds ?? getEnv().SESSION_TTL_SECONDS;
  return Session.findByIdAndUpdate(
    sessionId,
    {
      expiresAt: new Date(Date.now() + ttl * 1000),
      lastActivityAt: new Date(),
    },
    { new: true },
  );
}

export async function revokeSession(
  sessionId: Types.ObjectId | string,
): Promise<void> {
  await Session.findByIdAndUpdate(sessionId, { revokedAt: new Date() });
}

export async function revokeSessionByToken(token: string): Promise<void> {
  await Session.findOneAndUpdate(
    { tokenHash: hashToken(token) },
    { revokedAt: new Date() },
  );
}

export async function revokeAllUserSessions(
  userId: Types.ObjectId | string,
  exceptSessionId?: Types.ObjectId | string,
): Promise<number> {
  const filter: Record<string, unknown> = {
    userId,
    revokedAt: null,
  };
  if (exceptSessionId) {
    filter._id = { $ne: exceptSessionId };
  }
  const result = await Session.updateMany(filter, { revokedAt: new Date() });
  return result.modifiedCount;
}
