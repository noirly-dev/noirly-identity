import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/api/errors";
import { enforceRateLimit, readJsonBody } from "@/lib/api/request";
import { withDb } from "@/lib/api/with-db";
import { mobileLoginWithPassword } from "@/lib/mobile/auth";
import { jsonResponse } from "@/lib/security/headers";
import { getClientIp } from "@/lib/security/rate-limit";
import { mobileLoginSchema } from "@/lib/validation/schemas";

export async function POST(request: NextRequest) {
  try {
    return await withDb(async () => {
      await enforceRateLimit(request, "mobile-login", 20, 60);
      const body = await readJsonBody(request);
      const parsed = mobileLoginSchema.safeParse(body);
      if (!parsed.success) {
        return jsonResponse(
          { error: "validation_error", message: "Invalid login payload" },
          { status: 400 },
        );
      }

      const tokens = await mobileLoginWithPassword(parsed.data, {
        ipAddress: getClientIp(request),
        userAgent: request.headers.get("user-agent"),
      });
      return jsonResponse(tokens);
    });
  } catch (error) {
    return errorResponse(error);
  }
}
