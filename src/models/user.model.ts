import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  resetToken?: string;
  resetTokenExpiry?: Date;
  role: "admin" | "user";
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  resetToken: String,
  resetTokenExpiry: Date,
  role: { type: String, enum: ["admin", "user"], default: "user" },
});

export const User = mongoose.model<IUser>("User", UserSchema);
