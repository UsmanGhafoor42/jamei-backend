import mongoose, { Schema, Document } from "mongoose";
import { json } from "node:stream/consumers";
import { JsonObject } from "swagger-ui-express";

interface CartItem extends Document {
  user: mongoose.Types.ObjectId;
  productId: string; // Add product ID reference
  title: string;
  imageUrl?: string;
  stikersImgeUrl?: string[];
  stikersName?: string[];
  stikersLocation?: string[]; // Add imprint locations
  size?: string;
  sizeAndQuantity?: Record<string, number>; // e.g. { S: 2, M: 1 }
  options?: string[];
  quantity?: number;
  total?: number; // Make total optional
  colorsName?: string;
  colorsCode?: string;
  orderNotes?: string;

  // Add pricing breakdown
  productTotal?: number; // Make all pricing fields optional
  imprintTotal?: number;
  optionsTotal?: number;
  grandTotal?: number;

  // Add imprint data
  imprintFiles?: string[];
  imprintLocations?: string[];

  createdAt: Date;
}

const cartSchema = new Schema<CartItem>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    productId: { type: String, required: false }, // Add product ID
    title: { type: String, required: true },
    imageUrl: { type: String, required: false },
    stikersImgeUrl: { type: [String], required: false },
    stikersName: { type: [String], default: [] },
    stikersLocation: { type: [String], default: [] }, // Add imprint locations
    colorsName: { type: String },
    colorsCode: { type: String },
    size: { type: String },
    sizeAndQuantity: { type: Schema.Types.Mixed }, // for object like { S: 2, M: 1 }
    options: { type: [String], default: [] },
    quantity: { type: Number },
    total: { type: Number, required: false }, // Make total optional
    orderNotes: { type: String },

    // Add pricing fields - all optional
    productTotal: { type: Number, required: false },
    imprintTotal: { type: Number, required: false },
    optionsTotal: { type: Number, required: false },
    grandTotal: { type: Number, required: false },

    // Add imprint data
    imprintFiles: { type: [String], default: [] },
    imprintLocations: { type: [String], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model<CartItem>("CartItem", cartSchema);
