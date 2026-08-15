import { config } from "dotenv";
import { resolve } from "node:path";
import mongoose from "mongoose";
import { generateSecureToken } from "../lib/security/crypto";
import { hashPassword } from "../lib/security/password";
import { resolveMongoDbName } from "../lib/db/uri";
import { OAuthClient } from "../models/OAuthClient";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

function arg(name: string, fallback?: string): string {
  const prefix = `--${name}=`;
  const found = process.argv.find((value) => value.startsWith(prefix));
  const value = found ? found.slice(prefix.length) : fallback;
  if (!value) {
    throw new Error(`Missing --${name}=`);
  }
  return value;
}

function csv(value: string): string[] {
  return value
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is required.");
  }

  const clientId = arg("client-id");
  const name = arg("name", clientId);
  const redirectUris = csv(arg("redirect-uri"));
  const postLogoutRedirectUris = csv(
    arg(
      "post-logout",
      [...new Set(redirectUris.map((item) => new URL("/", item).origin + "/"))].join(","),
    ),
  );

  const dbName = resolveMongoDbName(uri, "noirly-identity");
  await mongoose.connect(uri, dbName ? { dbName } : undefined);
  const connectedDb = mongoose.connection.name;

  const existing = await OAuthClient.findOne({ clientId }).select("+clientSecretHash");
  if (existing) {
    const nextRedirects = [...new Set([...existing.redirectUris, ...redirectUris])];
    const nextLogouts = [
      ...new Set([...existing.postLogoutRedirectUris, ...postLogoutRedirectUris]),
    ];
    existing.redirectUris = nextRedirects;
    existing.postLogoutRedirectUris = nextLogouts;
    existing.status = "active";
    if (name) existing.name = name;
    await existing.save();
    console.log("Updated existing OAuth client (secret unchanged)");
    console.log("  database:", connectedDb);
    console.log("  client_id:", clientId);
    console.log("  redirect_uris:", nextRedirects.join(", "));
    console.log("  post_logout_redirect_uris:", nextLogouts.join(", "));
  } else {
    const clientSecret = generateSecureToken(32);
    await OAuthClient.create({
      clientId,
      clientSecretHash: await hashPassword(clientSecret),
      name,
      description: `Confidential OAuth client for ${name}`,
      redirectUris,
      postLogoutRedirectUris,
      allowedScopes: ["openid", "profile", "email", "offline_access", "roles"],
      clientType: "confidential",
      status: "active",
      requirePkce: true,
      requireConsent: false,
    });
    console.log("Created OAuth client");
    console.log("  database:", connectedDb);
    console.log("  client_id:", clientId);
    console.log("  redirect_uris:", redirectUris.join(", "));
    console.log("  post_logout_redirect_uris:", postLogoutRedirectUris.join(", "));
    console.log("  client_secret:", clientSecret);
  }

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
