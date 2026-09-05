import { cache } from "react";
import { withDb } from "@/lib/api/with-db";
import { getCurrentUser } from "@/lib/auth/auth-service";
import { getSessionTokenFromCookies } from "@/lib/security/cookies";
import type { PublicUser } from "@/types";

/**
 * One session + user lookup per request. Account, clients, and login all share
 * this so navigations do not repeat Mongo work within the same RSC flight.
 */
export const getRequestUser = cache(async (): Promise<PublicUser | null> => {
  const token = await getSessionTokenFromCookies();
  if (!token) {
    return null;
  }
  return withDb(() => getCurrentUser(token));
});
