import { config } from "dotenv";
import { resolve } from "node:path";
import mongoose from "mongoose";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is required.");
  }

  await mongoose.connect(uri);
  const mongo = mongoose.connection.getClient();
  const source = mongo.db("test").collection("oauthclients");
  const dest = mongo.db("noirly-identity").collection("oauthclients");
  const docs = await source.find({}).toArray();
  let copied = 0;
  for (const doc of docs) {
    const { _id, ...fields } = doc;
    const result = await dest.updateOne(
      { clientId: fields.clientId },
      { $set: { ...fields, updatedAt: new Date() } },
      { upsert: true },
    );
    if (result.upsertedCount || result.modifiedCount) copied += 1;
    void _id;
  }
  console.log(`promoted ${copied} oauth client(s) from test to noirly-identity`);
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
