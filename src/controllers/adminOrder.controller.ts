import { Request, Response } from "express";
import Order from "../models/order.model";

// Get all orders for admin (with pagination and filtering)
export const getAllOrders = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      startDate,
      endDate,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build filter object
    const filter: any = {};

    if (status && status !== "all") {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: "i" } },
        { "customerInfo.firstName": { $regex: search, $options: "i" } },
        { "customerInfo.lastName": { $regex: search, $options: "i" } },
        { "customerInfo.email": { $regex: search, $options: "i" } },
      ];
    }

    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      };
    }

    // Build sort object
    const sort: any = {};
    sort[sortBy as string] = sortOrder === "desc" ? -1 : 1;

    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit);

    // Get total count for pagination
    const totalOrders = await Order.countDocuments(filter);

    // Get orders with pagination
    const orders = await Order.find(filter)
      .populate("user", "email firstName lastName")
      .sort(sort)
      .skip(skip)
      .limit(Number(limit));

    // Calculate pagination info
    const totalPages = Math.ceil(totalOrders / Number(limit));
    const hasNextPage = Number(page) < totalPages;
    const hasPrevPage = Number(page) > 1;

    res.json({
      orders,
      pagination: {
        currentPage: Number(page),
        totalPages,
        totalOrders,
        hasNextPage,
        hasPrevPage,
        limit: Number(limit),
      },
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({
      message: "Error fetching orders",
    });
  }
};

// Get single order details for admin
export const getAdminOrderDetails = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId).populate(
      "user",
      "email firstName lastName"
    );

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    res.json(order);
  } catch (error) {
    console.error("Error fetching order details:", error);
    res.status(500).json({
      message: "Error fetching order details",
    });
  }
};

// Update order status
export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { status, note } = req.body;

    // Validate status
    const validStatuses = [
      "order_placed",
      "in_printing",
      "order_dispatched",
      "completed",
      "cancelled",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid status value",
      });
    }

    // Find and update order
    const order = await Order.findByIdAndUpdate(
      orderId,
      {
        status,
        ...(note && {
          $push: {
            statusHistory: {
              status,
              timestamp: new Date(),
              note,
            },
          },
        }),
      },
      { new: true, runValidators: true }
    );

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    res.json({
      message: "Order status updated successfully",
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        statusHistory: order.statusHistory,
      },
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({
      message: "Error updating order status",
    });
  }
};

// Add admin notes to order
export const addAdminNote = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { note } = req.body;

    if (!note || note.trim().length === 0) {
      return res.status(400).json({
        message: "Admin note is required",
      });
    }

    const order = await Order.findByIdAndUpdate(
      orderId,
      { adminNotes: note },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    res.json({
      message: "Admin note added successfully",
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        adminNotes: order.adminNotes,
      },
    });
  } catch (error) {
    console.error("Error adding admin note:", error);
    res.status(500).json({
      message: "Error adding admin note",
    });
  }
};

// Update shipping information
export const updateShippingInfo = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const {
      trackingNumber,
      estimatedDelivery,
      actualDelivery,
      shippingMethod,
    } = req.body;

    const updateData: any = {};

    if (trackingNumber !== undefined)
      updateData["shipping.trackingNumber"] = trackingNumber;
    if (estimatedDelivery !== undefined)
      updateData["shipping.estimatedDelivery"] = new Date(estimatedDelivery);
    if (actualDelivery !== undefined)
      updateData["shipping.actualDelivery"] = new Date(actualDelivery);
    if (shippingMethod !== undefined)
      updateData["shipping.method"] = shippingMethod;

    const order = await Order.findByIdAndUpdate(orderId, updateData, {
      new: true,
    });

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    res.json({
      message: "Shipping information updated successfully",
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        shipping: order.shipping,
      },
    });
  } catch (error) {
    console.error("Error updating shipping info:", error);
    res.status(500).json({
      message: "Error updating shipping information",
    });
  }
};

// Get order statistics for admin dashboard
export const getOrderStats = async (req: Request, res: Response) => {
  try {
    const { period = "30" } = req.query; // days

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(period));

    // Get orders in the specified period
    const orders = await Order.find({
      createdAt: { $gte: startDate },
    });

    // Calculate statistics
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);

    const statusCounts = orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate average order value
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Get recent orders
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("orderNumber status total createdAt");

    res.json({
      period: Number(period),
      totalOrders,
      totalRevenue,
      averageOrderValue,
      statusCounts,
      recentOrders,
    });
  } catch (error) {
    console.error("Error fetching order stats:", error);
    res.status(500).json({
      message: "Error fetching order statistics",
    });
  }
};

// Export orders to CSV (for admin)
export const exportOrders = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, status } = req.query;

    // Build filter
    const filter: any = {};
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      };
    }
    if (status && status !== "all") {
      filter.status = status;
    }

    const orders = await Order.find(filter)
      .populate("user", "email firstName lastName")
      .sort({ createdAt: -1 });

    // Convert to CSV format
    const csvData = orders.map((order) => ({
      "Order Number": order.orderNumber,
      "Order Date": order.orderDate.toISOString().split("T")[0],
      Status: order.status,
      "Customer Name": `${order.customerInfo.firstName} ${order.customerInfo.lastName}`,
      "Customer Email": order.customerInfo.email,
      "Total Amount": order.total,
      "Payment Status": order.payment.status,
      "Transaction ID": order.payment.transactionId,
    }));

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=orders.csv");

    // Convert to CSV string
    const csvString = [
      Object.keys(csvData[0]).join(","),
      ...csvData.map((row) => Object.values(row).join(",")),
    ].join("\n");

    res.send(csvString);
  } catch (error) {
    console.error("Error exporting orders:", error);
    res.status(500).json({
      message: "Error exporting orders",
    });
  }
};

// Export a single order to CSV (including item image URLs)
export const exportSingleOrder = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId).populate(
      "user",
      "email firstName lastName"
    );

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const preferredBase = process.env.BACKEND_BASE_URL;
    const forwardedProto =
      (req.headers["x-forwarded-proto"] as string) || req.protocol;
    const host = req.get("host");
    const runtimeBase = `${forwardedProto}://${host}`;
    const baseUrl = preferredBase || runtimeBase;

    const toAbsoluteUrl = (url?: string) => {
      if (!url) return "";
      if (/^https?:\/\//i.test(url)) return url;
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      return `${baseUrl}/${url}`;
    };

    // Build CSV rows
    const header = [
      "Order Number",
      "Order Date",
      "Status",
      "Customer Name",
      "Customer Email",
      "Customer Phone",
      "Billing Street",
      "Billing City",
      "Billing State",
      "Billing ZIP",
      "Billing Country",
      "Shipping Method",
      "Shipping Street",
      "Shipping City",
      "Shipping State",
      "Shipping ZIP",
      "Shipping Country",
      "Item Title",
      "Item Quantity",
      "Unit Price",
      "Total Price",
      "Size",
      "Colors Name",
      "Colors Code",
      "Options",
      "Order Notes",
      "Item Image URL",
      "Imprint Files",
    ];

    const escapeCsv = (value: unknown) => {
      const str = value === undefined || value === null ? "" : String(value);
      if (/[",\n]/.test(str)) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };

    const rows: string[] = [];
    rows.push(header.map(escapeCsv).join(","));

    for (const item of order.items) {
      const row = [
        order.orderNumber,
        order.orderDate ? order.orderDate.toISOString() : "",
        order.status,
        `${order.customerInfo.firstName} ${order.customerInfo.lastName}`,
        order.customerInfo.email,
        order.customerInfo.phone || "",
        order.customerInfo.address.street,
        order.customerInfo.address.city,
        order.customerInfo.address.state,
        order.customerInfo.address.zipCode,
        order.customerInfo.address.country,
        order.shipping.method,
        order.shipping.address.street,
        order.shipping.address.city,
        order.shipping.address.state,
        order.shipping.address.zipCode,
        order.shipping.address.country,
        item.title,
        item.quantity,
        item.unitPrice,
        item.totalPrice,
        item.size || "",
        item.colorsName || "",
        item.colorsCode || "",
        (item.options || []).join(" | "),
        item.orderNotes || "",
        toAbsoluteUrl(item.imageUrl),
        (item.imprintFiles || []).map(toAbsoluteUrl).join(" | "),
      ];
      rows.push(row.map(escapeCsv).join(","));
    }

    const filename = `order-${order.orderNumber || order.id}.csv`;
    res.setHeader("Content-Type", "text/csv;charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);

    res.send(rows.join("\n"));
  } catch (error) {
    console.error("Error exporting single order:", error);
    res.status(500).json({ message: "Error exporting order" });
  }
};
