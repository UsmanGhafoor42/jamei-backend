import express from "express";
import { protect } from "../middlewares/auth.middleware";
import {
  getAllOrders,
  getAdminOrderDetails,
  updateOrderStatus,
  addAdminNote,
  updateShippingInfo,
  getOrderStats,
  exportOrders,
} from "../controllers/adminOrder.controller";

const router = express.Router();

/**
 * @swagger
 * /admin/orders:
 *   get:
 *     summary: Get all orders for admin (with pagination and filtering)
 *     tags: [AdminOrders]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [order_placed, in_printing, order_dispatched, completed, cancelled, all]
 *         description: Filter by order status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by order number, customer name, or email
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Orders with pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 orders:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Order'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: number
 *                     totalPages:
 *                       type: number
 *                     totalOrders:
 *                       type: number
 *                     hasNextPage:
 *                       type: boolean
 *                     hasPrevPage:
 *                       type: boolean
 *                     limit:
 *                       type: number
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Internal server error
 */
router.get("/orders", protect, getAllOrders);

/**
 * @swagger
 * /admin/orders/{orderId}:
 *   get:
 *     summary: Get single order details for admin
 *     tags: [AdminOrders]
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
router.get("/orders/:orderId", protect, getAdminOrderDetails);

/**
 * @swagger
 * /admin/orders/{orderId}/status:
 *   put:
 *     summary: Update order status
 *     tags: [AdminOrders]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [order_placed, in_printing, order_dispatched, completed, cancelled]
 *                 description: New order status
 *               note:
 *                 type: string
 *                 description: Optional note for status change
 *     responses:
 *       200:
 *         description: Order status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 order:
 *                   type: object
 *       400:
 *         description: Invalid status value
 *       404:
 *         description: Order not found
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Internal server error
 */
router.put("/orders/:orderId/status", protect, updateOrderStatus);

/**
 * @swagger
 * /admin/orders/{orderId}/notes:
 *   put:
 *     summary: Add admin notes to order
 *     tags: [AdminOrders]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - note
 *             properties:
 *               note:
 *                 type: string
 *                 description: Admin note to add
 *     responses:
 *       200:
 *         description: Admin note added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 order:
 *                   type: object
 *       400:
 *         description: Note is required
 *       404:
 *         description: Order not found
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Internal server error
 */
router.put("/orders/:orderId/notes", protect, addAdminNote);

/**
 * @swagger
 * /admin/orders/{orderId}/shipping:
 *   put:
 *     summary: Update shipping information
 *     tags: [AdminOrders]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               trackingNumber:
 *                 type: string
 *                 description: Tracking number
 *               estimatedDelivery:
 *                 type: string
 *                 format: date
 *                 description: Estimated delivery date
 *               actualDelivery:
 *                 type: string
 *                 format: date
 *                 description: Actual delivery date
 *               shippingMethod:
 *                 type: string
 *                 description: Shipping method
 *     responses:
 *       200:
 *         description: Shipping information updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 order:
 *                   type: object
 *       404:
 *         description: Order not found
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Internal server error
 */
router.put("/orders/:orderId/shipping", protect, updateShippingInfo);

/**
 * @swagger
 * /admin/orders/stats:
 *   get:
 *     summary: Get order statistics for admin dashboard
 *     tags: [AdminOrders]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Period in days
 *     responses:
 *       200:
 *         description: Order statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 period:
 *                   type: number
 *                 totalOrders:
 *                   type: number
 *                 totalRevenue:
 *                   type: number
 *                 averageOrderValue:
 *                   type: number
 *                 statusCounts:
 *                   type: object
 *                 recentOrders:
 *                   type: array
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Internal server error
 */
router.get("/orders/stats", protect, getOrderStats);

/**
 * @swagger
 * /admin/orders/export:
 *   get:
 *     summary: Export orders to CSV
 *     tags: [AdminOrders]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for export
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for export
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [order_placed, in_printing, order_dispatched, completed, cancelled, all]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: CSV file download
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Internal server error
 */
router.get("/orders/export", protect, exportOrders);

export default router;
