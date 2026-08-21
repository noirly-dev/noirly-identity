import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/api/errors";
import { enforceRateLimit, readJsonBody } from "@/lib/api/request";
import { withDb } from "@/lib/api/with-db";
import { mobileRefreshTokens } from "@/lib/mobile/auth";
import { jsonResponse } from "@/lib/security/headers";
import { mobileRefreshSchema } from "@/lib/validation/schemas";

export async function POST(request: NextRequest) {
  try {
    return await withDb(async () => {
      await enforceRateLimit(request, "mobile-refresh", 60, 60);
      const body = await readJsonBody(request);
      const parsed = mobileRefreshSchema.safeParse(body);
      if (!parsed.success) {
        return jsonResponse(
          { error: "validation_error", message: "Invalid refresh payload" },
          { status: 400 },
        );
      }

      const tokens = await mobileRefreshTokens(parsed.data);
      return jsonResponse(tokens);
    });
  } catch (error) {
    return errorResponse(error);
  }
}
