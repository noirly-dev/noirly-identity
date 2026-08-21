import { Schema, models, model, type Model, type Types } from "mongoose";
import type { ClientStatus, ClientType, Scope } from "@/types";

export type OAuthClientDocument = {
  _id: Types.ObjectId;
  clientId: string;
  clientSecretHash?: string | null;
  name: string;
  description: string;
  redirectUris: string[];
  postLogoutRedirectUris: string[];
  allowedScopes: Scope[];
  clientType: ClientType;
  status: ClientStatus;
  requirePkce: boolean;
  requireConsent: boolean;
  androidSha1Fingerprints: string[];
  createdAt: Date;
  updatedAt: Date;
};

const oauthClientSchema = new Schema<OAuthClientDocument>(
  {
    clientId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    clientSecretHash: {
      type: String,
      default: null,
      select: false,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    redirectUris: {
      type: [String],
      required: true,
      validate: {
        validator: (uris: string[]) => uris.length > 0,
        message: "At least one redirect URI is required",
      },
    },
    postLogoutRedirectUris: {
      type: [String],
      default: [],
    },
    allowedScopes: {
      type: [String],
      default: ["openid", "profile", "email"],
    },
    clientType: {
      type: String,
      enum: ["public", "confidential"],
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "disabled"],
      default: "active",
      index: true,
    },
    requirePkce: { type: Boolean, default: true },
    requireConsent: { type: Boolean, default: true },
    /** Android signing-cert SHA-1 fingerprints (colon-separated uppercase). */
    androidSha1Fingerprints: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

export const OAuthClient: Model<OAuthClientDocument> =
  (models.OAuthClient as Model<OAuthClientDocument>) ||
  model<OAuthClientDocument>("OAuthClient", oauthClientSchema);
