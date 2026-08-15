export type UserRole = "user" | "admin";

export type UserStatus = "active" | "disabled" | "pending_verification";

export type ClientType = "public" | "confidential";

export type ClientStatus = "active" | "disabled";

export type OrganizationRole = "owner" | "admin" | "member";

export type OrganizationStatus = "active" | "disabled";

export const SUPPORTED_SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
  "roles",
  "organizations",
] as const;

export type Scope = (typeof SUPPORTED_SCOPES)[number];

export const INITIAL_SCOPES = ["openid", "profile", "email"] as const;

export type PublicOAuthClient = {
  clientId: string;
  name: string;
  description: string;
  status: ClientStatus;
  clientType: ClientType;
  redirectUris: string[];
  postLogoutRedirectUris: string[];
  allowedScopes: string[];
  requirePkce: boolean;
  requireConsent: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PublicUser = {
  id: string;
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  displayName: string;
  avatarUrl: string | null;
  phoneNumber: string | null;
  hasPassword: boolean;
  status: UserStatus;
  roles: UserRole[];
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
};
