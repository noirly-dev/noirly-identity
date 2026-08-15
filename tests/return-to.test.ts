import { describe, expect, it } from "vitest";
import { sanitizeReturnTo, stripAuthorizePrompt, withPopup, withReturnTo } from "@/lib/auth/return-to";

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

  it("marks popup login links without dropping return_to", () => {
    expect(withPopup("/register", false)).toBe("/register");
    expect(withPopup("/register", true)).toBe("/register?popup=1");
    expect(
      withPopup(
        withReturnTo("/register", "/api/oauth/authorize?client_id=noirly-flow"),
        true,
      ),
    ).toBe(
      "/register?return_to=%2Fapi%2Foauth%2Fauthorize%3Fclient_id%3Dnoirly-flow&popup=1",
    );
  });

  it("strips OIDC prompt after an account is chosen", () => {
    const stripped = stripAuthorizePrompt(
      "/api/oauth/authorize?client_id=noirly-pulse&prompt=select_account&state=abc",
    );
    const params = new URLSearchParams(stripped.split("?")[1]);
    expect(params.get("prompt")).toBeNull();
    expect(params.get("client_id")).toBe("noirly-pulse");
    expect(params.get("state")).toBe("abc");
  });
});
