import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/api/errors";
import { enforceCsrfForCookieAuth, enforceRateLimit, readJsonBody } from "@/lib/api/request";
import { withDb } from "@/lib/api/with-db";
import { registerUser } from "@/lib/auth/auth-service";
import { setSessionCookie, ensureCsrfCookie } from "@/lib/security/cookies";
import { jsonResponse } from "@/lib/security/headers";
import { getClientIp } from "@/lib/security/rate-limit";
import { registerSchema } from "@/lib/validation/schemas";

export async function POST(request: NextRequest) {
  try {
    return await withDb(async () => {
      await enforceRateLimit(request, "auth-register", 10, 60);
      await enforceCsrfForCookieAuth(request);
      const body = await readJsonBody(request);
      const parsed = registerSchema.safeParse(body);
      if (!parsed.success) {
        return jsonResponse(
          {
            error: "validation_error",
            message: "Invalid registration payload",
            details: parsed.error.flatten(),
          },
          { status: 400 },
        );
      }

      const result = await registerUser(parsed.data, {
        ipAddress: getClientIp(request),
        userAgent: request.headers.get("user-agent"),
      });

      const response = jsonResponse({ user: result.user }, { status: 201 });
      await setSessionCookie(response, result.sessionToken);
      await ensureCsrfCookie(response);
      return response;
    });
  } catch (error) {
    return errorResponse(error);
  }
}
