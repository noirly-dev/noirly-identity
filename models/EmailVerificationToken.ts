import { Schema, models, model, type InferSchemaType, type Model, Types } from "mongoose";

const emailVerificationTokenSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

emailVerificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type EmailVerificationTokenDocument = InferSchemaType<
  typeof emailVerificationTokenSchema
> & {
  _id: Types.ObjectId;
};

export const EmailVerificationToken: Model<EmailVerificationTokenDocument> =
  (models.EmailVerificationToken as Model<EmailVerificationTokenDocument>) ||
  model<EmailVerificationTokenDocument>(
    "EmailVerificationToken",
    emailVerificationTokenSchema,
  );
