import { NextRequest, NextResponse } from "next/server";
import { errorResponse, oauthRedirectError } from "@/lib/api/errors";
import { enforceCsrfForCookieAuth, readJsonBody } from "@/lib/api/request";
import { withDb } from "@/lib/api/with-db";
import {
  createAuthorizationCode,
  validateAuthorizeRequest,
} from "@/lib/oauth/authorize";
import { applySecurityHeaders } from "@/lib/security/headers";
import { getSessionTokenFromCookies } from "@/lib/security/cookies";
import { consentSchema } from "@/lib/validation/schemas";

export async function POST(request: NextRequest) {
  try {
    return await withDb(async () => {
      await enforceCsrfForCookieAuth(request);
      const body = await readJsonBody(request);
      const parsed = consentSchema.safeParse(body);
      if (!parsed.success) {
        return applySecurityHeaders(
          NextResponse.json(
            {
              error: "invalid_request",
              error_description: "Invalid consent payload",
            },
            { status: 400 },
          ),
        );
      }

      const data = parsed.data;
      const validated = await validateAuthorizeRequest({
        client_id: data.client_id,
        redirect_uri: data.redirect_uri,
        response_type: "code",
        scope: data.scope,
        state: data.state,
        code_challenge: data.code_challenge,
        code_challenge_method: data.code_challenge_method,
        nonce: data.nonce,
      });

      if (data.decision === "deny") {
        return oauthRedirectError(
          data.redirect_uri,
          "access_denied",
          "The resource owner denied the request",
          data.state,
        );
      }

      const sessionToken = await getSessionTokenFromCookies();
      const { code } = await createAuthorizationCode({
        sessionToken,
        clientId: data.client_id,
        redirectUri: data.redirect_uri,
        scope: validated.scopeString,
        codeChallenge: data.code_challenge,
        codeChallengeMethod: data.code_challenge_method,
        nonce: data.nonce,
      });

      const redirect = new URL(data.redirect_uri);
      redirect.searchParams.set("code", code);
      redirect.searchParams.set("state", data.state);
      return applySecurityHeaders(NextResponse.redirect(redirect));
    });
  } catch (error) {
    return errorResponse(error);
  }
}
