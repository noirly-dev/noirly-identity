import { NextRequest } from "next/server";
import { getEnv } from "@/lib/config/env";
import {
  checkRateLimit,
  getClientIp,
} from "@/lib/security/rate-limit";
import { AppError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/security/cookies";

export async function enforceRateLimit(
  request: NextRequest,
  bucket: string,
  max?: number,
  windowSeconds?: number,
): Promise<void> {
  const env = getEnv();
  const ip = getClientIp(request);
  const result = checkRateLimit(
    `${bucket}:${ip}`,
    max ?? env.RATE_LIMIT_MAX_REQUESTS,
    windowSeconds ?? env.RATE_LIMIT_WINDOW_SECONDS,
  );
  if (!result.allowed) {
    throw new AppError("Too many requests", 429, "rate_limited", {
      retryAfterSeconds: result.retryAfterSeconds,
    });
  }
}

export async function enforceCsrfForCookieAuth(
  request: NextRequest,
): Promise<void> {
  const ok = await requireCsrf(request);
  if (!ok) {
    throw new AppError("CSRF validation failed", 403, "csrf_failed");
  }
}

export async function readJsonBody<T>(request: NextRequest): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new AppError("Invalid JSON body", 400, "invalid_json");
  }
}

export async function readFormBody(
  request: NextRequest,
): Promise<URLSearchParams> {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const json = await readJsonBody<Record<string, string>>(request);
    return new URLSearchParams(
      Object.entries(json).map(([k, v]) => [k, String(v ?? "")]),
    );
  }
  const text = await request.text();
  return new URLSearchParams(text);
}
