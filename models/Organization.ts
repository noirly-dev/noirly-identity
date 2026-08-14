import { Schema, models, model, type InferSchemaType, type Model, Types } from "mongoose";
import type { OrganizationStatus } from "@/types";

const organizationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "disabled"] satisfies OrganizationStatus[],
      default: "active",
    },
  },
  {
    timestamps: true,
  },
);

export type OrganizationDocument = InferSchemaType<typeof organizationSchema> & {
  _id: Types.ObjectId;
};

export const Organization: Model<OrganizationDocument> =
  (models.Organization as Model<OrganizationDocument>) ||
  model<OrganizationDocument>("Organization", organizationSchema);
