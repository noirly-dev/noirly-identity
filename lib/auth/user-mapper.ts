import type { UserDocument } from "@/models/User";
import type { PublicUser } from "@/types";

export function toPublicUser(user: UserDocument): PublicUser {
  return {
    id: String(user._id),
    email: user.email,
    emailVerified: user.emailVerified,
    firstName: user.firstName,
    lastName: user.lastName,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl ?? null,
    phoneNumber: user.phoneNumber ?? null,
    hasPassword: Boolean(user.passwordHash),
    status: user.status,
    roles: user.roles as PublicUser["roles"],
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
  };
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
