import { jsonResponse } from "@/lib/security/headers";
import { getEnv } from "@/lib/config/env";
import { isGoogleOAuthConfigured } from "@/lib/auth/google";

export async function GET() {
  const google = isGoogleOAuthConfigured();
  const response = jsonResponse({
    google,
    googleClientId: google ? getEnv().GOOGLE_CLIENT_ID : null,
  });
  response.headers.set("Access-Control-Allow-Origin", "*");
  return response;
}
