import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/api/errors";
import { enforceRateLimit } from "@/lib/api/request";
import {
  buildGoogleAuthorizationUrl,
  isGoogleOAuthConfigured,
  newGoogleOAuthSecrets,
  pkceChallengeS256,
} from "@/lib/auth/google";
import { safeReturnTo, signOAuthState } from "@/lib/auth/oauth-state";
import { getEnv, isProduction } from "@/lib/config/env";
import { applySecurityHeaders } from "@/lib/security/headers";

const GOOGLE_STATE_COOKIE = "noirly_google_oauth";

export async function GET(request: NextRequest) {
  try {
    await enforceRateLimit(request, "auth-google-start", 20, 60);
    if (!isGoogleOAuthConfigured()) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "google_not_configured", message: "Google sign-in is not configured" },
          { status: 501 },
        ),
      );
    }

    const env = getEnv();
    const secrets = newGoogleOAuthSecrets();
    const returnTo = safeReturnTo(
      request.nextUrl.searchParams.get("return_to"),
      env.APP_URL,
    );
    const signed = signOAuthState({
      state: secrets.state,
      codeVerifier: secrets.codeVerifier,
      returnTo,
      nonce: secrets.nonce,
      exp: Date.now() + 10 * 60 * 1000,
    });

    const authorizeUrl = buildGoogleAuthorizationUrl({
      state: secrets.state,
      nonce: secrets.nonce,
      codeChallenge: pkceChallengeS256(secrets.codeVerifier),
    });

    const response = applySecurityHeaders(NextResponse.redirect(authorizeUrl));
    response.cookies.set(GOOGLE_STATE_COOKIE, signed, {
      httpOnly: true,
      secure: isProduction(),
      sameSite: "lax",
      path: "/api/auth/google",
      maxAge: 600,
    });
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
