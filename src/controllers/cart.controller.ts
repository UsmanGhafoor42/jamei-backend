import { Request, Response } from "express";
import CartItem from "../models/cart.model";

// Utility function to convert relative URLs to full URLs
const convertToFullUrl = (url: string, baseUrl: string): string => {
  if (!url) return url;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/uploads/")) return `${baseUrl}${url}`;
  return url;
};

// Utility function to convert array of URLs to full URLs
const convertArrayToFullUrls = (urls: string[], baseUrl: string): string[] => {
  if (!urls || !Array.isArray(urls)) return [];
  return urls.map((url) => convertToFullUrl(url, baseUrl));
};

export const addToCart = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    // Get the base URL for constructing full image URLs
    const baseUrl = process.env.BACKEND_BASE_URL || `http://${req.get("host")}`;

    // Handle file uploads - both single image and multiple imprint files
    let imageUrl = null;
    let stikersImgeUrl: string[] = [];

    // Check for main product image (from individual design file)
    const imageFile = req.files && (req.files as any)["image"]?.[0];
    if (imageFile) {
      imageUrl = convertToFullUrl(`/uploads/${imageFile.filename}`, baseUrl);
    }

    // Check for imprint files (from apparel product)
    const imprintFiles = req.files && (req.files as any)["imprintFiles"];
    if (imprintFiles) {
      stikersImgeUrl = imprintFiles.map((file: any) =>
        convertToFullUrl(`/uploads/${file.filename}`, baseUrl)
      );
    }

    // Extract all possible fields from request body
    const {
      // Basic fields
      productId,
      title,
      orderNotes,

      // Apparel-specific fields
      size,
      sizes, // Size quantities object
      color,
      colorsName,
      colorsCode,
      imprintLocations,

      // Individual design file fields
      quantity,

      // Common fields
      options,
      stikersName,
      sizeAndQuantity,

      // Pricing fields
      total,
      productTotal,
      imprintTotal,
      optionsTotal,
      grandTotal,
    } = req.body;

    // Parse complex fields safely
    let parsedSizes = {};
    if (sizes) {
      try {
        parsedSizes = typeof sizes === "string" ? JSON.parse(sizes) : sizes;
      } catch (e) {
        console.error("Error parsing sizes:", e);
        parsedSizes = {};
      }
    }

    let parsedImprintLocations = [];
    if (imprintLocations) {
      parsedImprintLocations = Array.isArray(imprintLocations)
        ? imprintLocations
        : [imprintLocations];
    }

    let parsedOptions = [];
    if (options) {
      try {
        parsedOptions =
          typeof options === "string" ? JSON.parse(options) : options;
      } catch (e) {
        console.error("Error parsing options:", e);
        parsedOptions = [];
      }
    }

    let parsedStikersName = [];
    if (stikersName) {
      parsedStikersName = Array.isArray(stikersName)
        ? stikersName
        : [stikersName];
    }

    // Calculate quantities and totals
    let finalQuantity = 0;
    let finalTotal = 0;

    // For apparel products with size quantities
    if (Object.keys(parsedSizes).length > 0) {
      finalQuantity = Object.values(parsedSizes).reduce(
        (sum: number, qty: any) => sum + (Number(qty) || 0),
        0
      );
    } else if (quantity) {
      // For individual design files
      finalQuantity = Number(quantity) || 0;
    }

    // Calculate total if not provided
    if (grandTotal) {
      finalTotal = parseFloat(grandTotal) || 0;
    } else if (total) {
      finalTotal = parseFloat(total) || 0;
    } else {
      // Calculate from breakdown if available
      const pTotal = parseFloat(productTotal || "0") || 0;
      const iTotal = parseFloat(imprintTotal || "0") || 0;
      const oTotal = parseFloat(optionsTotal || "0") || 0;
      finalTotal = pTotal + iTotal + oTotal;
    }

    // Create cart item with all fields being optional
    const cartItemData: any = {
      user: user.id,
      title: title || "Custom Product",
    };

    // Add optional fields only if they exist
    if (productId) cartItemData.productId = productId;
    if (imageUrl) cartItemData.imageUrl = imageUrl;
    if (stikersImgeUrl.length > 0) cartItemData.stikersImgeUrl = stikersImgeUrl;
    if (parsedStikersName.length > 0)
      cartItemData.stikersName = parsedStikersName;
    if (parsedImprintLocations.length > 0)
      cartItemData.stikersLocation = parsedImprintLocations;
    if (size) cartItemData.size = size;
    if (Object.keys(parsedSizes).length > 0)
      cartItemData.sizeAndQuantity = parsedSizes;
    if (colorsName) cartItemData.colorsName = colorsName;
    if (color || colorsCode) cartItemData.colorsCode = colorsCode || color;
    if (parsedOptions.length > 0) cartItemData.options = parsedOptions;
    if (finalQuantity > 0) cartItemData.quantity = finalQuantity;
    if (finalTotal > 0) cartItemData.total = finalTotal;
    if (orderNotes) cartItemData.orderNotes = orderNotes;

    // Add pricing breakdown if available
    if (productTotal) cartItemData.productTotal = parseFloat(productTotal) || 0;
    if (imprintTotal) cartItemData.imprintTotal = parseFloat(imprintTotal) || 0;
    if (optionsTotal) cartItemData.optionsTotal = parseFloat(optionsTotal) || 0;
    if (finalTotal > 0) cartItemData.grandTotal = finalTotal;

    // Add imprint data if available
    if (stikersImgeUrl.length > 0) cartItemData.imprintFiles = stikersImgeUrl;
    if (parsedImprintLocations.length > 0)
      cartItemData.imprintLocations = parsedImprintLocations;

    const cartItem = await CartItem.create(cartItemData);

    res.status(201).json({
      message: "Added to cart",
      cartItem,
      type:
        Object.keys(parsedSizes).length > 0 ? "apparel" : "individual_design",
    });
  } catch (err) {
    console.error("Add to cart error:", err);
    res.status(500).json({ message: "Error adding to cart" });
  }
};

export const getUserCart = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    // Get the base URL for constructing full image URLs
    const baseUrl = process.env.BACKEND_BASE_URL || `http://${req.get("host")}`;

    const cart = await CartItem.find({ user: user.id }).sort({ createdAt: -1 });

    // Convert relative URLs to full URLs for images
    const cartWithFullUrls = cart.map((item) => {
      const cartItem = item.toObject();

      // Convert imageUrl to full URL if it exists and is relative
      if (cartItem.imageUrl) {
        cartItem.imageUrl = convertToFullUrl(cartItem.imageUrl, baseUrl);
      }

      // Convert stikersImgeUrl to full URLs if they exist and are relative
      if (cartItem.stikersImgeUrl) {
        cartItem.stikersImgeUrl = convertArrayToFullUrls(
          cartItem.stikersImgeUrl,
          baseUrl
        );
      }

      // Convert imprintFiles to full URLs if they exist and are relative
      if (cartItem.imprintFiles) {
        cartItem.imprintFiles = convertArrayToFullUrls(
          cartItem.imprintFiles,
          baseUrl
        );
      }

      return cartItem;
    });

    res.json(cartWithFullUrls);
  } catch (err) {
    console.error("Error fetching cart:", err);
    res.status(500).json({ message: "Error fetching cart" });
  }
};

export const deleteUserCart = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { userId, cartItemId } = req.params;

    // Validate that both userId and cartItemId are provided
    if (!userId || !cartItemId) {
      return res.status(400).json({
        message: "Both userId and cartItemId are required",
      });
    }

    // Verify that the authenticated user is trying to delete their own cart item
    if (user.id !== userId) {
      return res.status(403).json({
        message: "You can only delete your own cart items",
      });
    }

    // Find the cart item by both cartItemId and userId for double verification
    const cartItem = await CartItem.findOne({
      _id: cartItemId,
      user: userId,
    });

    if (!cartItem) {
      return res.status(404).json({
        message:
          "Cart item not found or you don't have permission to delete it",
      });
    }

    // Delete the cart item
    await CartItem.deleteOne({
      _id: cartItemId,
      user: userId,
    });

    res.json({
      message: "Cart item deleted successfully",
      deletedItem: {
        id: cartItemId,
        title: cartItem.title,
      },
    });
  } catch (error) {
    console.error("Delete cart item error:", error);

    // Handle MongoDB ObjectId validation errors
    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      "kind" in error
    ) {
      if (error.name === "CastError" && error.kind === "ObjectId") {
        return res.status(400).json({
          message: "Invalid cart item ID format",
        });
      }
    }

    res.status(500).json({
      message: "Error deleting cart item",
      error:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : "Internal server error",
    });
  }
};

export const deleteMultipleCartItems = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { userId } = req.params;
    const { cartItemIds } = req.body;

    // Validate that userId is provided
    if (!userId) {
      return res.status(400).json({
        message: "userId is required",
      });
    }

    // Validate that cartItemIds array is provided
    if (
      !cartItemIds ||
      !Array.isArray(cartItemIds) ||
      cartItemIds.length === 0
    ) {
      return res.status(400).json({
        message: "cartItemIds array is required and must not be empty",
      });
    }

    // Verify that the authenticated user is trying to delete their own cart items
    if (user.id !== userId) {
      return res.status(403).json({
        message: "You can only delete your own cart items",
      });
    }

    // Find all cart items by userId and cartItemIds for verification
    const cartItems = await CartItem.find({
      _id: { $in: cartItemIds },
      user: userId,
    });

    if (cartItems.length === 0) {
      return res.status(404).json({
        message:
          "No cart items found or you don't have permission to delete them",
      });
    }

    // Delete all found cart items
    const deleteResult = await CartItem.deleteMany({
      _id: { $in: cartItemIds },
      user: userId,
    });

    res.json({
      message: "Cart items deleted successfully",
      deletedCount: deleteResult.deletedCount,
      deletedItems: cartItems.map((item) => ({
        id: item._id,
        title: item.title,
      })),
    });
  } catch (error) {
    console.error("Delete multiple cart items error:", error);

    // Handle MongoDB ObjectId validation errors
    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      "kind" in error
    ) {
      if (error.name === "CastError" && error.kind === "ObjectId") {
        return res.status(400).json({
          message: "Invalid cart item ID format in the array",
        });
      }
    }

    res.status(500).json({
      message: "Error deleting cart items",
      error:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : "Internal server error",
    });
  }
};
