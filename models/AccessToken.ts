import { Schema, models, model, type InferSchemaType, type Model, Types } from "mongoose";

const accessTokenSchema = new Schema(
  {
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    clientId: { type: String, required: true, index: true },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: "Session",
      required: true,
      index: true,
    },
    scope: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

accessTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type AccessTokenDocument = InferSchemaType<typeof accessTokenSchema> & {
  _id: Types.ObjectId;
};

export const AccessToken: Model<AccessTokenDocument> =
  (models.AccessToken as Model<AccessTokenDocument>) ||
  model<AccessTokenDocument>("AccessToken", accessTokenSchema);
