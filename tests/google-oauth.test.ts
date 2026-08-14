import { describe, expect, it } from "vitest";
import { loginWithGoogleProfile } from "@/lib/auth/google";
import { loginUser } from "@/lib/auth/auth-service";
import { LinkedAccount } from "@/models/LinkedAccount";
import { User } from "@/models/User";
import { createTestUser } from "./helpers";
import { readOAuthState, safeReturnTo, signOAuthState } from "@/lib/auth/oauth-state";

function googleProfile(overrides?: Partial<Parameters<typeof loginWithGoogleProfile>[0]>) {
  return {
    sub: "google-sub-123",
    email: "google.user@example.com",
    emailVerified: true,
    firstName: "Gita",
    lastName: "User",
    displayName: "Gita User",
    avatarUrl: "https://example.com/a.png",
    ...overrides,
  };
}

describe("google login", () => {
  it("creates a verified user without a password", async () => {
    const result = await loginWithGoogleProfile(googleProfile(), {
      ipAddress: "1.1.1.1",
    });

    expect(result.user.email).toBe("google.user@example.com");
    expect(result.user.emailVerified).toBe(true);
    expect(result.user.status).toBe("active");
    expect(result.sessionToken).toBeTruthy();

    const stored = await User.findOne({ email: "google.user@example.com" }).select(
      "+passwordHash",
    );
    expect(stored?.passwordHash).toBeFalsy();

    const link = await LinkedAccount.findOne({
      provider: "google",
      providerAccountId: "google-sub-123",
    });
    expect(String(link?.userId)).toBe(result.user.id);
  });

  it("links Google to an existing email account", async () => {
    const { user } = await createTestUser({ email: "existing@example.com" });
    const result = await loginWithGoogleProfile(
      googleProfile({
        email: "existing@example.com",
        sub: "google-existing",
      }),
      {},
    );

    expect(result.user.id).toBe(String(user._id));
    const link = await LinkedAccount.findOne({
      provider: "google",
      providerAccountId: "google-existing",
    });
    expect(String(link?.userId)).toBe(String(user._id));
  });

  it("reuses a previously linked Google account", async () => {
    const first = await loginWithGoogleProfile(googleProfile({ sub: "stable-sub" }), {});
    const second = await loginWithGoogleProfile(googleProfile({ sub: "stable-sub" }), {});
    expect(second.user.id).toBe(first.user.id);
    expect(await LinkedAccount.countDocuments({ providerAccountId: "stable-sub" })).toBe(1);
  });

  it("does not allow password login for Google-only accounts", async () => {
    await loginWithGoogleProfile(googleProfile({ email: "nopw@example.com" }), {});
    await expect(
      loginUser(
        { email: "nopw@example.com", password: "Anything1!" },
        { ipAddress: "2.2.2.2" },
      ),
    ).rejects.toMatchObject({ code: "invalid_credentials" });
  });
});

describe("oauth state", () => {
  it("round-trips signed state", () => {
    const signed = signOAuthState({
      state: "abc",
      codeVerifier: "verifier-value-here",
      returnTo: "/api/oauth/authorize?x=1",
      nonce: "n",
      exp: Date.now() + 60_000,
    });
    const read = readOAuthState(signed);
    expect(read?.state).toBe("abc");
    expect(read?.returnTo).toBe("/api/oauth/authorize?x=1");
  });

  it("rejects tampered state", () => {
    const signed = signOAuthState({
      state: "abc",
      codeVerifier: "verifier-value-here",
      returnTo: "/",
      nonce: "n",
      exp: Date.now() + 60_000,
    });
    const [body, sig] = signed.split(".");
    expect(readOAuthState(`${body}tamper.${sig}`)).toBeNull();
    expect(readOAuthState(`${body}.${sig.slice(0, -2)}aa`)).toBeNull();
  });

  it("blocks open redirects", () => {
    expect(safeReturnTo("https://evil.example/phish", "http://localhost:3000")).toBe("/");
    expect(safeReturnTo("/login", "http://localhost:3000")).toBe("/login");
    expect(
      safeReturnTo("http://localhost:3000/api/oauth/authorize?x=1", "http://localhost:3000"),
    ).toBe("/api/oauth/authorize?x=1");
  });
});
