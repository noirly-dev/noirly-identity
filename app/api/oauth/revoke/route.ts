import { NextRequest } from "next/server";
import { errorResponse, OAuthError } from "@/lib/api/errors";
import { readFormBody } from "@/lib/api/request";
import { withDb } from "@/lib/api/with-db";
import { getActiveClient } from "@/lib/oauth/clients";
import { verifyPassword } from "@/lib/security/password";
import { hashToken } from "@/lib/security/crypto";
import { jsonResponse } from "@/lib/security/headers";
import { AccessToken } from "@/models/AccessToken";
import { RefreshToken } from "@/models/RefreshToken";

export async function POST(request: NextRequest) {
  try {
    return await withDb(async () => {
      const form = await readFormBody(request);
      const token = form.get("token");
      const tokenTypeHint = form.get("token_type_hint");
      const clientId = form.get("client_id") || undefined;
      const clientSecret = form.get("client_secret") || undefined;

      if (!token) {
        throw new OAuthError("invalid_request", "token is required");
      }

      if (clientId) {
        const client = await getActiveClient(clientId);
        if (client.clientType === "confidential") {
          if (!clientSecret || !client.clientSecretHash) {
            throw new OAuthError("invalid_client", "Client authentication failed", 401);
          }
          const ok = await verifyPassword(client.clientSecretHash, clientSecret);
          if (!ok) {
            throw new OAuthError("invalid_client", "Client authentication failed", 401);
          }
        }
      }

      const tokenHash = hashToken(token);
      let revoked = false;

      if (!tokenTypeHint || tokenTypeHint === "access_token") {
        const result = await AccessToken.findOneAndUpdate(
          { tokenHash, revokedAt: null },
          { revokedAt: new Date() },
        );
        revoked = !!result;
      }

      if ((!tokenTypeHint || tokenTypeHint === "refresh_token") && !revoked) {
        const result = await RefreshToken.findOneAndUpdate(
          { tokenHash, revokedAt: null },
          { revokedAt: new Date() },
        );
        revoked = !!result || revoked;
      }

      // RFC 7009: always return 200 even if token is invalid.
      void revoked;
      return jsonResponse({ revoked: true });
    });
  } catch (error) {
    return errorResponse(error);
  }
}
