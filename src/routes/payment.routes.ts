import express from "express";
import { protect } from "../middlewares/auth.middleware";
import {
  processPayment,
  getUserOrders,
  getOrderDetails,
  reorderItems,
  testPaymentConfig,
  testAuthorizeNetConnection,
  testDatabase,
  testAuthorizeNetSDK,
} from "../controllers/payment.controller";

const router = express.Router();

/**
 * @swagger
 * /payment/process:
 *   post:
 *     summary: Process payment and create order
 *     tags: [Payment]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentData
 *               - customerInfo
 *               - shippingInfo
 *               - cartItems
 *               - pricing
 *             properties:
 *               paymentData:
 *                 type: object
 *                 properties:
 *                   cardNumber:
 *                     type: string
 *                   expirationDate:
 *                     type: string
 *                   cvv:
 *                     type: string
 *               customerInfo:
 *                 type: object
 *                 properties:
 *                   firstName:
 *                     type: string
 *                   lastName:
 *                     type: string
 *                   email:
 *                     type: string
 *                   phone:
 *                     type: string
 *                   address:
 *                     type: object
 *                     properties:
 *                       street:
 *                         type: string
 *                       city:
 *                         type: string
 *                       state:
 *                         type: string
 *                       zipCode:
 *                         type: string
 *                       country:
 *                         type: string
 *               shippingInfo:
 *                 type: object
 *                 properties:
 *                   method:
 *                     type: string
 *                   address:
 *                     type: object
 *               cartItems:
 *                 type: array
 *                 items:
 *                   type: object
 *               pricing:
 *                 type: object
 *                 properties:
 *                   subtotal:
 *                     type: number
 *                   tax:
 *                     type: number
 *                   shipping:
 *                     type: number
 *                   discount:
 *                     type: number
 *                   total:
 *                     type: number
 *     responses:
 *       201:
 *         description: Payment processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 order:
 *                   type: object
 *                 transactionId:
 *                   type: string
 *       400:
 *         description: Payment failed or missing information
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Internal server error
 */
router.post("/process", protect, processPayment);

/**
 * @swagger
 * /payment/orders:
 *   get:
 *     summary: Get user's past orders
 *     tags: [Payment]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User's orders
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Order'
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Internal server error
 */
router.get("/orders", protect, getUserOrders);

/**
 * @swagger
 * /payment/orders/{orderId}:
 *   get:
 *     summary: Get single order details
 *     tags: [Payment]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       404:
 *         description: Order not found
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Internal server error
 */
router.get("/orders/:orderId", protect, getOrderDetails);

/**
 * @swagger
 * /payment/orders/{orderId}/reorder:
 *   post:
 *     summary: Reorder items from a past order
 *     tags: [Payment]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID to reorder from
 *     responses:
 *       200:
 *         description: Items added to cart successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 addedItems:
 *                   type: number
 *       404:
 *         description: Order not found
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Internal server error
 */
router.post("/orders/:orderId/reorder", protect, reorderItems);

/**
 * @swagger
 * /payment/test-config:
 *   get:
 *     summary: Test payment configuration
 *     tags: [Payment]
 *     responses:
 *       200:
 *         description: Payment configuration status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 config:
 *                   type: object
 *                 ready:
 *                   type: boolean
 */
router.get("/test-config", testPaymentConfig);

/**
 * @swagger
 * /payment/test-authorize:
 *   get:
 *     summary: Test Authorize.net connection
 *     tags: [Payment]
 *     responses:
 *       200:
 *         description: Authorize.net connection test result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 transactionId:
 *                   type: string
 *       400:
 *         description: Test failed
 *       500:
 *         description: Connection error
 */
router.get("/test-authorize", testAuthorizeNetConnection);

/**
 * @swagger
 * /payment/test-database:
 *   get:
 *     summary: Test database connection and operations
 *     tags: [Payment]
 *     responses:
 *       200:
 *         description: Database test result
 *       500:
 *         description: Database test failed
 */
router.get("/test-database", testDatabase);

/**
 * @swagger
 * /payment/test-sdk:
 *   get:
 *     summary: Test Authorize.net SDK functionality
 *     tags: [Payment]
 *     responses:
 *       200:
 *         description: SDK test result
 *       500:
 *         description: SDK test failed
 */
router.get("/test-sdk", testAuthorizeNetSDK);

export default router;
