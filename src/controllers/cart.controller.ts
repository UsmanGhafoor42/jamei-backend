import { Request, Response } from "express";
import CartItem from "../models/cart.model";
import path from "path";

// export const addToCart = async (req: Request, res: Response) => {
//   try {
//     const user = (req as any).user;
//     const {
//       size,
//       options,
//       quantity,
//       total,
//       orderNotes,
//       title,
//       stikersImgeUrl,
//       stikersName,
//       sizeAndQuantity,
//       colorsName,
//       colorsCode,
//     } = req.body;

//     if (!req.file) {
//       return res.status(400).json({ message: "Image file is required" });
//     }

//     const imageUrl = `/uploads/${req.file.filename}`;

//     const cartItem = await CartItem.create({
//       user: user.id,
//       imageUrl,
//       size,
//       title,
//       stikersImgeUrl,
//       stikersName,
//       sizeAndQuantity,
//       colorsName,
//       colorsCode,
//       options,
//       quantity,
//       total,
//       orderNotes,
//     });

//     res.status(201).json({ message: "Added to cart", cartItem });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Error adding to cart" });
//   }
// };

export const addToCart = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    // Main product image (optional safe check)
    let imageUrl = null;
    const imageFile = req.files && (req.files as any)["image"]?.[0];
    if (imageFile) {
      imageUrl = `/uploads/${imageFile.filename}`;
    }

    // Imprint files (optional safe check)
    const imprintFiles = req.files && (req.files as any)["imprintFiles"];
    const stikersImgeUrl = imprintFiles
      ? imprintFiles.map((file: any) => `/uploads/${file.filename}`)
      : [];

    console.log("Sticker image URLs:", stikersImgeUrl);

    const {
      size,
      options,
      quantity,
      total,
      orderNotes,
      title,
      stikersName,
      sizeAndQuantity,
      colorsName,
      colorsCode,
    } = req.body;

    const cartItem = await CartItem.create({
      user: user.id,
      title,
      imageUrl, // can be null if no image uploaded
      stikersImgeUrl,
      stikersName: Array.isArray(stikersName) ? stikersName : [stikersName],
      size,
      sizeAndQuantity: sizeAndQuantity
        ? JSON.parse(sizeAndQuantity)
        : undefined,
      colorsName,
      colorsCode,
      options: Array.isArray(options) ? options : JSON.parse(options || "[]"),
      quantity,
      total,
      orderNotes,
    });

    res.status(201).json({ message: "Added to cart", cartItem });
  } catch (err) {
    console.error("Add to cart error:", err);
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

export const deleteUserCart = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const cartItemId = req.params.id;

    // Find the cart item by id and user
    const cartItem = await CartItem.findOne({ _id: cartItemId, user: user.id });
    if (!cartItem) {
      return res.status(404).json({ message: "Cart item not found" });
    }

    await CartItem.deleteOne({ _id: cartItemId, user: user.id });

    res.json({ message: "Cart item deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting cart item" });
  }
};
