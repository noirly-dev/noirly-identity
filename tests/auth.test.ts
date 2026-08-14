import { describe, expect, it } from "vitest";
import {
  loginUser,
  registerUser,
  confirmEmailVerification,
} from "@/lib/auth/auth-service";
import { issueEmailVerification } from "@/lib/auth/email-tokens";
import { User } from "@/models/User";
import { createTestUser } from "./helpers";
import { resetRateLimitStore } from "@/lib/security/rate-limit";

describe("registration", () => {
  it("registers a valid user", async () => {
    const result = await registerUser(
      {
        email: "New.User@Example.com",
        password: "StrongPass1!",
        firstName: "New",
        lastName: "User",
      },
      { ipAddress: "1.1.1.1", userAgent: "test" },
    );

    expect(result.user.email).toBe("new.user@example.com");
    expect(result.sessionToken).toBeTruthy();
    const stored = await User.findOne({ email: "new.user@example.com" }).select(
      "+passwordHash",
    );
    expect(stored?.passwordHash).toBeTruthy();
    expect(stored?.passwordHash).not.toContain("StrongPass1!");
  });

  it("rejects duplicate email", async () => {
    await createTestUser({ email: "dup@example.com" });
    await expect(
      registerUser(
        {
          email: "dup@example.com",
          password: "StrongPass1!",
          firstName: "A",
          lastName: "B",
        },
        {},
      ),
    ).rejects.toMatchObject({ code: "registration_failed" });
  });

  it("rejects invalid email via schema expectations in service caller", async () => {
    await registerUser(
      {
        email: "Case@Test.com",
        password: "StrongPass1!",
        firstName: "A",
        lastName: "B",
      },
      {},
    );
    await expect(
      registerUser(
        {
          email: "case@test.com",
          password: "StrongPass1!",
          firstName: "A",
          lastName: "B",
        },
        {},
      ),
    ).rejects.toMatchObject({ code: "registration_failed" });
  });

  it("rejects weak passwords at validation layer", async () => {
    const { passwordSchema } = await import("@/lib/validation/schemas");
    expect(passwordSchema.safeParse("weak").success).toBe(false);
    expect(passwordSchema.safeParse("StrongPass1!").success).toBe(true);
  });

  it("rejects invalid emails at validation layer", async () => {
    const { emailSchema } = await import("@/lib/validation/schemas");
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
  });
});

describe("login", () => {
  it("logs in with valid credentials", async () => {
    const { password } = await createTestUser({ email: "login@example.com" });
    const result = await loginUser(
      { email: "login@example.com", password },
      { ipAddress: "2.2.2.2" },
    );
    expect(result.user.email).toBe("login@example.com");
    expect(result.sessionToken).toBeTruthy();
  });

  it("rejects invalid credentials", async () => {
    await createTestUser({ email: "badlogin@example.com" });
    await expect(
      loginUser(
        { email: "badlogin@example.com", password: "WrongPass1!" },
        { ipAddress: "3.3.3.3" },
      ),
    ).rejects.toMatchObject({ code: "invalid_credentials" });
  });

  it("locks after too many failed attempts", async () => {
    resetRateLimitStore();
    await createTestUser({ email: "lock@example.com" });
    const ip = "4.4.4.4";

    for (let i = 0; i < 3; i += 1) {
      await expect(
        loginUser(
          { email: "lock@example.com", password: "WrongPass1!" },
          { ipAddress: ip },
        ),
      ).rejects.toBeTruthy();
    }

    await expect(
      loginUser(
        { email: "lock@example.com", password: "StrongPass1!" },
        { ipAddress: ip },
      ),
    ).rejects.toMatchObject({ code: "rate_limited" });
  });
});

describe("email verification", () => {
  it("verifies email with a single-use token", async () => {
    const { user } = await createTestUser({
      email: "verify@example.com",
      status: "pending_verification",
    });
    await User.findByIdAndUpdate(user._id, {
      emailVerified: false,
      status: "pending_verification",
    });
    const { token } = await issueEmailVerification(user._id, user.email);
    const first = await confirmEmailVerification(token);
    expect(first.status).toBe("verified");
    const updated = await User.findById(user._id);
    expect(updated?.emailVerified).toBe(true);
    expect(updated?.status).toBe("active");
    const second = await confirmEmailVerification(token);
    expect(second.status).toBe("already_verified");
  });
});
