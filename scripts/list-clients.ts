import { config } from "dotenv";
import { resolve } from "node:path";
import mongoose from "mongoose";
import { resolveMongoDbName } from "../lib/db/uri";
import { OAuthClient } from "../models/OAuthClient";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is required.");
  }

  const dbName = resolveMongoDbName(uri, "noirly-identity");
  await mongoose.connect(uri, dbName ? { dbName } : undefined);
  const connectedDb = mongoose.connection.name;
  const host = mongoose.connection.host;
  const clients = await OAuthClient.find({})
    .select("clientId name status redirectUris postLogoutRedirectUris clientType")
    .lean();

  console.log(
    `connected database=${connectedDb} host=${host} collection=${OAuthClient.collection.collectionName} clients=${clients.length}`,
  );
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
  const listed = await mongo.db().admin().listDatabases();
  console.log(
    "databases",
    listed.databases.map((item) => item.name).join(", "),
  );
  for (const { name: extraDb } of listed.databases) {
    if (["admin", "local", "config"].includes(extraDb)) continue;
    const cols = await mongo.db(extraDb).listCollections().toArray();
    const names = cols.map((col) => col.name);
    console.log(`db=${extraDb} collections=${names.join(",") || "(none)"}`);
    for (const colName of names.filter((name) => /oauth|client/i.test(name))) {
      const extra = await mongo
        .db(extraDb)
        .collection(colName)
        .find({})
        .project({ clientId: 1, status: 1, redirectUris: 1, name: 1 })
        .toArray();
      console.log(`db=${extraDb} ${colName}=${extra.length}`, JSON.stringify(extra));
    }
  }

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
