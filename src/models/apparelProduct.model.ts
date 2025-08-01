import mongoose, { Schema, Document } from "mongoose";

interface ColorSwatch {
  name: string;
  hex: string;
  image: string;
}

interface Price {
  size: string;
  price: number;
}

export interface IApparelProduct extends Document {
  title: string;
  productImage: string;
  description: string;
  details: string[];
  finishingMeasurementTable: (string | number)[][];
  colorSwatches: ColorSwatch[];
  prices: Price[];
}

const apparelProductSchema = new Schema<IApparelProduct>({
  title: { type: String, required: true },
  productImage: { type: String, required: true },
  description: { type: String, required: true },
  details: { type: [String], required: true },
  finishingMeasurementTable: { type: [[Schema.Types.Mixed]], required: true },
  colorSwatches: [
    {
      name: { type: String, required: true },
      hex: { type: String, required: true },
      image: { type: String, required: true },
    },
  ],
  prices: [
    {
      size: { type: String, required: true },
      price: { type: Number, required: true },
    },
  ],
});

export default mongoose.model<IApparelProduct>(
  "ApparelProduct",
  apparelProductSchema
);
