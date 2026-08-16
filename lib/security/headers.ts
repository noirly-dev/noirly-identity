import { NextResponse } from "next/server";

export function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  response.headers.set("X-DNS-Prefetch-Control", "off");
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export function jsonResponse(
  body: unknown,
  init?: ResponseInit,
): NextResponse {
  const response = NextResponse.json(body, init);
  return applySecurityHeaders(response);
}

/** 303 so POST (One Tap, OIDC form) follows as GET and does not 405. */
export function redirectGet(url: string | URL): NextResponse {
  return applySecurityHeaders(NextResponse.redirect(url, 303));
}
