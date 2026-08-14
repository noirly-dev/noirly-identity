import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getEnv, isProduction } from "@/lib/config/env";
import { generateSecureToken, safeEqualString } from "@/lib/security/crypto";

export function sessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export function csrfCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: false,
    secure: isProduction(),
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export async function setSessionCookie(
  response: NextResponse,
  token: string,
  maxAgeSeconds?: number,
): Promise<void> {
  const env = getEnv();
  response.cookies.set(
    env.SESSION_COOKIE_NAME,
    token,
    sessionCookieOptions(maxAgeSeconds ?? env.SESSION_TTL_SECONDS),
  );
}

export async function clearSessionCookie(response: NextResponse): Promise<void> {
  const env = getEnv();
  response.cookies.set(env.SESSION_COOKIE_NAME, "", {
    ...sessionCookieOptions(0),
    maxAge: 0,
  });
}

export async function getSessionTokenFromCookies(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(getEnv().SESSION_COOKIE_NAME)?.value ?? null;
}

export async function ensureCsrfCookie(response?: NextResponse): Promise<string> {
  const env = getEnv();
  const jar = await cookies();
  const existing = jar.get(env.CSRF_COOKIE_NAME)?.value;
  if (existing) {
    return existing;
  }

  const token = generateSecureToken(24);
  if (response) {
    response.cookies.set(
      env.CSRF_COOKIE_NAME,
      token,
      csrfCookieOptions(env.SESSION_TTL_SECONDS),
    );
  }
  return token;
}

export function validateCsrfHeader(
  headerToken: string | null,
  cookieToken: string | null,
): boolean {
  if (!headerToken || !cookieToken) {
    return false;
  }
  return safeEqualString(headerToken, cookieToken);
}

export async function requireCsrf(request: Request): Promise<boolean> {
  const env = getEnv();
  const jar = await cookies();
  const cookieToken = jar.get(env.CSRF_COOKIE_NAME)?.value ?? null;
  const headerToken = request.headers.get("x-csrf-token");
  return validateCsrfHeader(headerToken, cookieToken);
}
