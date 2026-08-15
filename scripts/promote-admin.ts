import { config } from "dotenv";
import { resolve } from "node:path";
import mongoose from "mongoose";
import { resolveMongoDbName } from "../lib/db/uri";
import { User } from "../models/User";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

function optionalArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const found = process.argv.find((value) => value.startsWith(prefix));
  return found ? found.slice(prefix.length) : undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is required.");
  }

  const email = optionalArg("email")?.trim().toLowerCase();
  const listOnly = hasFlag("list");
  if (!email && !listOnly) {
    throw new Error("Pass --email=you@example.com or --list");
  }

  const dbName = resolveMongoDbName(uri, "noirly-identity");
  await mongoose.connect(uri, dbName ? { dbName } : undefined);
  console.log(`database=${mongoose.connection.name} host=${mongoose.connection.host}`);

  if (listOnly) {
    const users = await User.find({})
      .select("email displayName roles status")
      .sort({ email: 1 })
      .lean();
    for (const user of users) {
      console.log(
        JSON.stringify({
          email: user.email,
          displayName: user.displayName,
          roles: user.roles,
          status: user.status,
        }),
      );
    }
    await mongoose.disconnect();
    return;
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw new Error(`No user found for ${email}`);
  }

  const roles = new Set(user.roles);
  roles.add("user");
  roles.add("admin");
  user.roles = [...roles] as typeof user.roles;
  if (user.status === "pending_verification") {
    user.status = "active";
    user.emailVerified = true;
  }
  await user.save();

  console.log("Promoted to admin");
  console.log("  email:", user.email);
  console.log("  roles:", user.roles.join(", "));
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
