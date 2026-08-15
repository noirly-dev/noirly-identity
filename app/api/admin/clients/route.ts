import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/api/errors";
import {
  enforceCsrfForCookieAuth,
  enforceRateLimit,
  readJsonBody,
} from "@/lib/api/request";
import { withDb } from "@/lib/api/with-db";
import { requireAdminUser } from "@/lib/auth/auth-service";
import { listOAuthClients, registerAppClient } from "@/lib/oauth/client-admin";
import { getSessionTokenFromCookies } from "@/lib/security/cookies";
import { jsonResponse } from "@/lib/security/headers";
import { registerOAuthClientSchema } from "@/lib/validation/schemas";

export async function GET() {
  try {
    return await withDb(async () => {
      const token = await getSessionTokenFromCookies();
      await requireAdminUser(token);
      const clients = await listOAuthClients();
      return jsonResponse({ clients });
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    return await withDb(async () => {
      await enforceRateLimit(request, "admin-clients-register", 20, 60);
      await enforceCsrfForCookieAuth(request);
      const token = await getSessionTokenFromCookies();
      await requireAdminUser(token);
      const body = await readJsonBody(request);
      const parsed = registerOAuthClientSchema.safeParse(body);
      if (!parsed.success) {
        return jsonResponse(
          {
            error: "validation_error",
            message: "Invalid OAuth client payload",
            details: parsed.error.flatten(),
          },
          { status: 400 },
        );
      }
      const result = await registerAppClient(parsed.data);
      return jsonResponse(result, { status: result.created ? 201 : 200 });
    });
  } catch (error) {
    return errorResponse(error);
  }
}
