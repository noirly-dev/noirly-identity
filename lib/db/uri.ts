const ATLAS_URI = /mongodb\+srv:|\.mongodb\.net/i;

export function databaseNameFromMongoUri(uri: string): string | null {
  try {
    const normalized = uri.replace(/^mongodb(\+srv)?:/i, "http:");
    const pathname = new URL(normalized).pathname.replace(/^\//, "");
    const name = pathname.split("/")[0];
    return name ? decodeURIComponent(name) : null;
  } catch {
    return null;
  }
}

export function resolveMongoDbName(uri: string, fallback: string): string | undefined {
  const fromUri = databaseNameFromMongoUri(uri);
  if (ATLAS_URI.test(uri) && (!fromUri || fromUri === "test")) {
    return fallback;
  }
  return fromUri || undefined;
}
