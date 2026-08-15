import { NextRequest, NextResponse } from "next/server";
import { errorResponse, oauthRedirectError } from "@/lib/api/errors";
import { withDb } from "@/lib/api/with-db";
import { getEnv, isProduction } from "@/lib/config/env";
import {
  createAuthorizationCode,
  validateAuthorizeRequest,
} from "@/lib/oauth/authorize";
import { applySecurityHeaders } from "@/lib/security/headers";
import { getSessionTokenFromCookies } from "@/lib/security/cookies";
import { validateSession } from "@/lib/sessions/session-service";
import { authorizeQuerySchema } from "@/lib/validation/schemas";

function buildLoginRedirect(requestUrl: string, popup: boolean): string {
  const env = getEnv();
  const login = new URL("/login", env.APP_URL);
  login.searchParams.set("return_to", requestUrl);
  if (popup) login.searchParams.set("popup", "1");
  return login.toString();
}

function buildConsentRedirect(params: URLSearchParams): string {
  const env = getEnv();
  const consent = new URL("/consent", env.APP_URL);
  for (const [key, value] of params.entries()) {
    consent.searchParams.set(key, value);
  }
  return consent.toString();
}

export async function GET(request: NextRequest) {
  try {
    return await withDb(async () => {
      const raw = Object.fromEntries(request.nextUrl.searchParams.entries());
      const parsed = authorizeQuerySchema.safeParse(raw);

      if (!parsed.success) {
        return applySecurityHeaders(
          NextResponse.json(
            {
              error: "invalid_request",
              error_description: "Invalid authorization request parameters",
              details: parsed.error.flatten(),
            },
            { status: 400 },
          ),
        );
      }

      const { display, ...params } = parsed.data;

      let validated;
      try {
        validated = await validateAuthorizeRequest(params);
      } catch (error) {
        // Do not redirect on invalid client/redirect — prevent open redirects.
        return errorResponse(error);
      }

      const sessionToken = await getSessionTokenFromCookies();
      const session = await validateSession(sessionToken);

      if (!session) {
        if (params.prompt === "none") {
          return oauthRedirectError(
            params.redirect_uri,
            "login_required",
            "Authentication required",
            params.state,
          );
        }
        return applySecurityHeaders(
          (() => {
            const response = NextResponse.redirect(
              buildLoginRedirect(request.nextUrl.toString(), display === "popup"),
            );
            response.cookies.set("noirly_oauth_return", request.nextUrl.toString(), {
              httpOnly: false,
              sameSite: "lax",
              secure: isProduction(),
              path: "/",
              maxAge: 60 * 60,
            });
            return response;
          })(),
        );
      }

      const needsConsent =
        validated.client.requireConsent || params.prompt === "consent";

      if (needsConsent) {
        if (params.prompt === "none") {
          return oauthRedirectError(
            params.redirect_uri,
            "consent_required",
            "Consent required",
            params.state,
          );
        }
        return applySecurityHeaders(
          NextResponse.redirect(
            buildConsentRedirect(request.nextUrl.searchParams),
          ),
        );
      }

      const { code } = await createAuthorizationCode({
        sessionToken,
        clientId: params.client_id,
        redirectUri: params.redirect_uri,
        scope: validated.scopeString,
        codeChallenge: params.code_challenge,
        codeChallengeMethod: params.code_challenge_method,
        nonce: params.nonce,
      });

      const redirect = new URL(params.redirect_uri);
      redirect.searchParams.set("code", code);
      redirect.searchParams.set("state", params.state);
      return applySecurityHeaders(NextResponse.redirect(redirect));
    });
  } catch (error) {
    return errorResponse(error);
  }
}
