import { describe, expect, it } from "vitest";
import { sanitizeReturnTo, withReturnTo } from "@/lib/auth/return-to";

describe("return_to helpers", () => {
  it("appends return_to without dropping existing query params", () => {
    expect(
      withReturnTo(
        "/check-email?email=ada@noirly.com",
        "/api/oauth/authorize?client_id=noirly-flow",
      ),
    ).toBe(
      "/check-email?email=ada%40noirly.com&return_to=%2Fapi%2Foauth%2Fauthorize%3Fclient_id%3Dnoirly-flow",
    );
  });

  it("keeps same-origin OAuth authorize URLs and rejects others", () => {
    expect(
      sanitizeReturnTo(
        "https://noirly.identity.example/api/oauth/authorize?client_id=noirly-flow",
        "https://noirly.identity.example",
      ),
    ).toBe("/api/oauth/authorize?client_id=noirly-flow");
    expect(
      sanitizeReturnTo("https://evil.example/phish", "https://noirly.identity.example"),
    ).toBeNull();
    expect(sanitizeReturnTo("/login")).toBe("/login");
  });
});
