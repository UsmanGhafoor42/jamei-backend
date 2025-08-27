import express from "express";
import {
  addProduct,
  deleteProduct,
  getProducts,
  getSingleProduct,
  updateProduct,
  patchProduct,
} from "../controllers/apparelProduct.controller";
import { apparelUpload } from "../middlewares/apparelUpload";

const router = express.Router();

/**
 * @swagger
 * /apparel/products:
 *   post:
 *     summary: Create a new apparel product
 *     tags: [ApparelProduct]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - productImage
 *               - description
 *               - details
 *               - finishingMeasurementTable
 *               - colorSwatches
 *               - prices
 *             properties:
 *               title:
 *                 type: string
 *               productImage:
 *                 type: string
 *                 format: binary
 *                 description: Main product image file
 *               description:
 *                 type: string
 *               details:
 *                 type: array
 *                 items:
 *                   type: string
 *               finishingMeasurementTable:
 *                 type: string
 *                 description: JSON stringified 2D array
 *               colorSwatches:
 *                 type: string
 *                 description: JSON stringified array of color swatch objects
 *               prices:
 *                 type: string
 *                 description: JSON stringified array of price objects
 *               slidersImage:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Slider images files (optional, can be multiple)
 *     responses:
 *       201:
 *         description: Product created successfully
 *       400:
 *         description: Missing required field
 *       500:
 *         description: Error creating product
 */
// For product creation: productImage (single), colorSwatchImages (multiple)
router.post(
  "/products",
  apparelUpload.fields([
    { name: "productImage", maxCount: 1 },
    { name: "colorSwatchImages", maxCount: 60 }, // adjust as needed
  ]),
  addProduct
);

/**
 * @swagger
 * /apparel/products:
 *   get:
 *     summary: Get all apparel products
 *     tags: [ApparelProduct]
 *     responses:
 *       200:
 *         description: List of apparel products
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 products:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ApparelProduct'
 *       500:
 *         description: Error fetching products
 */
router.get("/products", getProducts);

/**
 * @swagger
 * /apparel/products/{id}:
 *   put:
 *     summary: Update an existing apparel product
 *     tags: [ApparelProduct]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID to update
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Product title
 *               productImage:
 *                 type: string
 *                 format: binary
 *                 description: Main product image file (optional)
 *               description:
 *                 type: string
 *                 description: Product description
 *               details:
 *                 type: string
 *                 description: JSON stringified array of product details
 *               finishingMeasurementTable:
 *                 type: string
 *                 description: JSON stringified 2D array of measurements
 *               colorSwatches:
 *                 type: string
 *                 description: JSON stringified array of color swatch objects
 *               prices:
 *                 type: string
 *                 description: JSON stringified array of price objects
 *               colorSwatchImages:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Color swatch image files (optional, can be multiple)
 *     responses:
 *       200:
 *         description: Product updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 product:
 *                   $ref: '#/components/schemas/ApparelProduct'
 *       404:
 *         description: Product not found
 *       500:
 *         description: Error updating product
 */
router.put(
  "/products/:id",
  apparelUpload.fields([
    { name: "productImage", maxCount: 1 },
    { name: "colorSwatchImages", maxCount: 60 }, // adjust as needed
  ]),
  updateProduct
);

/**
 * @swagger
 * /apparel/products/{id}:
 *   patch:
 *     summary: Partially update an existing apparel product
 *     tags: [ApparelProduct]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID to update
 *     requestBody:
 *       required: false
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Product title (optional)
 *               productImage:
 *                 type: string
 *                 format: binary
 *                 description: Main product image file (optional)
 *               description:
 *                 type: string
 *                 description: Product description (optional)
 *               details:
 *                 type: string
 *                 description: JSON stringified array of product details (optional)
 *               finishingMeasurementTable:
 *                 type: string
 *                 description: JSON stringified 2D array of measurements (optional)
 *               colorSwatches:
 *                 type: string
 *                 description: JSON stringified array of color swatch objects (optional)
 *               prices:
 *                 type: string
 *                 description: JSON stringified array of price objects (optional)
 *               colorSwatchImages:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Color swatch image files (optional, can be multiple)
 *     responses:
 *       200:
 *         description: Product partially updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 product:
 *                   $ref: '#/components/schemas/ApparelProduct'
 *                 updatedFields:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: List of fields that were updated
 *       404:
 *         description: Product not found
 *       500:
 *         description: Error updating product
 */
router.patch(
  "/products/:id",
  apparelUpload.fields([
    { name: "productImage", maxCount: 1 },
    { name: "colorSwatchImages", maxCount: 60 }, // adjust as needed
  ]),
  patchProduct
);

router.delete("/products/:id", deleteProduct);
router.get("/products/:id", getSingleProduct);
export default router;
