import { NextRequest } from "next/server";
import { errorResponse, OAuthError } from "@/lib/api/errors";
import { enforceRateLimit, readFormBody } from "@/lib/api/request";
import { withDb } from "@/lib/api/with-db";
import {
  exchangeAuthorizationCode,
  exchangeRefreshToken,
} from "@/lib/oauth/token";
import { jsonResponse } from "@/lib/security/headers";
import { tokenBodySchema } from "@/lib/validation/schemas";

export async function POST(request: NextRequest) {
  try {
    return await withDb(async () => {
      await enforceRateLimit(request, "oauth-token", 60, 60);
      const form = await readFormBody(request);
      const raw = Object.fromEntries(form.entries());
      const parsed = tokenBodySchema.safeParse(raw);
      if (!parsed.success) {
        throw new OAuthError(
          "invalid_request",
          "Invalid token request parameters",
        );
      }

      const authHeader = request.headers.get("authorization");

      if (parsed.data.grant_type === "authorization_code") {
        const tokens = await exchangeAuthorizationCode({
          code: parsed.data.code,
          redirectUri: parsed.data.redirect_uri,
          clientId: parsed.data.client_id,
          clientSecret: parsed.data.client_secret,
          codeVerifier: parsed.data.code_verifier,
          authorizationHeader: authHeader,
        });
        return jsonResponse(tokens);
      }

      const tokens = await exchangeRefreshToken({
        refreshToken: parsed.data.refresh_token,
        clientId: parsed.data.client_id,
        clientSecret: parsed.data.client_secret,
        scope: parsed.data.scope,
        authorizationHeader: authHeader,
      });
      return jsonResponse(tokens);
    });
  } catch (error) {
    return errorResponse(error);
  }
}
