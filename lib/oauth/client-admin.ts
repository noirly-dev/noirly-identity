import { AppError } from "@/lib/api/errors";
import { generateSecureToken } from "@/lib/security/crypto";
import { hashPassword } from "@/lib/security/password";
import {
  parseAndroidSha1List,
  Sha1ParseError,
} from "@/lib/oauth/android-sha1";
import {
  OriginParseError,
  uniqueStrings,
  urisFromOrigins,
} from "@/lib/oauth/app-origins";
import { OAuthClient, type OAuthClientDocument } from "@/models/OAuthClient";
import type { ClientType, PublicOAuthClient } from "@/types";

const DEFAULT_SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
  "roles",
] as const;

export function toPublicOAuthClient(client: OAuthClientDocument): PublicOAuthClient {
  return {
    clientId: client.clientId,
    name: client.name,
    description: client.description,
    status: client.status,
    clientType: client.clientType,
    redirectUris: client.redirectUris,
    postLogoutRedirectUris: client.postLogoutRedirectUris,
    allowedScopes: client.allowedScopes,
    requirePkce: client.requirePkce,
    requireConsent: client.requireConsent,
    androidSha1Fingerprints: client.androidSha1Fingerprints ?? [],
    createdAt: client.createdAt.toISOString(),
    updatedAt: client.updatedAt.toISOString(),
  };
}

export async function listOAuthClients(): Promise<PublicOAuthClient[]> {
  const clients = await OAuthClient.find({})
    .sort({ name: 1, clientId: 1 })
    .exec();
  return clients.map(toPublicOAuthClient);
}

function parseSha1Input(values?: string[]): string[] {
  if (!values?.length) return [];
  try {
    return parseAndroidSha1List(values);
  } catch (error) {
    if (error instanceof Sha1ParseError) {
      throw new AppError(error.message, 400, "validation_error");
    }
    throw error;
  }
}

function parseRedirectUris(values: string[]): string[] {
  const next: string[] = [];
  for (const raw of values) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      throw new AppError(`Invalid redirect URI: ${trimmed}`, 400, "validation_error");
    }
    if (!parsed.protocol || parsed.protocol === "javascript:") {
      throw new AppError(`Invalid redirect URI: ${trimmed}`, 400, "validation_error");
    }
    next.push(trimmed);
  }
  if (next.length === 0) {
    throw new AppError("At least one redirect URI is required", 400, "validation_error");
  }
  return uniqueStrings(next);
}

function resolveUris(input: {
  origins?: string[];
  redirectUris?: string[];
  callbackPath?: string;
}): { redirectUris: string[]; postLogoutRedirectUris: string[] } {
  if (input.redirectUris?.length) {
    const redirectUris = parseRedirectUris(input.redirectUris);
    return {
      redirectUris,
      postLogoutRedirectUris: redirectUris
        .filter((uri) => uri.startsWith("http://") || uri.startsWith("https://"))
        .map((uri) => {
          try {
            return new URL("/", uri).origin + "/";
          } catch {
            return uri;
          }
        }),
    };
  }
  if (input.origins?.length) {
    try {
      const uris = urisFromOrigins(input.origins, input.callbackPath);
      return {
        redirectUris: uris.redirectUris,
        postLogoutRedirectUris: uris.postLogoutRedirectUris,
      };
    } catch (error) {
      if (error instanceof OriginParseError) {
        throw new AppError(error.message, 400, "validation_error");
      }
      throw error;
    }
  }
  throw new AppError(
    "Provide at least one app origin or redirect URI",
    400,
    "validation_error",
  );
}

export async function registerAppClient(input: {
  clientId: string;
  name: string;
  clientType?: ClientType;
  origins?: string[];
  redirectUris?: string[];
  callbackPath?: string;
  requireConsent?: boolean;
  androidSha1Fingerprints?: string[];
}): Promise<{
  client: PublicOAuthClient;
  clientSecret: string | null;
  created: boolean;
}> {
  const clientType = input.clientType ?? "confidential";
  const uris = resolveUris(input);
  const sha1s = parseSha1Input(input.androidSha1Fingerprints);
  const existing = await OAuthClient.findOne({ clientId: input.clientId });

  if (existing) {
    existing.name = input.name;
    existing.redirectUris = uniqueStrings([
      ...existing.redirectUris,
      ...uris.redirectUris,
    ]);
    existing.postLogoutRedirectUris = uniqueStrings([
      ...existing.postLogoutRedirectUris,
      ...uris.postLogoutRedirectUris,
    ]);
    existing.androidSha1Fingerprints = uniqueStrings([
      ...(existing.androidSha1Fingerprints ?? []),
      ...sha1s,
    ]);
    existing.status = "active";
    if (input.requireConsent !== undefined) {
      existing.requireConsent = input.requireConsent;
    }
    await existing.save();
    return {
      client: toPublicOAuthClient(existing),
      clientSecret: null,
      created: false,
    };
  }

  const clientSecret =
    clientType === "confidential" ? generateSecureToken(32) : null;
  const created = await OAuthClient.create({
    clientId: input.clientId,
    clientSecretHash: clientSecret ? await hashPassword(clientSecret) : null,
    name: input.name,
    description:
      clientType === "public"
        ? `Public native OAuth client for ${input.name}`
        : `Confidential OAuth client for ${input.name}`,
    redirectUris: uris.redirectUris,
    postLogoutRedirectUris: uris.postLogoutRedirectUris,
    allowedScopes: [...DEFAULT_SCOPES],
    clientType,
    status: "active",
    requirePkce: true,
    requireConsent: input.requireConsent ?? false,
    androidSha1Fingerprints: sha1s,
  });

  return {
    client: toPublicOAuthClient(created),
    clientSecret,
    created: true,
  };
}

export async function updateAppClient(
  clientId: string,
  input: {
    name?: string;
    clientType?: ClientType;
    origins?: string[];
    redirectUris?: string[];
    callbackPath?: string;
    rotateSecret?: boolean;
    status?: "active" | "disabled";
    requireConsent?: boolean;
    androidSha1Fingerprints?: string[];
    replaceUris?: boolean;
  },
): Promise<{ client: PublicOAuthClient; clientSecret: string | null }> {
  const existing = await OAuthClient.findOne({ clientId }).select("+clientSecretHash");
  if (!existing) {
    throw new AppError("Unknown OAuth client", 404, "not_found");
  }

  if (input.name) {
    existing.name = input.name;
  }

  const hasUriUpdate = Boolean(input.origins?.length || input.redirectUris?.length);
  if (hasUriUpdate) {
    const uris = resolveUris({
      origins: input.origins,
      redirectUris: input.redirectUris,
      callbackPath: input.callbackPath,
    });
    if (input.replaceUris || input.redirectUris?.length) {
      existing.redirectUris = uris.redirectUris;
      existing.postLogoutRedirectUris = uris.postLogoutRedirectUris;
    } else {
      existing.redirectUris = uniqueStrings([
        ...existing.redirectUris,
        ...uris.redirectUris,
      ]);
      existing.postLogoutRedirectUris = uniqueStrings([
        ...existing.postLogoutRedirectUris,
        ...uris.postLogoutRedirectUris,
      ]);
    }
  }

  if (input.androidSha1Fingerprints !== undefined) {
    existing.androidSha1Fingerprints = parseSha1Input(input.androidSha1Fingerprints);
  }
  if (input.status) {
    existing.status = input.status;
  }
  if (input.requireConsent !== undefined) {
    existing.requireConsent = input.requireConsent;
  }

  let clientSecret: string | null = null;
  const nextType = input.clientType ?? existing.clientType;
  if (input.clientType && input.clientType !== existing.clientType) {
    existing.clientType = input.clientType;
    existing.description =
      input.clientType === "public"
        ? `Public native OAuth client for ${existing.name}`
        : `Confidential OAuth client for ${existing.name}`;
    if (input.clientType === "public") {
      existing.clientSecretHash = null;
    } else if (!input.rotateSecret) {
      // Confidential needs a secret; mint one when promoting from public.
      clientSecret = generateSecureToken(32);
      existing.clientSecretHash = await hashPassword(clientSecret);
    }
  }

  if (input.rotateSecret) {
    if (nextType === "public") {
      throw new AppError(
        "Public clients do not have a client secret to rotate",
        400,
        "invalid_client",
      );
    }
    clientSecret = generateSecureToken(32);
    existing.clientSecretHash = await hashPassword(clientSecret);
  }

  await existing.save();
  return { client: toPublicOAuthClient(existing), clientSecret };
}

export async function deleteAppClient(clientId: string): Promise<void> {
  const deleted = await OAuthClient.findOneAndDelete({ clientId });
  if (!deleted) {
    throw new AppError("Unknown OAuth client", 404, "not_found");
  }
}
