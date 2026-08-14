import { config } from "dotenv";
import { resolve } from "node:path";
import mongoose from "mongoose";
import { OAuthClient } from "../models/OAuthClient";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is required.");
  }

  await mongoose.connect(uri);
  const dbName = mongoose.connection.name;
  const host = mongoose.connection.host;
  const clients = await OAuthClient.find({})
    .select("clientId name status redirectUris postLogoutRedirectUris clientType")
    .lean();

  console.log(`connected database=${dbName} host=${host} clients=${clients.length}`);
  for (const client of clients) {
    console.log(
      JSON.stringify({
        clientId: client.clientId,
        name: client.name,
        status: client.status,
        redirectUris: client.redirectUris,
        postLogoutRedirectUris: client.postLogoutRedirectUris,
      }),
    );
  }

  const mongo = mongoose.connection.getClient();
  for (const extraDb of ["test", "noirly-identity"]) {
    const extra = await mongo
      .db(extraDb)
      .collection("oauthclients")
      .find({})
      .project({ clientId: 1, status: 1, redirectUris: 1, name: 1 })
      .toArray();
    console.log(`db=${extraDb} oauthclients=${extra.length}`);
    for (const client of extra) {
      console.log(JSON.stringify(client));
    }
  }

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
