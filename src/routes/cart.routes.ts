import express from "express";
import { protect } from "../middlewares/auth.middleware";
import { addToCart, getUserCart } from "../controllers/cart.controller";
import { upload } from "../middlewares/upload";

const router = express.Router();

/**
 * @swagger
 * /cart/add:
 *   post:
 *     summary: Add item to cart
 *     tags: [Cart]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *               - title
 *               - size
 *               - sizeAndQuantity
 *               - quantity
 *               - total
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Main image file for the cart item
 *               title:
 *                 type: string
 *                 description: Product title
 *               stikersImgeUrl:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: URLs of uploaded sticker images
 *               stikersName:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Names of stickers
 *               colorsName:
 *                 type: string
 *                 description: Name of the selected color
 *               colorsCode:
 *                 type: string
 *                 description: Hex code of the selected color
 *               size:
 *                 type: string
 *                 description: Main size selected
 *               sizeAndQuantity:
 *                 type: object
 *                 additionalProperties:
 *                   type: integer
 *                 description: "Object with size as key and quantity as value (e.g. { S: 2, M: 1 })"
 *               options:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Extra options selected
 *               quantity:
 *                 type: integer
 *                 description: Total quantity
 *               total:
 *                 type: number
 *                 description: Total price for the item
 *               orderNotes:
 *                 type: string
 *                 description: Optional notes for the order
 *     responses:
 *       201:
 *         description: Item added to cart
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 cartItem:
 *                   $ref: '#/components/schemas/CartItem'
 *       400:
 *         description: Image file is required
 *       401:
 *         description: Not authorized
 */
router.post("/add", protect, upload.single("image"), addToCart);

/**
 * @swagger
 * /cart/mine:
 *   get:
 *     summary: Get current user's cart
 *     tags: [Cart]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User's cart
 *       401:
 *         description: Not authorized
 */
router.get("/mine", protect, getUserCart);

export default router;
