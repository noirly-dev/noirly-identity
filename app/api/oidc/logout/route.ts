import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/api/errors";
import { withDb } from "@/lib/api/with-db";
import { getEnv } from "@/lib/config/env";
import { performLogout } from "@/lib/oidc/logout";
import { clearSessionCookie } from "@/lib/security/cookies";
import { applySecurityHeaders, jsonResponse } from "@/lib/security/headers";

export async function GET(request: NextRequest) {
  try {
    return await withDb(async () => {
      const params = request.nextUrl.searchParams;
      const result = await performLogout({
        idTokenHint: params.get("id_token_hint"),
        postLogoutRedirectUri: params.get("post_logout_redirect_uri"),
        clientId: params.get("client_id"),
        state: params.get("state"),
      });

      if (result.redirectTo) {
        const response = applySecurityHeaders(
          NextResponse.redirect(result.redirectTo),
        );
        await clearSessionCookie(response);
        return response;
      }

      const response = applySecurityHeaders(
        NextResponse.redirect(new URL("/login?logged_out=1", getEnv().APP_URL)),
      );
      await clearSessionCookie(response);
      return response;
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    return await withDb(async () => {
      const contentType = request.headers.get("content-type") || "";
      let params: URLSearchParams;
      if (contentType.includes("application/json")) {
        const body = (await request.json()) as Record<string, string>;
        params = new URLSearchParams(body);
      } else {
        params = new URLSearchParams(await request.text());
      }

      const result = await performLogout({
        idTokenHint: params.get("id_token_hint"),
        postLogoutRedirectUri: params.get("post_logout_redirect_uri"),
        clientId: params.get("client_id"),
        state: params.get("state"),
      });

      const response = jsonResponse({ ok: true, redirectTo: result.redirectTo });
      await clearSessionCookie(response);
      return response;
    });
  } catch (error) {
    return errorResponse(error);
  }
}
