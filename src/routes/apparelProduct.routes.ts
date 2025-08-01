import express from "express";
import {
  addProduct,
  deleteProduct,
  getProducts,
  getSingleProduct,
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

router.delete("/products/:id", deleteProduct);
router.get("/products/:id", getSingleProduct);
export default router;
