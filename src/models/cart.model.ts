import mongoose, { Schema, Document } from "mongoose";
import { json } from "node:stream/consumers";
import { JsonObject } from "swagger-ui-express";

interface CartItem extends Document {
  user: mongoose.Types.ObjectId;
  title: string;
  imageUrl?: string;
  stikersImgeUrl?: string[];
  stikersName?: string[];
  size?: string;
  sizeAndQuantity?: Record<string, number>; // e.g. { S: 2, M: 1 }
  options?: string[];
  quantity?: number;
  total: number;
  colorsName?: string;
  colorsCode?: string;
  orderNotes?: string;
  createdAt: Date;
}

const cartSchema = new Schema<CartItem>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    imageUrl: { type: String, required: false },
    stikersImgeUrl: { type: [String], required: false },
    stikersName: { type: [String], default: [] },
    colorsName: { type: String },
    colorsCode: { type: String },
    size: { type: String },
    sizeAndQuantity: { type: Schema.Types.Mixed }, // for object like { S: 2, M: 1 }
    options: { type: [String], default: [] },
    quantity: { type: Number },
    total: { type: Number, required: false },
    orderNotes: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<CartItem>("CartItem", cartSchema);
