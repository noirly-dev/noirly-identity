import { NextRequest } from "next/server";
import { errorResponse, OAuthError } from "@/lib/api/errors";
import { withDb } from "@/lib/api/with-db";
import { buildUserInfo, extractBearerToken } from "@/lib/oidc/userinfo";
import { jsonResponse } from "@/lib/security/headers";

export async function GET(request: NextRequest) {
  try {
    return await withDb(async () => {
      const token = extractBearerToken(request);
      if (!token) {
        throw new OAuthError("invalid_token", "Bearer token required", 401);
      }
      const claims = await buildUserInfo(token);
      return jsonResponse(claims);
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
