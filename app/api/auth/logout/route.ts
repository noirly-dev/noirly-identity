import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/api/errors";
import { enforceCsrfForCookieAuth } from "@/lib/api/request";
import { withDb } from "@/lib/api/with-db";
import { logoutCurrentSession } from "@/lib/auth/auth-service";
import {
  clearSessionCookie,
  getSessionTokenFromCookies,
} from "@/lib/security/cookies";
import { jsonResponse } from "@/lib/security/headers";
import {
  revokeAccessTokensForSession,
  revokeRefreshTokensForSession,
} from "@/lib/tokens/token-service";
import { validateSession } from "@/lib/sessions/session-service";

export async function POST(request: NextRequest) {
  try {
    return await withDb(async () => {
      await enforceCsrfForCookieAuth(request);
      const token = await getSessionTokenFromCookies();
      const ctx = await validateSession(token);
      if (ctx) {
        await revokeAccessTokensForSession(ctx.session._id);
        await revokeRefreshTokensForSession(ctx.session._id);
      }
      await logoutCurrentSession(token);
      const response = jsonResponse({ ok: true });
      await clearSessionCookie(response);
      return response;
    });
  } catch (error) {
    return errorResponse(error);
  }
}
