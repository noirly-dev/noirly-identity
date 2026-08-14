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
  const redirectUri = arg("redirect-uri");
  const postLogout = arg("post-logout", new URL("/", redirectUri).origin + "/");
  const writeEnv = optionalArg("write-env");

  await mongoose.connect(uri);

  const clientSecret = generateSecureToken(32);
  await OAuthClient.findOneAndUpdate(
    { clientId },
    {
      $set: {
        clientSecretHash: await hashPassword(clientSecret),
        name,
        description: `Confidential OAuth client for ${name}`,
        redirectUris: [redirectUri],
        postLogoutRedirectUris: [postLogout],
        allowedScopes: ["openid", "profile", "email", "offline_access", "roles"],
        clientType: "confidential",
        status: "active",
        requirePkce: true,
        requireConsent: false,
      },
      $setOnInsert: { clientId },
    },
    { upsert: true, new: true },
  );

  if (writeEnv) {
    upsertEnvValue(resolve(writeEnv), "AUTH_NOIRLY_CLIENT_ID", clientId);
    upsertEnvValue(resolve(writeEnv), "AUTH_NOIRLY_CLIENT_SECRET", clientSecret);
    console.log(`Registered ${clientId} and wrote credentials to ${writeEnv}`);
  } else {
    console.log("Registered OAuth client");
    console.log("  client_id:", clientId);
    console.log("  client_secret:", clientSecret);
    console.log("  redirect_uri:", redirectUri);
    console.log("  post_logout_redirect_uri:", postLogout);
  }

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
