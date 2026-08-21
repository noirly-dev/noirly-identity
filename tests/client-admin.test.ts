import { describe, expect, it } from "vitest";
import { originFromAppUrl, slugifyClientId, urisFromOrigins } from "@/lib/oauth/app-origins";
import { registerAppClient, updateAppClient } from "@/lib/oauth/client-admin";
import { OAuthClient } from "@/models/OAuthClient";
import { verifyPassword } from "@/lib/security/password";
import { requireAdminUser } from "@/lib/auth/auth-service";
import { createAuthedSession, createTestUser } from "./helpers";

describe("app origin parsing", () => {
  it("accepts localhost and production origins", () => {
    const uris = urisFromOrigins([
      "http://localhost:3003",
      "https://noirly.ledger.aneesh-pissay.in/",
    ]);
    expect(uris.redirectUris).toEqual([
      "http://localhost:3003/api/auth/callback/noirly",
      "https://noirly.ledger.aneesh-pissay.in/api/auth/callback/noirly",
    ]);
    expect(uris.postLogoutRedirectUris).toEqual([
      "http://localhost:3003/",
      "https://noirly.ledger.aneesh-pissay.in/",
    ]);
  });

  it("treats a full callback URL as its origin", () => {
    expect(
      originFromAppUrl("https://noirly.flow.aneesh-pissay.in/api/auth/callback/noirly"),
    ).toBe("https://noirly.flow.aneesh-pissay.in");
  });

  it("rejects non-http origins", () => {
    expect(() => originFromAppUrl("javascript:alert(1)")).toThrow(/http or https/);
  });

  it("slugifies app names", () => {
    expect(slugifyClientId("Noirly Ledger")).toBe("noirly-ledger");
  });
});

describe("oauth client generator", () => {
  it("creates a confidential client and returns the secret once", async () => {
    const result = await registerAppClient({
      clientId: "noirly-ledger",
      name: "Noirly Ledger",
      origins: [
        "http://localhost:3003",
        "https://noirly.ledger.aneesh-pissay.in",
      ],
    });

    expect(result.created).toBe(true);
    expect(result.clientSecret).toBeTruthy();
    expect(result.client.redirectUris).toContain(
      "https://noirly.ledger.aneesh-pissay.in/api/auth/callback/noirly",
    );

    const stored = await OAuthClient.findOne({ clientId: "noirly-ledger" }).select(
      "+clientSecretHash",
    );
    expect(stored?.clientSecretHash).toBeTruthy();
    expect(await verifyPassword(stored!.clientSecretHash!, result.clientSecret!)).toBe(
      true,
    );
  });

  it("adds origins to an existing client without rotating the secret", async () => {
    const created = await registerAppClient({
      clientId: "noirly-pulse",
      name: "Noirly Pulse",
      origins: ["http://localhost:3004"],
    });
    const stored = await OAuthClient.findOne({ clientId: "noirly-pulse" }).select(
      "+clientSecretHash",
    );
    const previousHash = stored!.clientSecretHash;

    const updated = await registerAppClient({
      clientId: "noirly-pulse",
      name: "Noirly Pulse",
      origins: [
        "http://localhost:3004",
        "https://noirly.pulse.aneesh-pissay.in",
      ],
    });

    expect(updated.created).toBe(false);
    expect(updated.clientSecret).toBeNull();
    expect(updated.client.redirectUris).toEqual([
      "http://localhost:3004/api/auth/callback/noirly",
      "https://noirly.pulse.aneesh-pissay.in/api/auth/callback/noirly",
    ]);
    const after = await OAuthClient.findOne({ clientId: "noirly-pulse" }).select(
      "+clientSecretHash",
    );
    expect(after?.clientSecretHash).toBe(previousHash);
    expect(created.clientSecret).toBeTruthy();
  });

  it("rotates the secret only when requested", async () => {
    await registerAppClient({
      clientId: "noirly-flow",
      name: "Noirly Flow",
      origins: ["http://localhost:3002"],
    });
    const rotated = await updateAppClient("noirly-flow", { rotateSecret: true });
    expect(rotated.clientSecret).toBeTruthy();

    const stored = await OAuthClient.findOne({ clientId: "noirly-flow" }).select(
      "+clientSecretHash",
    );
    expect(await verifyPassword(stored!.clientSecretHash!, rotated.clientSecret!)).toBe(
      true,
    );
  });

  it("rejects non-admin sessions", async () => {
    const { user } = await createTestUser({ email: "member@example.com" });
    const { token } = await createAuthedSession(String(user._id));
    await expect(requireAdminUser(token)).rejects.toMatchObject({ code: "forbidden" });
  });

  it("allows admin sessions", async () => {
    const { user } = await createTestUser({
      email: "admin@example.com",
      roles: ["user", "admin"],
    });
    const { token } = await createAuthedSession(String(user._id));
    const admin = await requireAdminUser(token);
    expect(admin.roles).toContain("admin");
  });

  it("stores android SHA-1 fingerprints on register", async () => {
    const result = await registerAppClient({
      clientId: "noirly-flow-mobile",
      name: "NoirlyFlowMobile",
      origins: ["http://localhost:3002"],
      androidSha1Fingerprints: [
        "aabbccddeeff00112233445566778899aabbccdd",
      ],
    });

    expect(result.client.androidSha1Fingerprints).toEqual([
      "AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD",
    ]);
  });
});
