import { Request, Response } from "express";
import Order from "../models/order.model";
import puppeteer from "puppeteer";
import { sendOrderStatusUpdateEmail } from "../utils/mailer";

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

    // Send status update email to customer
    try {
      console.log("Sending order status update email...");
      await sendOrderStatusUpdateEmail(order.customerInfo.email, {
        orderNumber: order.orderNumber,
        status: order.status,
        customerInfo: {
          firstName: order.customerInfo.firstName,
          lastName: order.customerInfo.lastName,
        },
        note: note,
      });
      console.log("Order status update email sent successfully");
    } catch (emailError) {
      console.error("Failed to send order status update email:", emailError);
      // Don't fail the status update if email fails
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

// Generate and download single order as PDF
export const downloadOrderPDF = async (req: Request, res: Response) => {
  let browser;
  try {
    const { orderId } = req.params;
    console.log(`Generating PDF for order: ${orderId}`);

    const order = await Order.findById(orderId).populate(
      "user",
      "email firstName lastName"
    );

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    console.log(`Order found: ${order.orderNumber}`);

    // Check if we should include images (default: true)
    const includeImages = req.query.images !== "false";

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

    // Helper function to get all images for an item
    const getItemImages = (item: any) => {
      const images = [];
      if (item.imageUrl) {
        images.push({
          url: toAbsoluteUrl(item.imageUrl),
          alt: item.title,
          type: "product",
        });
      }
      if (item.imprintFiles && item.imprintFiles.length > 0) {
        item.imprintFiles.forEach((file: string, index: number) => {
          images.push({
            url: toAbsoluteUrl(file),
            alt: `Imprint ${index + 1}`,
            type: "imprint",
          });
        });
      }
      return images;
    };

    // Generate professional HTML content for the PDF
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Order Invoice - ${order.orderNumber}</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                background: #fff;
                font-size: 14px;
            }
            
            .container {
                max-width: 1000px;
                margin: 0 auto;
                padding: 40px;
            }
            
            .header {
                text-align: center;
                margin-bottom: 60px;
                padding-bottom: 30px;
                border-bottom: 3px solid #2c3e50;
            }
            
            .header h1 {
                color: #2c3e50;
                font-size: 32px;
                font-weight: 700;
                margin-bottom: 10px;
                text-transform: uppercase;
                letter-spacing: 2px;
            }
            
            .header .subtitle {
                color: #7f8c8d;
                font-size: 16px;
                font-weight: 300;
            }
            
            .order-info {
                display: flex;
                flex-direction: column;
                margin-bottom: 50px;
                background: #f8f9fa;
                padding: 30px;
                border-radius: 12px;
                border-left: 4px solid #3498db;
                gap: 30px;
            }
            
            .info-section {
                width: 100%;
                margin: 0;
                background: #fff;
                padding: 25px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            }
            
            .info-section h3 {
                color: #2c3e50;
                font-size: 18px;
                font-weight: 600;
                margin-bottom: 20px;
                text-transform: uppercase;
                letter-spacing: 1px;
                border-bottom: 2px solid #ecf0f1;
                padding-bottom: 10px;
            }
            
            .info-row {
                margin-bottom: 12px;
                display: flex;
                align-items: flex-start;
            }
            
            .info-label {
                font-weight: 600;
                color: #34495e;
                min-width: 140px;
                margin-right: 15px;
                font-size: 15px;
            }
            
            .info-value {
                color: #2c3e50;
                font-size: 15px;
                line-height: 1.5;
            }
            
            .status-badge {
                display: inline-block;
                padding: 6px 12px;
                border-radius: 20px;
                font-size: 11px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            
            .status-order_placed { background: #f39c12; color: #fff; }
            .status-in_printing { background: #3498db; color: #fff; }
            .status-order_dispatched { background: #9b59b6; color: #fff; }
            .status-completed { background: #27ae60; color: #fff; }
            .status-cancelled { background: #e74c3c; color: #fff; }
            
            .items-section {
                margin: 50px 0;
            }
            
            .items-section h2 {
                color: #2c3e50;
                font-size: 24px;
                font-weight: 600;
                margin-bottom: 30px;
                text-transform: uppercase;
                letter-spacing: 1px;
                border-bottom: 3px solid #3498db;
                padding-bottom: 15px;
            }
            
            .items-table {
                width: 100%;
                border-collapse: collapse;
                margin: 30px 0;
                background: #fff;
                box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                border-radius: 12px;
                overflow: hidden;
            }
            
            .items-table th {
                background: linear-gradient(135deg, #2c3e50, #34495e);
                color: #fff;
                padding: 20px 15px;
                text-align: left;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 1px;
                font-size: 14px;
            }
            
            .items-table td {
                padding: 20px 15px;
                border-bottom: 1px solid #ecf0f1;
                vertical-align: top;
            }
            
            .items-table tr:nth-child(even) {
                background: #f8f9fa;
            }
            
            .items-table tr:hover {
                background: #e8f4f8;
            }
            
            .image-container {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                align-items: flex-start;
            }
            
            .item-image {
                width: 120px;
                height: 120px;
                object-fit: cover;
                border-radius: 8px;
                border: 2px solid #ecf0f1;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                transition: transform 0.3s ease;
            }
            
            .no-image {
                width: 120px;
                height: 120px;
                background: linear-gradient(135deg, #ecf0f1, #bdc3c7);
                border: 2px solid #bdc3c7;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #7f8c8d;
                font-size: 12px;
                font-weight: 500;
                text-align: center;
                flex-direction: column;
            }
            
            .item-title {
                font-weight: 600;
                color: #2c3e50;
                font-size: 18px;
                margin-bottom: 10px;
                line-height: 1.4;
            }
            
            .item-details {
                color: #7f8c8d;
                font-size: 14px;
                line-height: 1.6;
            }
            
            .size-quantity {
                background: #e8f4f8;
                padding: 12px 15px;
                border-radius: 8px;
                margin: 8px 0;
                border-left: 4px solid #3498db;
                font-size: 14px;
            }
            
            .size-quantity strong {
                color: #2c3e50;
                font-weight: 600;
            }
            
            .color-info {
                display: flex;
                align-items: center;
                margin: 10px 0;
            }
            
            .color-swatch {
                width: 25px;
                height: 25px;
                border-radius: 50%;
                border: 3px solid #ecf0f1;
                margin-right: 12px;
                display: inline-block;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            
            .totals-section {
                margin: 50px 0;
                background: #f8f9fa;
                padding: 35px;
                border-radius: 12px;
                
                border-left: 4px solid #27ae60;
            }
            
            .totals-section h2 {
                color: #2c3e50;
                font-size: 22px;
                font-weight: 600;
                margin-bottom: 25px;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            
            .totals-table {
                width: 100%;
                max-width: 400px;
                margin-left: auto;
            }
            
            .totals-table td {
                padding: 15px 20px;
                border-bottom: 1px solid #ecf0f1;
                font-size: 16px;
            }
            
            .totals-table .total-row {
                background: #27ae60;
                color: #fff;
                font-weight: 700;
                font-size: 20px;
                border-radius: 8px;
            }
            
            .totals-table .total-row td {
                border: none;
                padding: 20px;
            }
            
            .footer {
                margin-top: 60px;
                text-align: center;
                padding-top: 30px;
                border-top: 2px solid #ecf0f1;
                color: #7f8c8d;
                font-size: 14px;
            }
            
            .footer p {
                margin: 8px 0;
            }
            
            .admin-notes {
                background: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 8px;
                padding: 20px;
                margin: 30px 0;
            }
            
            .admin-notes h3 {
                color: #856404;
                font-size: 16px;
                font-weight: 600;
                margin-bottom: 15px;
            }
            
            .admin-notes p {
                color: #856404;
                font-size: 14px;
                line-height: 1.6;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Order Invoice</h1>
                <div class="subtitle">Professional Order Documentation</div>
            </div>
            
            <div class="order-info">
                <div class="info-section">
                    <h3>Order Details</h3>
                    <div class="info-row">
                        <span class="info-label">Order Number:</span>
                        <span class="info-value">${order.orderNumber}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Order Date:</span>
                        <span class="info-value">${
                          order.orderDate
                            ? order.orderDate.toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })
                            : "N/A"
                        }</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Status:</span>
                        <span class="status-badge status-${
                          order.status
                        }">${order.status.replace("_", " ")}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Payment:</span>
                        <span class="info-value">${order.payment.status} - ${
      order.payment.method
    }</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Transaction ID:</span>
                        <span class="info-value">${
                          order.payment.transactionId
                        }</span>
                    </div>
                </div>
                
                <div class="info-section">
                    <h3>Customer Information</h3>
                    <div class="info-row">
                        <span class="info-label">Name:</span>
                        <span class="info-value">${
                          order.customerInfo.firstName
                        } ${order.customerInfo.lastName}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Email:</span>
                        <span class="info-value">${
                          order.customerInfo.email
                        }</span>
                    </div>
                    ${
                      order.customerInfo.phone
                        ? `
                    <div class="info-row">
                        <span class="info-label">Phone:</span>
                        <span class="info-value">${order.customerInfo.phone}</span>
                    </div>
                    `
                        : ""
                    }
                    <div class="info-row">
                        <span class="info-label">Address:</span>
                        <span class="info-value">${
                          order.customerInfo.address.street
                        }<br>
                        ${order.customerInfo.address.city}, ${
      order.customerInfo.address.state
    } ${order.customerInfo.address.zipCode}<br>
                        ${order.customerInfo.address.country}</span>
                    </div>
                </div>
                
                <div class="info-section">
                    <h3>Shipping Information</h3>
                    <div class="info-row">
                        <span class="info-label">Method:</span>
                        <span class="info-value">${order.shipping.method}</span>
                    </div>
                    ${
                      order.shipping.trackingNumber
                        ? `
                    <div class="info-row">
                        <span class="info-label">Tracking:</span>
                        <span class="info-value">${order.shipping.trackingNumber}</span>
                    </div>
                    `
                        : ""
                    }
                    <div class="info-row">
                        <span class="info-label">Address:</span>
                        <span class="info-value">${
                          order.shipping.address.street
                        }<br>
                        ${order.shipping.address.city}, ${
      order.shipping.address.state
    } ${order.shipping.address.zipCode}<br>
                        ${order.shipping.address.country}</span>
                    </div>
                </div>
            </div>
            
            <div class="items-section">
                <h2>Order Items</h2>
                <table class="items-table">
                    <thead>
                        <tr>
                            <th style="width: 200px;">Product Images</th>
                            <th>Product Details</th>
                            <th style="width: 150px;">Size & Quantity</th>
                            <th style="width: 120px;">Color</th>
                            <th style="width: 100px;">Unit Price</th>
                            <th style="width: 100px;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${order.items
                          .map(
                            (item) => `
                        <tr>
                            <td>
                                <div class="image-container">
                                    ${(() => {
                                      const images = getItemImages(item);
                                      if (includeImages && images.length > 0) {
                                        return images
                                          .map(
                                            (img) =>
                                              `<img src="${img.url}" alt="${img.alt}" class="item-image" onerror="this.style.display='none';" />`
                                          )
                                          .join("");
                                      }
                                      return '<div class="no-image">No Image<br>Available</div>';
                                    })()}
                                </div>
                            </td>
                            <td>
                                <div class="item-title">${item.title}</div>
                                <div class="item-details">
                                    ${
                                      item.options && item.options.length > 0
                                        ? `<strong>Options:</strong> ${item.options.join(
                                            ", "
                                          )}<br>`
                                        : ""
                                    }
                                    ${
                                      item.orderNotes
                                        ? `<strong>Notes:</strong> ${item.orderNotes}<br>`
                                        : ""
                                    }
                                    ${
                                      item.imprintFiles &&
                                      item.imprintFiles.length > 0
                                        ? `<strong>Imprint Files:</strong> ${item.imprintFiles.length} file(s)<br>`
                                        : ""
                                    }
                                    ${
                                      item.imprintLocations &&
                                      item.imprintLocations.length > 0
                                        ? `<strong>Imprint Locations:</strong> ${item.imprintLocations.join(
                                            ", "
                                          )}`
                                        : ""
                                    }
                                </div>
                            </td>
                            <td>
                                ${
                                  item.sizeAndQuantity
                                    ? Object.entries(item.sizeAndQuantity)
                                        .map(
                                          ([size, qty]) =>
                                            `<div class="size-quantity"><strong>${size}:</strong> ${qty}</div>`
                                        )
                                        .join("")
                                    : `<div class="size-quantity"><strong>Size:</strong> ${
                                        item.size || "N/A"
                                      }<br><strong>Qty:</strong> ${
                                        item.quantity
                                      }</div>`
                                }
                            </td>
                            <td>
                                <div class="color-info">
                                    ${
                                      item.colorsCode
                                        ? `<span class="color-swatch" style="background-color: ${item.colorsCode};"></span>`
                                        : ""
                                    }
                                    <div>
                                        <strong>${
                                          item.colorsName || "N/A"
                                        }</strong>
                                        ${
                                          item.colorsCode
                                            ? `<br><small>${item.colorsCode}</small>`
                                            : ""
                                        }
                                    </div>
                                </div>
                            </td>
                            <td style="text-align: center; font-weight: 600; color: #2c3e50;">
                                $${item.unitPrice.toFixed(2)}
                            </td>
                            <td style="text-align: center; font-weight: 700; color: #27ae60; font-size: 16px;">
                                $${item.totalPrice.toFixed(2)}
                            </td>
                        </tr>
                        `
                          )
                          .join("")}
                    </tbody>
                </table>
            </div>
            
            <div class="totals-section">
                <h2>Order Summary</h2>
                <table class="totals-table">
                    <tr>
                        <td><strong>Subtotal:</strong></td>
                        <td style="text-align: right; font-weight: 600;">$${order.subtotal.toFixed(
                          2
                        )}</td>
                    </tr>
                    <tr>
                        <td><strong>Tax:</strong></td>
                        <td style="text-align: right; font-weight: 600;">$${order.tax.toFixed(
                          2
                        )}</td>
                    </tr>
                    <tr>
                        <td><strong>Shipping:</strong></td>
                        <td style="text-align: right; font-weight: 600;">$${order.shippingCost.toFixed(
                          2
                        )}</td>
                    </tr>
                    ${
                      order.discount > 0
                        ? `
                    <tr>
                        <td><strong>Discount:</strong></td>
                        <td style="text-align: right; font-weight: 600; color: #e74c3c;">-$${order.discount.toFixed(
                          2
                        )}</td>
                    </tr>
                    `
                        : ""
                    }
                    <tr class="total-row">
                        <td><strong>TOTAL:</strong></td>
                        <td style="text-align: right;"><strong>$${order.total.toFixed(
                          2
                        )}</strong></td>
                    </tr>
                </table>
            </div>
            
            ${
              order.adminNotes
                ? `
            <div class="admin-notes">
                <h3>Admin Notes</h3>
                <p>${order.adminNotes}</p>
            </div>
            `
                : ""
            }
            
            <div class="footer">
                <p><strong>Thank you for your business!</strong></p>
                <p>This invoice was generated on ${new Date().toLocaleDateString(
                  "en-US",
                  { year: "numeric", month: "long", day: "numeric" }
                )} at ${new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })}</p>
                <p>For any questions regarding this order, please contact our customer service team.</p>
            </div>
        </div>
    </body>
    </html>
    `;

    // Launch Puppeteer and generate PDF
    console.log("Launching Puppeteer browser...");
    browser = await puppeteer.launch({
      headless: true,
      executablePath: "/usr/bin/chromium-browser", // Use system Chromium
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
        "--disable-gpu",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
      ],
    });

    const page = await browser.newPage();
    console.log("Browser page created");

    // Set content
    console.log("Setting HTML content...");
    await page.setContent(htmlContent, {
      waitUntil: "networkidle0",
      timeout: 15000,
    });
    console.log("HTML content set successfully");

    // Wait for images to load if they are included
    if (includeImages) {
      console.log("Waiting for images to load...");
      try {
        // Wait for all images to load with better error handling
        await page.evaluate(() => {
          return Promise.allSettled(
            Array.from(document.images)
              .filter((img) => !img.complete)
              .map(
                (img) =>
                  new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                      console.warn("Image load timeout:", img.src);
                      resolve(null);
                    }, 8000); // 8 second timeout per image

                    img.onload = () => {
                      clearTimeout(timeout);
                      resolve(img);
                    };
                    img.onerror = () => {
                      clearTimeout(timeout);
                      console.warn("Image failed to load:", img.src);
                      resolve(null);
                    };
                  })
              )
          );
        });
        console.log("Images loading process completed");

        // Additional wait to ensure all images are rendered
        await new Promise((resolve) => setTimeout(resolve, 1500));
      } catch (imageError) {
        console.warn("Some images failed to load:", imageError);
      }
    }

    // Wait a bit more for everything to render
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Generate PDF
    console.log("Generating PDF...");
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "15px",
        right: "15px",
        bottom: "15px",
        left: "15px",
      },
      preferCSSPageSize: false,
      displayHeaderFooter: false,
      scale: 1.0,
    });
    console.log("PDF generated successfully");

    await browser.close();
    browser = null;

    // Validate PDF buffer
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error("Generated PDF buffer is empty or invalid");
    }

    // Check if it's a valid PDF (starts with %PDF)
    // const pdfHeader = pdfBuffer.slice(0, 4).toString();
    // console.log(`PDF header check: "${pdfHeader}" (expected: "%PDF")`);

    // if (!pdfHeader.startsWith("%PDF")) {
    //   console.log(`PDF buffer length: ${pdfBuffer.length}`);
    //   console.log(
    //     `First 20 bytes as string: ${pdfBuffer.slice(0, 20).toString()}`
    //   );
    //   console.log(
    //     `First 20 bytes as array: [${Array.from(pdfBuffer.slice(0, 20)).join(
    //       ", "
    //     )}]`
    //   );
    //   console.warn("PDF header validation failed, but continuing anyway...");
    //   // Don't throw error, just log warning and continue
    // }
    const pdfHeader = pdfBuffer.slice(0, 4).toString();
    console.log(`PDF header check: "${pdfHeader}" (expected: "%PDF")`);

    if (!pdfHeader.startsWith("%PDF")) {
      console.error("❌ Invalid PDF uploaded.");
      return res.status(400).json({ error: "Invalid PDF file" });
    }

    console.log(`PDF generated successfully, size: ${pdfBuffer.length} bytes`);

    // Set response headers for PDF download
    const filename = `order-${order.orderNumber || order._id}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Pragma", "no-cache");

    // Send the PDF buffer
    res.end(pdfBuffer);
  } catch (error) {
    console.error("Error generating PDF:", error);

    // Ensure browser is closed even if there's an error
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error("Error closing browser:", closeError);
      }
    }

    res.status(500).json({
      message: "Error generating PDF",
      error: process.env.NODE_ENV === "development" ? String(error) : undefined,
    });
  }
};

// Simple test PDF generation
export const testPDF = async (req: Request, res: Response) => {
  let browser;
  try {
    console.log("Testing PDF generation...");

    const simpleHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Test PDF</title>
    </head>
    <body>
        <h1>Test PDF Generation</h1>
        <p>This is a simple test to verify PDF generation works.</p>
        <p>Current time: ${new Date().toLocaleString()}</p>
    </body>
    </html>
    `;

    browser = await puppeteer.launch({
      headless: true,
      executablePath: "/usr/bin/chromium-browser", // Use system Chromium
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
        "--disable-gpu",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
      ],
    });

    const page = await browser.newPage();
    await page.setContent(simpleHtml, { waitUntil: "domcontentloaded" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      margin: { top: "20px", right: "20px", bottom: "20px", left: "20px" },
    });

    await browser.close();

    // Validate PDF
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error("Generated PDF buffer is empty");
    }

    const pdfHeader = pdfBuffer.slice(0, 4).toString();
    console.log(`Test PDF header: "${pdfHeader}"`);

    if (!pdfHeader.startsWith("%PDF")) {
      console.log(`Test PDF buffer length: ${pdfBuffer.length}`);
      console.log(
        `First 20 bytes as string: ${pdfBuffer.slice(0, 20).toString()}`
      );
      console.log(
        `First 20 bytes as array: [${Array.from(pdfBuffer.slice(0, 20)).join(
          ", "
        )}]`
      );
      console.warn(
        "Test PDF header validation failed, but continuing anyway..."
      );
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="test.pdf"');
    res.setHeader("Content-Length", pdfBuffer.length);
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Pragma", "no-cache");
    res.end(pdfBuffer);
  } catch (error) {
    console.error("Test PDF generation failed:", error);
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error("Error closing browser:", closeError);
      }
    }
    res.status(500).json({
      message: "Test PDF generation failed",
      error: String(error),
    });
  }
};
