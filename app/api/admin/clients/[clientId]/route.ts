import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/api/errors";
import {
  enforceCsrfForCookieAuth,
  enforceRateLimit,
  readJsonBody,
} from "@/lib/api/request";
import { withDb } from "@/lib/api/with-db";
import { requireAdminUser } from "@/lib/auth/auth-service";
import { deleteAppClient, updateAppClient } from "@/lib/oauth/client-admin";
import { getSessionTokenFromCookies } from "@/lib/security/cookies";
import { jsonResponse } from "@/lib/security/headers";
import {
  oauthClientIdSchema,
  updateOAuthClientSchema,
} from "@/lib/validation/schemas";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ clientId: string }> },
) {
  try {
    return await withDb(async () => {
      await enforceRateLimit(request, "admin-clients-update", 20, 60);
      await enforceCsrfForCookieAuth(request);
      const token = await getSessionTokenFromCookies();
      await requireAdminUser(token);

      const { clientId: rawId } = await context.params;
      const clientId = oauthClientIdSchema.safeParse(rawId);
      if (!clientId.success) {
        return jsonResponse(
          { error: "validation_error", message: "Invalid client_id" },
          { status: 400 },
        );
      }

      const body = await readJsonBody(request);
      const parsed = updateOAuthClientSchema.safeParse(body);
      if (!parsed.success) {
        return jsonResponse(
          {
            error: "validation_error",
            message: "Invalid OAuth client update",
            details: parsed.error.flatten(),
          },
          { status: 400 },
        );
      }

      const result = await updateAppClient(clientId.data, parsed.data);
      return jsonResponse(result);
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ clientId: string }> },
) {
  try {
    return await withDb(async () => {
      await enforceRateLimit(request, "admin-clients-delete", 20, 60);
      await enforceCsrfForCookieAuth(request);
      const token = await getSessionTokenFromCookies();
      await requireAdminUser(token);

      const { clientId: rawId } = await context.params;
      const clientId = oauthClientIdSchema.safeParse(rawId);
      if (!clientId.success) {
        return jsonResponse(
          { error: "validation_error", message: "Invalid client_id" },
          { status: 400 },
        );
      }

      await deleteAppClient(clientId.data);
      return jsonResponse({ deleted: true, clientId: clientId.data });
    });
  } catch (error) {
    return errorResponse(error);
  }
}
