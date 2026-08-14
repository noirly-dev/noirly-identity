import {
  Schema,
  models,
  model,
  type InferSchemaType,
  type Model,
  type Types,
} from "mongoose";
import type { UserRole, UserStatus } from "@/types";

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    emailVerified: { type: Boolean, default: false },
    passwordHash: { type: String, default: null, select: false },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    displayName: { type: String, required: true, trim: true },
    avatarUrl: { type: String, default: null },
    phoneNumber: { type: String, default: null },
    status: {
      type: String,
      enum: ["active", "disabled", "pending_verification"] satisfies UserStatus[],
      default: "pending_verification",
      index: true,
    },
    roles: {
      type: [String],
      enum: ["user", "admin"] satisfies UserRole[],
      default: ["user"],
    },
    lastLoginAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  },
);

export type UserDocument = InferSchemaType<typeof userSchema> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const User: Model<UserDocument> =
  (models.User as Model<UserDocument>) ||
  model<UserDocument>("User", userSchema);
