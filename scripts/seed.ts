import { config } from "dotenv";
import { resolve } from "node:path";
import mongoose from "mongoose";
import { generateSecureToken } from "../lib/security/crypto";
import { hashPassword } from "../lib/security/password";
import { OAuthClient } from "../models/OAuthClient";
import { User } from "../models/User";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

async function upsertConfidentialClient(input: {
  clientId: string;
  name: string;
  description: string;
  redirectUri: string;
  postLogout: string;
  requireConsent: boolean;
}) {
  const clientSecret = generateSecureToken(32);
  await OAuthClient.findOneAndDelete({ clientId: input.clientId });
  await OAuthClient.create({
    clientId: input.clientId,
    clientSecretHash: await hashPassword(clientSecret),
    name: input.name,
    description: input.description,
    redirectUris: [input.redirectUri],
    postLogoutRedirectUris: [input.postLogout],
    allowedScopes: ["openid", "profile", "email", "offline_access", "roles"],
    clientType: "confidential",
    status: "active",
    requirePkce: true,
    requireConsent: input.requireConsent,
  });
  return { clientSecret, ...input };
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is required. Run npm run env:generate first.");
  }

  await mongoose.connect(uri);

  const email = "dev@noirly.test";
  const password = "NoirlyDev1!";
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      email,
      passwordHash: await hashPassword(password),
      firstName: "Dev",
      lastName: "User",
      displayName: "Dev User",
      emailVerified: true,
      status: "active",
      roles: ["user", "admin"],
    });
    console.log("Created test user");
  } else {
    console.log("Test user already exists");
  }

  const crm = await upsertConfidentialClient({
    clientId: "noirly-crm",
    name: "NoirlyCRM",
    description: "Development OAuth client for Noirly CRM",
    redirectUri: "http://localhost:3001/api/auth/callback/noirly",
    postLogout: "http://localhost:3001/",
    requireConsent: true,
  });

  const flow = await upsertConfidentialClient({
    clientId: "noirly-flow",
    name: "NoirlyFlow",
    description: "Development OAuth client for Noirly Flow",
    redirectUri: "http://localhost:3002/api/auth/callback/noirly",
    postLogout: "http://localhost:3002/",
    requireConsent: false,
  });

  console.log("\n=== Seed complete ===");
  console.log("Test user email:", email);
  console.log("Test user password:", password);
  console.log("\nNoirlyCRM");
  console.log("  client_id:", crm.clientId);
  console.log("  client_secret:", crm.clientSecret);
  console.log("  redirect_uri:", crm.redirectUri);
  console.log("\nNoirlyFlow");
  console.log("  client_id:", flow.clientId);
  console.log("  client_secret:", flow.clientSecret);
  console.log("  redirect_uri:", flow.redirectUri);
  console.log("  Put these in noirly-flow/.env.local:");
  console.log(`  AUTH_NOIRLY_CLIENT_ID=${flow.clientId}`);
  console.log(`  AUTH_NOIRLY_CLIENT_SECRET=${flow.clientSecret}`);
  console.log("=====================\n");

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
