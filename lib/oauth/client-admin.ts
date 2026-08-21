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
import type { PublicOAuthClient } from "@/types";

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

export async function registerAppClient(input: {
  clientId: string;
  name: string;
  origins: string[];
  callbackPath?: string;
  requireConsent?: boolean;
  androidSha1Fingerprints?: string[];
}): Promise<{
  client: PublicOAuthClient;
  clientSecret: string | null;
  created: boolean;
}> {
  let uris;
  try {
    uris = urisFromOrigins(input.origins, input.callbackPath);
  } catch (error) {
    if (error instanceof OriginParseError) {
      throw new AppError(error.message, 400, "validation_error");
    }
    throw error;
  }
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

  const clientSecret = generateSecureToken(32);
  const created = await OAuthClient.create({
    clientId: input.clientId,
    clientSecretHash: await hashPassword(clientSecret),
    name: input.name,
    description: `Confidential OAuth client for ${input.name}`,
    redirectUris: uris.redirectUris,
    postLogoutRedirectUris: uris.postLogoutRedirectUris,
    allowedScopes: [...DEFAULT_SCOPES],
    clientType: "confidential",
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
    origins?: string[];
    callbackPath?: string;
    rotateSecret?: boolean;
    status?: "active" | "disabled";
    requireConsent?: boolean;
    androidSha1Fingerprints?: string[];
  },
): Promise<{ client: PublicOAuthClient; clientSecret: string | null }> {
  const existing = await OAuthClient.findOne({ clientId }).select("+clientSecretHash");
  if (!existing) {
    throw new AppError("Unknown OAuth client", 404, "not_found");
  }

  if (input.name) {
    existing.name = input.name;
  }
  if (input.origins) {
    let uris;
    try {
      uris = urisFromOrigins(input.origins, input.callbackPath);
    } catch (error) {
      if (error instanceof OriginParseError) {
        throw new AppError(error.message, 400, "validation_error");
      }
      throw error;
    }
    existing.redirectUris = uniqueStrings([
      ...existing.redirectUris,
      ...uris.redirectUris,
    ]);
    existing.postLogoutRedirectUris = uniqueStrings([
      ...existing.postLogoutRedirectUris,
      ...uris.postLogoutRedirectUris,
    ]);
  }
  if (input.androidSha1Fingerprints) {
    existing.androidSha1Fingerprints = uniqueStrings([
      ...(existing.androidSha1Fingerprints ?? []),
      ...parseSha1Input(input.androidSha1Fingerprints),
    ]);
  }
  if (input.status) {
    existing.status = input.status;
  }
  if (input.requireConsent !== undefined) {
    existing.requireConsent = input.requireConsent;
  }

  let clientSecret: string | null = null;
  if (input.rotateSecret) {
    clientSecret = generateSecureToken(32);
    existing.clientSecretHash = await hashPassword(clientSecret);
  }

  await existing.save();
  return { client: toPublicOAuthClient(existing), clientSecret };
}
