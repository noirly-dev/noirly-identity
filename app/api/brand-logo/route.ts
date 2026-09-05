import { isAllowedBrandLogoUrl, resolveBrandLogoUrl } from "@/lib/brand-logo-url";

/** Same-origin proxy so brand SVGs can be inlined and tinted with the active theme. */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const src = requestUrl.searchParams.get("src")?.trim();
  if (!src) {
    return new Response("Missing src", { status: 400 });
  }

  const absolute = resolveBrandLogoUrl(src, requestUrl.origin);
  if (!absolute || !isAllowedBrandLogoUrl(absolute, requestUrl.origin)) {
    return new Response("URL not allowed", { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(absolute, { next: { revalidate: 3600 } });
  } catch {
    return new Response("Failed to fetch logo", { status: 502 });
  }

  if (!upstream.ok) {
    return new Response("Logo not found", { status: upstream.status });
  }

  const text = await upstream.text();
  if (!text.includes("<svg")) {
    return new Response("Not an SVG", { status: 415 });
  }

  return new Response(text, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
