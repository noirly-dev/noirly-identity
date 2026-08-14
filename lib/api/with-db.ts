import { connectMongo } from "@/lib/db/mongodb";

export async function withDb<T>(fn: () => Promise<T>): Promise<T> {
  await connectMongo();
  return fn();
}
