import { describe, expect, it } from "vitest";
import {
  createSession,
  revokeSessionByToken,
  validateSession,
} from "@/lib/sessions/session-service";
import { logoutCurrentSession } from "@/lib/auth/auth-service";
import { createTestUser } from "./helpers";
import { Session } from "@/models/Session";

describe("sessions", () => {
  it("creates and validates a session", async () => {
    const { user } = await createTestUser();
    const { token, session } = await createSession({
      userId: user._id,
      ipAddress: "127.0.0.1",
      userAgent: "vitest",
    });

    const valid = await validateSession(token);
    expect(valid?.userId).toBe(String(user._id));
    expect(String(valid?.session._id)).toBe(String(session._id));
  });

  it("expires sessions", async () => {
    const { user } = await createTestUser({ email: "exp@example.com" });
    const { token, session } = await createSession({
      userId: user._id,
      ttlSeconds: 1,
    });

    await Session.findByIdAndUpdate(session._id, {
      expiresAt: new Date(Date.now() - 1000),
    });

    const valid = await validateSession(token);
    expect(valid).toBeNull();
  });

  it("revokes on logout", async () => {
    const { user } = await createTestUser({ email: "logout@example.com" });
    const { token } = await createSession({ userId: user._id });
    await logoutCurrentSession(token);
    expect(await validateSession(token)).toBeNull();
  });

  it("supports explicit revocation", async () => {
    const { user } = await createTestUser({ email: "revoke@example.com" });
    const { token } = await createSession({ userId: user._id });
    await revokeSessionByToken(token);
    expect(await validateSession(token)).toBeNull();
  });
});
