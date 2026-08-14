import { config } from "dotenv";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import mongoose from "mongoose";
import { generateSecureToken } from "../lib/security/crypto";
import { hashPassword } from "../lib/security/password";
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

function optionalArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const found = process.argv.find((value) => value.startsWith(prefix));
  return found ? found.slice(prefix.length) : undefined;
}

function csv(value: string): string[] {
  return value
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function upsertEnvValue(filePath: string, key: string, value: string) {
  const current = readFileSync(filePath, "utf8");
  const next = current.includes(`${key}=`)
    ? current.replace(new RegExp(`^${key}=.*$`, "m"), `${key}=${value}`)
    : `${current.trimEnd()}\n${key}=${value}\n`;
  writeFileSync(filePath, next);
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
    optionalArg("post-logout") ??
      [...new Set(redirectUris.map((item) => new URL("/", item).origin + "/"))].join(","),
  );
  const extraDbs = csv(optionalArg("also-db") ?? "test,noirly-identity");
  const writeEnv = optionalArg("write-env");

  await mongoose.connect(uri);
  const connectedDb = mongoose.connection.name;
  const clientSecret = generateSecureToken(32);
  const fields = {
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
  };

  await OAuthClient.findOneAndUpdate(
    { clientId },
    { $set: fields, $setOnInsert: { clientId } },
    { upsert: true, new: true },
  );

  const written = new Set<string>([connectedDb]);
  const mongo = mongoose.connection.getClient();
  for (const dbName of extraDbs) {
    if (written.has(dbName)) continue;
    await mongo.db(dbName).collection("oauthclients").updateOne(
      { clientId },
      {
        $set: { ...fields, clientId },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true },
    );
    written.add(dbName);
  }

  console.log("Registered OAuth client");
  console.log("  client_id:", clientId);
  console.log("  databases:", [...written].join(", "));
  console.log("  redirect_uris:", redirectUris.join(", "));
  console.log("  post_logout_redirect_uris:", postLogoutRedirectUris.join(", "));
  if (writeEnv) {
    upsertEnvValue(resolve(writeEnv), "AUTH_NOIRLY_CLIENT_ID", clientId);
    upsertEnvValue(resolve(writeEnv), "AUTH_NOIRLY_CLIENT_SECRET", clientSecret);
    console.log(`  wrote credentials to ${writeEnv}`);
  } else {
    console.log("  client_secret:", clientSecret);
  }

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
