import { cookies } from "next/headers";
import { getEnv, isProduction } from "@/lib/config/env";
import { generateSecureToken } from "@/lib/security/crypto";
import { jsonResponse } from "@/lib/security/headers";
import { errorResponse } from "@/lib/api/errors";

export async function GET() {
  try {
    const env = getEnv();
    const jar = await cookies();
    let token = jar.get(env.CSRF_COOKIE_NAME)?.value;

    if (!token) {
      token = generateSecureToken(24);
      const response = jsonResponse({ csrfToken: token });
      response.cookies.set(env.CSRF_COOKIE_NAME, token, {
        httpOnly: false,
        secure: isProduction(),
        sameSite: "lax",
        path: "/",
        maxAge: env.SESSION_TTL_SECONDS,
      });
      return response;
    }

    return jsonResponse({ csrfToken: token });
  } catch (error) {
    return errorResponse(error);
  }
}
