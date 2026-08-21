import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/api/errors";
import { enforceRateLimit, readJsonBody } from "@/lib/api/request";
import { withDb } from "@/lib/api/with-db";
import { mobileLogout } from "@/lib/mobile/auth";
import { jsonResponse } from "@/lib/security/headers";
import { mobileLogoutSchema } from "@/lib/validation/schemas";

export async function POST(request: NextRequest) {
  try {
    return await withDb(async () => {
      await enforceRateLimit(request, "mobile-logout", 30, 60);
      const body = await readJsonBody(request);
      const parsed = mobileLogoutSchema.safeParse(body);
      if (!parsed.success) {
        return jsonResponse(
          { error: "validation_error", message: "Invalid logout payload" },
          { status: 400 },
        );
      }

      await mobileLogout(parsed.data);
      return jsonResponse({ ok: true });
    });
  } catch (error) {
    return errorResponse(error);
  }
}
