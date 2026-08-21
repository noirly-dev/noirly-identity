import { describe, expect, it } from "vitest";
import {
  normalizeAndroidSha1,
  parseAndroidSha1List,
} from "@/lib/oauth/android-sha1";

describe("android sha1", () => {
  it("normalizes with or without colons", () => {
    expect(
      normalizeAndroidSha1("aabbccddeeff00112233445566778899aabbccdd"),
    ).toBe("AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD");
    expect(
      normalizeAndroidSha1(
        "AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD",
      ),
    ).toBe("AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD");
  });

  it("dedupes a list", () => {
    const list = parseAndroidSha1List([
      "aabbccddeeff00112233445566778899aabbccdd",
      "AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD",
    ]);
    expect(list).toEqual([
      "AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD",
    ]);
  });

  it("rejects invalid length", () => {
    expect(() => normalizeAndroidSha1("deadbeef")).toThrow(/40 hex/);
  });
});
