import { describe, expect, it } from "vitest";
import { googleProfileFromIdTokenClaims } from "@/lib/auth/google";
import { resolveOneTapReturnTo } from "@/lib/auth/one-tap-return";
import { createTestClient } from "./helpers";

describe("google one tap profile", () => {
  it("maps a verified Google ID token payload", () => {
    const profile = googleProfileFromIdTokenClaims({
      sub: "gid-1",
      email: "Ada@Noirly.com",
      email_verified: true,
      given_name: "Ada",
      family_name: "Lovelace",
      name: "Ada Lovelace",
      picture: "https://example.com/a.png",
    });
    expect(profile.email).toBe("ada@noirly.com");
    expect(profile.sub).toBe("gid-1");
    expect(profile.firstName).toBe("Ada");
  });

  it("rejects unverified emails", () => {
    expect(() =>
      googleProfileFromIdTokenClaims({
        sub: "gid-1",
        email: "ada@noirly.com",
        email_verified: false,
      }),
    ).toThrow(/not verified/);
  });
});

describe("one tap return_to", () => {
  it("keeps same-origin Identity paths", async () => {
    const dest = await resolveOneTapReturnTo("/account");
    expect(dest.endsWith("/account")).toBe(true);
  });

  it("allows registered product origins", async () => {
    await createTestClient({
      redirectUris: ["http://localhost:3002/api/auth/callback/noirly"],
    });
    const dest = await resolveOneTapReturnTo(
      "http://localhost:3002/login/popup?next=%2F",
    );
    expect(dest).toBe("http://localhost:3002/login/popup?next=%2F");
  });

  it("rejects unknown origins", async () => {
    const dest = await resolveOneTapReturnTo("https://evil.example/phish");
    expect(dest.includes("evil.example")).toBe(false);
  });
});
