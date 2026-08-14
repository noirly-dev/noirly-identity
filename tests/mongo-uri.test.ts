import { describe, expect, it } from "vitest";
import { databaseNameFromMongoUri, resolveMongoDbName } from "@/lib/db/uri";

describe("mongo uri db name", () => {
  it("reads an explicit path", () => {
    expect(
      databaseNameFromMongoUri("mongodb://127.0.0.1:27017/noirly-identity"),
    ).toBe("noirly-identity");
  });

  it("defaults Atlas URIs without a path away from test", () => {
    expect(
      resolveMongoDbName(
        "mongodb+srv://user:pass@cluster0.pali5ep.mongodb.net/?appName=Cluster0",
        "noirly-identity",
      ),
    ).toBe("noirly-identity");
    expect(
      resolveMongoDbName(
        "mongodb+srv://user:pass@cluster0.pali5ep.mongodb.net/test?appName=Cluster0",
        "noirly-identity",
      ),
    ).toBe("noirly-identity");
  });

  it("leaves local URIs unchanged", () => {
    expect(
      resolveMongoDbName("mongodb://127.0.0.1:27017/noirly-identity", "noirly-identity"),
    ).toBe("noirly-identity");
    expect(resolveMongoDbName("mongodb://127.0.0.1:27017/", "noirly-identity")).toBeUndefined();
  });
});
