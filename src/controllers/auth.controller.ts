import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/user.model";
import { generateToken } from "../utils/jwt";
import { sendResetEmail } from "../utils/mailer";
import crypto from "crypto";
import { logger } from "../utils/logger";

export const register = async (req: Request, res: Response) => {
  const { name, email, password } = req.body;
  try {
    const userExists = await User.findOne({ email });
    if (userExists)
      return res.status(400).json({ message: "User already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const newUser = await User.create({ name, email, password: hashed });
    // Explicitly cast newUser._id to string for type safety
    const token = generateToken(String(newUser._id), newUser.role);

    res
      .cookie("token", token, {
        httpOnly: true,
        // secure: process.env.NODE_ENV === "production",
        // // sameSite: "lax",
        // sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        // secure: true, // ✅ Must be true for HTTPS
        // sameSite: "none", // ✅ Required for cross-origin
        secure: process.env.NODE_ENV === "production", // true on live
        sameSite: "none", // required for cross-origin
        domain: ".hotmarketdtf.com",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .status(201)
      .json({ user: newUser });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    // Explicitly cast user._id to string for type safety
    const token = generateToken(String(user._id), user.role);
    res
      .cookie("token", token, {
        httpOnly: true,
        // secure: process.env.NODE_ENV === "production",
        // secure: false,
        // // sameSite: "lax",
        // sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        // secure: true, // ✅ Must be true for HTTPS
        // sameSite: "none", // ✅ Required for cross-origin
        secure: process.env.NODE_ENV === "production", // true on live
        sameSite: "none", // required for cross-origin
        domain: ".hotmarketdtf.com",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .status(200)
      .json({ user });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const token = crypto.randomBytes(32).toString("hex");
    user.resetToken = token;
    user.resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    await sendResetEmail(email, token);
    res.status(200).json({ message: "Reset email sent" });
  } catch (err) {
    res.status(500).json({ message: "Error sending email", error: err });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;
  try {
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() },
    });

    if (!user)
      return res.status(400).json({ message: "Invalid or expired token" });

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    res.status(200).json({ message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ message: "Error resetting password", error: err });
  }
};

export const logout = (req: Request, res: Response) => {
  res.clearCookie("token", {
    httpOnly: true,
    // secure: process.env.NODE_ENV === "production",
    // secure: false,
    // // sameSite: "lax",
    // sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    // secure: true, // ✅ Must be true for HTTPS
    // sameSite: "none", // ✅ Required for cross-origin
    secure: process.env.NODE_ENV === "production", // true on live
    sameSite: "none", // required for cross-origin
    domain: ".hotmarketdtf.com",
  });
  res.status(200).json({ message: "Logged out successfully", user: null });
};

export const me = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    console.log(userId);
    const user = await User.findById(userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
