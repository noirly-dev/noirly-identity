import { describe, expect, it, vi } from "vitest";
import {
  confirmEmailVerification,
  loginUser,
  registerUser,
  resendEmailVerification,
} from "@/lib/auth/auth-service";
import {
  issueEmailVerification,
  verifyEmailToken,
} from "@/lib/auth/email-tokens";
import { maskEmail, redactSecretInUrl } from "@/lib/email/templates";
import { hashToken } from "@/lib/security/crypto";
import { resetRateLimitStore } from "@/lib/security/rate-limit";
import { EmailVerificationToken } from "@/models/EmailVerificationToken";
import { User } from "@/models/User";
import { createTestUser } from "./helpers";

describe("email masking and redaction", () => {
  it("masks emails", () => {
    expect(maskEmail("aneesh@example.com")).toBe("a***@example.com");
  });

  it("redacts tokens in URLs", () => {
    const url =
      "http://localhost:3000/verify-email?token=super-secret-token-value";
    expect(redactSecretInUrl(url)).toContain("token=%5BREDACTED%5D");
    expect(redactSecretInUrl(url)).not.toContain("super-secret-token-value");
  });
});

describe("email verification tokens", () => {
  it("stores only hashed tokens", async () => {
    const { user } = await createTestUser({
      email: "hashcheck@example.com",
      status: "pending_verification",
    });
    await User.findByIdAndUpdate(user._id, {
      emailVerified: false,
      status: "pending_verification",
    });

    const { token } = await issueEmailVerification(
      user._id,
      "hashcheck@example.com",
      "Hash",
    );

    const stored = await EmailVerificationToken.findOne({ userId: user._id });
    expect(stored).toBeTruthy();
    expect(stored?.tokenHash).toBe(hashToken(token));
    expect(JSON.stringify(stored?.toObject())).not.toContain(token);
  });

  it("verifies a valid token once", async () => {
    const { user } = await createTestUser({
      email: "okverify@example.com",
      status: "pending_verification",
    });
    await User.findByIdAndUpdate(user._id, {
      emailVerified: false,
      status: "pending_verification",
    });

    const { token } = await issueEmailVerification(
      user._id,
      "okverify@example.com",
    );
    const first = await verifyEmailToken(token);
    expect(first.status).toBe("verified");

    const updated = await User.findById(user._id);
    expect(updated?.emailVerified).toBe(true);
    expect(updated?.status).toBe("active");

    const second = await verifyEmailToken(token);
    expect(second.status).toBe("already_verified");
  });

  it("rejects invalid tokens", async () => {
    const result = await verifyEmailToken("this-token-does-not-exist-at-all");
    expect(result.status).toBe("invalid");
  });

  it("rejects expired tokens", async () => {
    const { user } = await createTestUser({
      email: "expired@example.com",
      status: "pending_verification",
    });
    await User.findByIdAndUpdate(user._id, {
      emailVerified: false,
      status: "pending_verification",
    });
    const { token } = await issueEmailVerification(
      user._id,
      "expired@example.com",
    );
    await EmailVerificationToken.updateOne(
      { tokenHash: hashToken(token) },
      { expiresAt: new Date(Date.now() - 1000) },
    );

    const result = await verifyEmailToken(token);
    expect(result.status).toBe("expired");
    const unchanged = await User.findById(user._id);
    expect(unchanged?.emailVerified).toBe(false);
  });

  it("rejects already-used tokens for unverified users", async () => {
    const { user } = await createTestUser({
      email: "usedtoken@example.com",
      status: "pending_verification",
    });
    await User.findByIdAndUpdate(user._id, {
      emailVerified: false,
      status: "pending_verification",
    });
    const { token } = await issueEmailVerification(
      user._id,
      "usedtoken@example.com",
    );
    await EmailVerificationToken.updateOne(
      { tokenHash: hashToken(token) },
      { usedAt: new Date() },
    );

    const result = await verifyEmailToken(token);
    expect(result.status).toBe("used");
  });

  it("reports already verified users", async () => {
    const { user } = await createTestUser({
      email: "already@example.com",
    });
    const { token } = await issueEmailVerification(
      user._id,
      "already@example.com",
    );
    const result = await verifyEmailToken(token);
    expect(result.status).toBe("already_verified");
  });
});

describe("resend verification", () => {
  it("issues a new token and invalidates previous unused tokens", async () => {
    resetRateLimitStore();
    const { user } = await createTestUser({
      email: "resend@example.com",
      status: "pending_verification",
    });
    await User.findByIdAndUpdate(user._id, {
      emailVerified: false,
      status: "pending_verification",
    });

    const first = await issueEmailVerification(user._id, "resend@example.com");
    resetRateLimitStore();
    await resendEmailVerification("resend@example.com");

    const tokens = await EmailVerificationToken.find({ userId: user._id }).sort({
      createdAt: 1,
    });
    expect(tokens.length).toBeGreaterThanOrEqual(2);
    const previous = tokens.find((t) => t.tokenHash === hashToken(first.token));
    expect(previous?.usedAt).toBeTruthy();

    const active = tokens.filter((t) => !t.usedAt);
    expect(active.length).toBe(1);
  });

  it("is a no-op for already verified users", async () => {
    resetRateLimitStore();
    await createTestUser({ email: "verifiedresend@example.com" });
    await expect(
      resendEmailVerification("verifiedresend@example.com"),
    ).resolves.toMatchObject({ cooldownSeconds: expect.any(Number) });
  });

  it("enforces resend cooldown", async () => {
    resetRateLimitStore();
    const { user } = await createTestUser({
      email: "cooldown@example.com",
      status: "pending_verification",
    });
    await User.findByIdAndUpdate(user._id, {
      emailVerified: false,
      status: "pending_verification",
    });

    await resendEmailVerification("cooldown@example.com");
    await expect(resendEmailVerification("cooldown@example.com")).rejects.toMatchObject({
      code: "resend_cooldown",
    });
  });
});

describe("login verification gate", () => {
  it("blocks unverified users from logging in", async () => {
    const password = "StrongPass1!";
    const { user } = await createTestUser({
      email: "needverify@example.com",
      password,
      status: "pending_verification",
    });
    await User.findByIdAndUpdate(user._id, {
      emailVerified: false,
      status: "pending_verification",
    });

    await expect(
      loginUser(
        { email: "needverify@example.com", password },
        { ipAddress: "9.9.9.9" },
      ),
    ).rejects.toMatchObject({ code: "email_not_verified" });
  });
});

describe("registration verification flow", () => {
  it("registers without returning a verification token", async () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const result = await registerUser(
      {
        email: "flow@example.com",
        password: "StrongPass1!",
        firstName: "Flow",
        lastName: "User",
      },
      {},
    );

    expect(result.user.emailVerified).toBe(false);
    expect(JSON.stringify(result)).not.toMatch(/"token"/);
    const logs = spy.mock.calls.map((call) => JSON.stringify(call));
    expect(logs.join("\n")).not.toMatch(/token=[A-Za-z0-9_-]{20,}/);
    spy.mockRestore();
  });
});

describe("confirmEmailVerification helper", () => {
  it("returns structured statuses", async () => {
    const { user } = await createTestUser({
      email: "confirm@example.com",
      status: "pending_verification",
    });
    await User.findByIdAndUpdate(user._id, {
      emailVerified: false,
      status: "pending_verification",
    });
    const { token } = await issueEmailVerification(
      user._id,
      "confirm@example.com",
    );
    await expect(confirmEmailVerification(token)).resolves.toMatchObject({
      status: "verified",
    });
  });
});
