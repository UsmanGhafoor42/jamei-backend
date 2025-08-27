import express from "express";
import { protect } from "../middlewares/auth.middleware";
import {
  addToCart,
  getUserCart,
  deleteUserCart,
  deleteMultipleCartItems,
} from "../controllers/cart.controller";
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
// router.post("/add", protect, upload.single("image"), addToCart);
router.post("/add", protect, upload, addToCart);

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

/**
 * @swagger
 * /cart/delete/{userId}/{cartItemId}:
 *   delete:
 *     summary: Delete a cart item
 *     tags: [Cart]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the user who owns the cart item
 *       - in: path
 *         name: cartItemId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the cart item to delete
 *     responses:
 *       200:
 *         description: Cart item deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 deletedItem:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     title:
 *                       type: string
 *       400:
 *         description: Invalid parameters or cart item ID format
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden - user can only delete their own cart items
 *       404:
 *         description: Cart item not found
 *       500:
 *         description: Internal server error
 */
router.delete("/delete/:userId/:cartItemId", protect, deleteUserCart);

/**
 * @swagger
 * /cart/delete-multiple/{userId}:
 *   delete:
 *     summary: Delete multiple cart items
 *     tags: [Cart]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the user who owns the cart items
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cartItemIds
 *             properties:
 *               cartItemIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of cart item IDs to delete
 *     responses:
 *       200:
 *         description: Cart items deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 deletedCount:
 *                   type: number
 *                 deletedItems:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       title:
 *                         type: string
 *       400:
 *         description: Invalid parameters or cart item ID format
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden - user can only delete their own cart items
 *       404:
 *         description: No cart items found
 *       500:
 *         description: Internal server error
 */
router.delete("/delete-multiple/:userId", protect, deleteMultipleCartItems);

export default router;
