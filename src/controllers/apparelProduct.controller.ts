import { Request, Response } from "express";
import ApparelProduct from "../models/apparelProduct.model";
import multer from "multer";
import path from "path";
import fs from "fs";

// Add a new apparel product
// export const addProduct = async (req: Request, res: Response) => {
//   try {
//     // Get productImage and colorSwatchImages from req.files
//     const productImageFile = (req.files as any)?.productImage?.[0];
//     const colorSwatchFiles = (req.files as any)?.colorSwatchImages || [];
//     const productId = req.body.id || "temp";

//     // // Prepare colorSwatches array with image paths
//     // const colorSwatches = JSON.parse(req.body.colorSwatches).map(
//     //   (swatch: any, idx: number) => ({
//     //     ...swatch,
//     //     image: colorSwatchFiles[idx]
//     //       ? `/uploads/apparel/${req.body.id}/${colorSwatchFiles[idx].filename}`
//     //       : swatch.image,
//     //   })
//     // );

//     // // Prepare productImage path
//     // const productImage = productImageFile
//     //   ? `/uploads/apparel/${req.body.id}/${productImageFile.filename}`
//     //   : req.body.productImage;
//     const host = req.get("host")?.includes("localhost")
//       ? `http://localhost:5000` // For local dev
//       : `${req.protocol}://${req.get("host")}`; // For production

//     const colorSwatches = JSON.parse(req.body.colorSwatches).map(
//       (swatch: any, idx: number) => ({
//         ...swatch,
//         image: colorSwatchFiles[idx]
//           ? `${host}/uploads/apparel/${req.body.id}/${colorSwatchFiles[idx].filename}`
//           : swatch.image,
//       })
//     );

//     const productImage = productImageFile
//       ? `${host}/uploads/apparel/${req.body.id}/${productImageFile.filename}`
//       : req.body.productImage;

//     // Build product data
//     const productData = {
//       ...req.body,
//       productImage,
//       colorSwatches,
//       details: JSON.parse(req.body.details),
//       finishingMeasurementTable: JSON.parse(req.body.finishingMeasurementTable),
//       prices: JSON.parse(req.body.prices),
//     };

//     const product = await ApparelProduct.create(productData);
//     res.status(201).json({ message: "Product created successfully", product });
//   } catch (err) {
//     res.status(500).json({ message: "Error creating product", error: err });
//   }
// };

export const addProduct = async (req: Request, res: Response) => {
  try {
    const productId = req.body.id || "temp";

    // Access uploaded files
    const productImageFile = (req.files as any)?.productImage?.[0];
    const colorSwatchFiles = (req.files as any)?.colorSwatchImages || [];

    // Build base host URL
    const host = req.get("host")?.includes("localhost")
      ? `http://localhost:5000`
      : `${req.protocol}://${req.get("host")}`;

    // Prepare colorSwatches with image URLs
    const colorSwatches = JSON.parse(req.body.colorSwatches).map(
      (swatch: any, idx: number) => ({
        ...swatch,
        image: colorSwatchFiles[idx]
          ? `${host}/uploads/apparel/${productId}/${colorSwatchFiles[idx].filename}`
          : swatch.image,
      })
    );

    // Prepare productImage URL
    const productImage = productImageFile
      ? `${host}/uploads/apparel/${productId}/${productImageFile.filename}`
      : req.body.productImage;

    // Build full product data
    const productData = {
      ...req.body,
      productImage,
      colorSwatches,
      details: JSON.parse(req.body.details),
      finishingMeasurementTable: JSON.parse(req.body.finishingMeasurementTable),
      prices: JSON.parse(req.body.prices),
    };

    // Save to DB
    const product = await ApparelProduct.create(productData);

    res.status(201).json({ message: "Product created successfully", product });
  } catch (err) {
    console.error("Add Product Error:", err);
    res.status(500).json({ message: "Error creating product", error: err });
  }
};

// Get all apparel products
export const getProducts = async (_req: Request, res: Response) => {
  try {
    const products = await ApparelProduct.find();
    res.status(200).json({ products });
  } catch (err) {
    res.status(500).json({ message: "Error fetching products", error: err });
  }
};

// Delete a single apparel product
export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const product = await ApparelProduct.findByIdAndDelete(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Optionally delete the image directory
    const uploadPath = path.join(__dirname, "../uploads/apparel", id);
    if (fs.existsSync(uploadPath)) {
      fs.rmSync(uploadPath, { recursive: true, force: true });
    }

    res.status(200).json({ message: "Product deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting product", error: err });
  }
};

// Get a single apparel product by ID
export const getSingleProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const product = await ApparelProduct.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json({ product });
  } catch (err) {
    res.status(500).json({ message: "Error fetching product", error: err });
  }
};

// Update a single apparel product
export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const productId = id;

    // Check if product exists
    const existingProduct = await ApparelProduct.findById(id);
    if (!existingProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Access uploaded files
    const productImageFile = (req.files as any)?.productImage?.[0];
    const colorSwatchFiles = (req.files as any)?.colorSwatchImages || [];

    // Build base host URL
    const host = req.get("host")?.includes("localhost")
      ? `http://localhost:5000`
      : `${req.protocol}://${req.get("host")}`;

    // Prepare colorSwatches with image URLs
    let colorSwatches = existingProduct.colorSwatches || [];
    if (req.body.colorSwatches) {
      const parsedColorSwatches = JSON.parse(req.body.colorSwatches);
      colorSwatches = parsedColorSwatches.map((swatch: any, idx: number) => ({
        ...swatch,
        image: colorSwatchFiles[idx]
          ? `${host}/uploads/apparel/${productId}/${colorSwatchFiles[idx].filename}`
          : swatch.image || swatch.image, // Keep existing image if no new file
      }));
    }

    // Prepare productImage URL
    let productImage = existingProduct.productImage;
    if (productImageFile) {
      productImage = `${host}/uploads/apparel/${productId}/${productImageFile.filename}`;
    }

    // Build update data
    const updateData: any = {
      ...req.body,
      productImage,
      colorSwatches,
    };

    // Parse JSON fields if they exist
    if (req.body.details) {
      updateData.details = JSON.parse(req.body.details);
    }
    if (req.body.finishingMeasurementTable) {
      updateData.finishingMeasurementTable = JSON.parse(
        req.body.finishingMeasurementTable
      );
    }
    if (req.body.prices) {
      updateData.prices = JSON.parse(req.body.prices);
    }

    // Update the product
    const updatedProduct = await ApparelProduct.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (err) {
    console.error("Update Product Error:", err);
    res.status(500).json({ message: "Error updating product", error: err });
  }
};

// Patch (partial update) a single apparel product
export const patchProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const productId = id;

    // Check if product exists
    const existingProduct = await ApparelProduct.findById(id);
    if (!existingProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Access uploaded files
    const productImageFile = (req.files as any)?.productImage?.[0];
    const colorSwatchFiles = (req.files as any)?.colorSwatchImages || [];

    // Build base host URL
    const host = req.get("host")?.includes("localhost")
      ? `http://localhost:5000`
      : `${req.protocol}://${req.get("host")}`;

    // Build update data - only include fields that are provided
    const updateData: any = {};

    // Handle text fields
    if (req.body.title !== undefined) updateData.title = req.body.title;
    if (req.body.description !== undefined)
      updateData.description = req.body.description;

    // Handle product image
    if (productImageFile) {
      updateData.productImage = `${host}/uploads/apparel/${productId}/${productImageFile.filename}`;
    }

    // Handle color swatches
    if (req.body.colorSwatches) {
      const parsedColorSwatches = JSON.parse(req.body.colorSwatches);
      updateData.colorSwatches = parsedColorSwatches.map(
        (swatch: any, idx: number) => ({
          ...swatch,
          image: colorSwatchFiles[idx]
            ? `${host}/uploads/apparel/${productId}/${colorSwatchFiles[idx].filename}`
            : swatch.image || swatch.image,
        })
      );
    }

    // Handle JSON fields
    if (req.body.details !== undefined) {
      updateData.details = JSON.parse(req.body.details);
    }
    if (req.body.finishingMeasurementTable !== undefined) {
      updateData.finishingMeasurementTable = JSON.parse(
        req.body.finishingMeasurementTable
      );
    }
    if (req.body.prices !== undefined) {
      updateData.prices = JSON.parse(req.body.prices);
    }

    // Update the product with only provided fields
    const updatedProduct = await ApparelProduct.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      message: "Product partially updated successfully",
      product: updatedProduct,
      updatedFields: Object.keys(updateData),
    });
  } catch (err) {
    console.error("Patch Product Error:", err);
    res.status(500).json({ message: "Error updating product", error: err });
  }
};

// Dynamic destination based on productId
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Use a temp id if not present yet (will rename after save)
    const tempId = req.body.id || "temp";
    const uploadPath = path.join(
      __dirname,
      "../../uploads/apparel",
      tempId.toString()
    );
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`);
  },
});

const fileFilter = (_req: any, file: any, cb: any) => {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "application/pdf",
    "image/svg+xml",
    "image/webp",
  ];
  cb(null, allowedTypes.includes(file.mimetype));
};

export const apparelUpload = multer({ storage, fileFilter });
