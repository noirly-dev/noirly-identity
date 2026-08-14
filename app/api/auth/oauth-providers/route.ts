import { jsonResponse } from "@/lib/security/headers";
import { isGoogleOAuthConfigured } from "@/lib/auth/google";

export async function GET() {
  return jsonResponse({
    google: isGoogleOAuthConfigured(),
  });
}
