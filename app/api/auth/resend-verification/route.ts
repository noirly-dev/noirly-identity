import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/api/errors";
import { enforceRateLimit, readJsonBody } from "@/lib/api/request";
import { withDb } from "@/lib/api/with-db";
import { resendEmailVerification } from "@/lib/auth/auth-service";
import { getEnv } from "@/lib/config/env";
import { jsonResponse } from "@/lib/security/headers";
import { resendVerificationSchema } from "@/lib/validation/schemas";

export async function POST(request: NextRequest) {
  try {
    return await withDb(async () => {
      await enforceRateLimit(request, "auth-resend-verification", 10, 60);
      const body = await readJsonBody(request);
      const parsed = resendVerificationSchema.safeParse(body);
      if (!parsed.success) {
        return jsonResponse(
          { error: "validation_error", message: "Invalid request" },
          { status: 400 },
        );
      }

      const result = await resendEmailVerification(parsed.data.email);
      return jsonResponse({
        ok: true,
        message:
          "If an account exists for this email address, a verification email has been sent.",
        cooldownSeconds:
          result.cooldownSeconds ?? getEnv().RESEND_VERIFICATION_COOLDOWN_SECONDS,
      });
    });
  } catch (error) {
    return errorResponse(error);
  }
}
