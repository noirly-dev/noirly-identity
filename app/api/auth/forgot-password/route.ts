import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/api/errors";
import { enforceRateLimit, readJsonBody } from "@/lib/api/request";
import { withDb } from "@/lib/api/with-db";
import { requestPasswordReset } from "@/lib/auth/auth-service";
import { jsonResponse } from "@/lib/security/headers";
import { forgotPasswordSchema } from "@/lib/validation/schemas";

export async function POST(request: NextRequest) {
  try {
    return await withDb(async () => {
      await enforceRateLimit(request, "auth-forgot-password", 10, 60);
      const body = await readJsonBody(request);
      const parsed = forgotPasswordSchema.safeParse(body);
      if (!parsed.success) {
        return jsonResponse(
          { error: "validation_error", message: "Invalid request" },
          { status: 400 },
        );
      }
      await requestPasswordReset(parsed.data.email);
      return jsonResponse({
        ok: true,
        message: "If an account exists, a reset email has been sent",
      });
    });
  } catch (error) {
    return errorResponse(error);
  }
}
