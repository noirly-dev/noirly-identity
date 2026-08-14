import { buildDiscoveryDocument } from "@/lib/oidc/discovery";
import { jsonResponse } from "@/lib/security/headers";
import { errorResponse } from "@/lib/api/errors";

export async function GET() {
  try {
    const response = jsonResponse(buildDiscoveryDocument());
    response.headers.set("Cache-Control", "public, max-age=3600");
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
