import { Request, Response } from "express";
import CartItem from "../models/cart.model";
import path from "path";

export const addToCart = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const {
      size,
      options,
      quantity,
      total,
      orderNotes,
      title,
      stikersImgeUrl,
      stikersName,
      sizeAndQuantity,
      colorsName,
      colorsCode,
    } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "Image file is required" });
    }

    const imageUrl = `/uploads/${req.file.filename}`;

    const cartItem = await CartItem.create({
      user: user.id,
      imageUrl,
      size,
      title,
      stikersImgeUrl,
      stikersName,
      sizeAndQuantity,
      colorsName,
      colorsCode,
      options,
      quantity,
      total,
      orderNotes,
    });

    res.status(201).json({ message: "Added to cart", cartItem });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error adding to cart" });
  }
};

export const getUserCart = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const cart = await CartItem.find({ user: user.id }).sort({ createdAt: -1 });
    res.json(cart);
  } catch (err) {
    res.status(500).json({ message: "Error fetching cart" });
  }
};
