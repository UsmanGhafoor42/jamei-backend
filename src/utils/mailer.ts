import nodemailer from "nodemailer";

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER!,
      pass: process.env.EMAIL_PASS!,
    },
  });
};

export const sendResetEmail = async (to: string, token: string) => {
  const transporter = createTransporter();

  const resetUrl = `https://hotmarketdtf.com/auth/reset-password?token=${token}`;
  // const resetUrl = `http://localhost:3000/auth/reset-password?token=${token}`;

  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset - Hot Market Design DTF</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        line-height: 1.6;
        color: #1a1a1a;
        background-color: #f8f9fa;
        padding: 20px;
      }
      
      .email-container {
        max-width: 600px;
        margin: 0 auto;
        background: #ffffff;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        overflow: hidden;
      }
      
      .header {
        background: #ffffff;
        border-bottom: 1px solid #e5e7eb;
        padding: 32px 24px;
        text-align: center;
      }
      
      .logo {
        font-size: 24px;
        font-weight: 700;
        color: #1a1a1a;
        margin-bottom: 8px;
      }
      
      .header-title {
        font-size: 20px;
        font-weight: 600;
        color: #374151;
        margin-bottom: 4px;
      }
      
      .header-subtitle {
        font-size: 14px;
        color: #6b7280;
      }
      
      .content {
        padding: 32px 24px;
      }
      
      .main-message {
        text-align: center;
        margin-bottom: 32px;
      }
      
      .main-message h1 {
        font-size: 24px;
        font-weight: 600;
        color: #1a1a1a;
        margin-bottom: 12px;
      }
      
      .main-message p {
        font-size: 16px;
        color: #4b5563;
        line-height: 1.5;
        margin-bottom: 24px;
      }
      
      .cta-button {
        display: inline-block;
        background: #85c03e;
        color: white;
        padding: 12px 24px;
        text-decoration: none;
        border-radius: 6px;
        font-weight: 500;
        font-size: 16px;
        transition: background-color 0.2s ease;
      }
      
      .cta-button:hover {
        background: #6ba832;
      }
      
      .info-section {
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        padding: 20px;
        margin: 24px 0;
      }
      
      .info-section h3 {
        font-size: 16px;
        font-weight: 600;
        color: #1a1a1a;
        margin-bottom: 12px;
      }
      
      .info-section p {
        font-size: 14px;
        color: #4b5563;
        line-height: 1.5;
        margin-bottom: 8px;
      }
      
      .info-section ul {
        font-size: 14px;
        color: #4b5563;
        line-height: 1.6;
        padding-left: 16px;
      }
      
      .info-section li {
        margin-bottom: 4px;
      }
      
      .warning-box {
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 6px;
        padding: 16px;
        margin: 24px 0;
      }
      
      .warning-box p {
        font-size: 14px;
        color: #dc2626;
        line-height: 1.5;
        margin: 0;
      }
      
      .alternative-link {
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        padding: 16px;
        margin: 24px 0;
        word-break: break-all;
      }
      
      .alternative-link p {
        font-size: 12px;
        color: #6b7280;
        margin-bottom: 8px;
        font-weight: 500;
      }
      
      .alternative-link a {
        color: #1a1a1a;
        font-size: 14px;
        word-break: break-all;
        text-decoration: underline;
      }
      
      .footer {
        background: #f9fafb;
        border-top: 1px solid #e5e7eb;
        padding: 24px;
        text-align: center;
      }
      
      .footer p {
        font-size: 14px;
        color: #6b7280;
        margin: 4px 0;
        line-height: 1.5;
      }
      
      .footer .copyright {
        font-size: 12px;
        color: #9ca3af;
        margin-top: 16px;
      }
      
      @media (max-width: 600px) {
        .content {
          padding: 24px 16px;
        }
        
        .header {
          padding: 24px 16px;
        }
        
        .main-message h1 {
          font-size: 20px;
        }
        
        .main-message p {
          font-size: 14px;
        }
      }
    </style>
  </head>
  <body>
    <div class="email-container">
      <div class="header">
        <div class="logo">Hot Market Design DTF</div>
        <div class="header-title">Password Reset</div>
        <div class="header-subtitle">Secure account recovery</div>
      </div>
      
      <div class="content">
        <div class="main-message">
          <h1>Reset Your Password</h1>
          <p>We received a request to reset your password. Click the button below to create a new password for your account.</p>
          <a href="${resetUrl}" class="cta-button">Reset Password</a>
        </div>
        
        <div class="info-section">
          <h3>Important Information</h3>
          <ul>
            <li>This link will expire in 1 hour for security</li>
            <li>If you didn't request this reset, please ignore this email</li>
            <li>Your password remains unchanged until you create a new one</li>
            <li>This link can only be used once</li>
          </ul>
        </div>
        
        <div class="warning-box">
          <p><strong>Security Notice:</strong> Never share this link with anyone. We will never ask for your password via email.</p>
        </div>
        
        <div class="alternative-link">
          <p>Having trouble with the button?</p>
          <p>Copy and paste this link into your browser:</p>
          <a href="${resetUrl}">${resetUrl}</a>
        </div>
      </div>
      
      <div class="footer">
        <p>Need help? Contact our support team.</p>
        <p>This email was sent to ${to} on ${new Date().toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  )} at ${new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })}</p>
        <p class="copyright">© ${new Date().getFullYear()} Hot Market Design DTF. All rights reserved.</p>
      </div>
    </div>
  </body>
  </html>
  `;

  const mailOptions = {
    from: "Hot Market Design DTF <no-reply@dtfstickers.com>",
    to,
    subject: "Reset Your Password - Hot Market Design DTF",
    html,
  };

  await transporter.sendMail(mailOptions);
};

// Professional order confirmation email
export const sendOrderConfirmationEmail = async (
  to: string,
  orderData: {
    orderNumber: string;
    orderDate: Date;
    status: string;
    customerInfo: {
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
      address: {
        street: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
      };
    };
    items: Array<{
      title: string;
      imageUrl?: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      size?: string;
      colorsName?: string;
      options?: string[];
    }>;
    subtotal: number;
    tax: number;
    shippingCost: number;
    discount: number;
    total: number;
    shipping: {
      method: string;
      address: {
        street: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
      };
    };
  }
) => {
  const transporter = createTransporter();

  const baseUrl =
    process.env.BACKEND_BASE_URL || "https://api.hotmarketdtf.com";

  const toAbsoluteUrl = (url?: string) => {
    if (!url) return "";
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith("/")) return `${baseUrl}${url}`;
    return `${baseUrl}/${url}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "order_placed":
        return "#f39c12";
      case "in_printing":
        return "#3498db";
      case "order_dispatched":
        return "#9b59b6";
      case "completed":
        return "#27ae60";
      case "cancelled":
        return "#e74c3c";
      default:
        return "#7f8c8d";
    }
  };

  const getStatusText = (status: string) => {
    return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Confirmation - ${orderData.orderNumber}</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        line-height: 1.6;
        color: #1a1a1a;
        background-color: #f8f9fa;
        padding: 20px;
      }
      
      .email-container {
        max-width: 600px;
        margin: 0 auto;
        background: #ffffff;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        overflow: hidden;
      }
      
      .header {
        background: #ffffff;
        border-bottom: 1px solid #e5e7eb;
        padding: 32px 24px;
        text-align: center;
      }
      
      .logo {
        font-size: 24px;
        font-weight: 700;
        color: #1a1a1a;
        margin-bottom: 8px;
      }
      
      .header-title {
        font-size: 20px;
        font-weight: 600;
        color: #374151;
        margin-bottom: 4px;
      }
      
      .header-subtitle {
        font-size: 14px;
        color: #6b7280;
      }
      
      .content {
        padding: 32px 24px;
      }
      
      .order-header {
        text-align: center;
        margin-bottom: 32px;
        padding: 24px;
        background: #f9fafb;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
      }
      
      .order-number {
        font-size: 18px;
        font-weight: 600;
        color: #1a1a1a;
        margin-bottom: 8px;
      }
      
      .order-date {
        font-size: 14px;
        color: #6b7280;
        margin-bottom: 16px;
      }
      
      .status-badge {
        display: inline-block;
        background: ${getStatusColor(orderData.status)};
        color: white;
        padding: 6px 12px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
        text-transform: uppercase;
      }
      
      .order-info {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 24px;
        margin-bottom: 32px;
      }
      
      .info-section {
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        padding: 20px;
      }
      
      .info-section h3 {
        font-size: 16px;
        font-weight: 600;
        color: #1a1a1a;
        margin-bottom: 16px;
      }
      
      .info-row {
        margin-bottom: 8px;
        display: flex;
        align-items: flex-start;
      }
      
      .info-label {
        font-weight: 500;
        color: #374151;
        min-width: 80px;
        margin-right: 12px;
        font-size: 14px;
      }
      
      .info-value {
        color: #1a1a1a;
        font-size: 14px;
        line-height: 1.4;
      }
      
      .items-section {
        margin: 32px 0;
      }
      
      .items-section h2 {
        font-size: 18px;
        font-weight: 600;
        color: #1a1a1a;
        margin-bottom: 20px;
        padding-bottom: 8px;
        border-bottom: 1px solid #e5e7eb;
      }
      
      .item {
        display: flex;
        align-items: center;
        padding: 16px;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        margin-bottom: 12px;
        background: #fff;
      }
      
      .item-image {
        width: 60px;
        height: 60px;
        object-fit: cover;
        border-radius: 4px;
        margin-right: 16px;
        border: 1px solid #e5e7eb;
      }
      
      .no-image {
        width: 60px;
        height: 60px;
        background: #f3f4f6;
        border: 1px solid #e5e7eb;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #9ca3af;
        font-size: 10px;
        font-weight: 500;
        text-align: center;
        margin-right: 16px;
      }
      
      .item-details {
        flex: 1;
      }
      
      .item-title {
        font-weight: 600;
        color: #1a1a1a;
        font-size: 14px;
        margin-bottom: 4px;
      }
      
      .item-meta {
        color: #6b7280;
        font-size: 12px;
        line-height: 1.4;
      }
      
      .item-price {
        font-weight: 600;
        color: #1a1a1a;
        font-size: 16px;
        text-align: right;
        min-width: 80px;
      }
      
      .totals-section {
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        padding: 24px;
        margin: 32px 0;
      }
      
      .totals-section h2 {
        font-size: 18px;
        font-weight: 600;
        color: #1a1a1a;
        margin-bottom: 16px;
      }
      
      .totals-table {
        width: 100%;
      }
      
      .totals-table td {
        padding: 8px 0;
        border-bottom: 1px solid #e5e7eb;
        font-size: 14px;
      }
      
      .totals-table .total-row {
        background: #1a1a1a;
        color: white;
        font-weight: 600;
        font-size: 16px;
        border-radius: 4px;
        margin-top: 8px;
      }
      
      .totals-table .total-row td {
        border: none;
        padding: 12px 16px;
      }
      
      .footer {
        background: #f9fafb;
        border-top: 1px solid #e5e7eb;
        padding: 24px;
        text-align: center;
      }
      
      .footer p {
        font-size: 14px;
        color: #6b7280;
        margin: 4px 0;
        line-height: 1.5;
      }
      
      .footer .copyright {
        font-size: 12px;
        color: #9ca3af;
        margin-top: 16px;
      }
      
      .cta-button {
        display: inline-block;
        background: #85c03e;
        color: white;
        padding: 12px 24px;
        text-decoration: none;
        border-radius: 6px;
        font-weight: 500;
        font-size: 14px;
        margin: 24px 0;
        transition: background-color 0.2s ease;
      }
      
      .cta-button:hover {
        background: #6ba832;
      }
      
      @media (max-width: 600px) {
        .content {
          padding: 24px 16px;
        }
        
        .header {
          padding: 24px 16px;
        }
        
        .order-info {
          grid-template-columns: 1fr;
        }
        
        .item {
          flex-direction: column;
          text-align: center;
        }
        
        .item-image, .no-image {
          margin: 0 0 12px 0;
        }
        
        .item-price {
          text-align: center;
          margin-top: 8px;
        }
      }
    </style>
  </head>
  <body>
    <div class="email-container">
      <div class="header">
        <div class="logo">Hot Market Design DTF</div>
        <div class="header-title">Order Confirmation</div>
        <div class="header-subtitle">Thank you for your purchase</div>
      </div>
      
      <div class="content">
        <div class="order-header">
          <div class="order-number">Order #${orderData.orderNumber}</div>
          <div class="order-date">${orderData.orderDate.toLocaleDateString(
            "en-US",
            {
              year: "numeric",
              month: "long",
              day: "numeric",
            }
          )}</div>
          <span class="status-badge">${getStatusText(orderData.status)}</span>
        </div>
        
        <div class="order-info">
          <div class="info-section">
            <h3>Customer</h3>
            <div class="info-row">
              <span class="info-label">Name:</span>
              <span class="info-value">${orderData.customerInfo.firstName} ${
    orderData.customerInfo.lastName
  }</span>
            </div>
            <div class="info-row">
              <span class="info-label">Email:</span>
              <span class="info-value">${orderData.customerInfo.email}</span>
            </div>
            ${
              orderData.customerInfo.phone
                ? `
            <div class="info-row">
              <span class="info-label">Phone:</span>
              <span class="info-value">${orderData.customerInfo.phone}</span>
            </div>
            `
                : ""
            }
          </div>
          
          <div class="info-section">
            <h3>Shipping</h3>
            <div class="info-row">
              <span class="info-label">Method:</span>
              <span class="info-value">${orderData.shipping.method}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Address:</span>
              <span class="info-value">${orderData.shipping.address.street}, ${
    orderData.shipping.address.city
  }, ${orderData.shipping.address.state} ${
    orderData.shipping.address.zipCode
  }</span>
            </div>
          </div>
        </div>
        
        <div class="items-section">
          <h2>Order Items</h2>
          ${orderData.items
            .map(
              (item) => `
          <div class="item">
            ${
              item.imageUrl
                ? `<img src="${toAbsoluteUrl(item.imageUrl)}" alt="${
                    item.title
                  }" class="item-image" />`
                : `<div class="no-image">No Image</div>`
            }
            <div class="item-details">
              <div class="item-title">${item.title}</div>
              <div class="item-meta">
                Qty: ${item.quantity}
                ${item.size ? ` • Size: ${item.size}` : ""}
                ${item.colorsName ? ` • Color: ${item.colorsName}` : ""}
                ${
                  item.options && item.options.length > 0
                    ? ` • Options: ${item.options.join(", ")}`
                    : ""
                }
              </div>
            </div>
            <div class="item-price">$${item.totalPrice.toFixed(2)}</div>
          </div>
          `
            )
            .join("")}
        </div>
        
        <div class="totals-section">
          <h2>Order Summary</h2>
          <table class="totals-table">
            <tr>
              <td>Subtotal</td>
              <td style="text-align: right;">$${orderData.subtotal.toFixed(
                2
              )}</td>
            </tr>
            <tr>
              <td>Tax</td>
              <td style="text-align: right;">$${orderData.tax.toFixed(2)}</td>
            </tr>
            <tr>
              <td>Shipping</td>
              <td style="text-align: right;">$${orderData.shippingCost.toFixed(
                2
              )}</td>
            </tr>
            ${
              orderData.discount > 0
                ? `
            <tr>
              <td>Discount</td>
              <td style="text-align: right; color: #dc2626;">-$${orderData.discount.toFixed(
                2
              )}</td>
            </tr>
            `
                : ""
            }
            <tr class="total-row">
              <td>Total</td>
              <td style="text-align: right;">$${orderData.total.toFixed(2)}</td>
            </tr>
          </table>
        </div>
        
        <div style="text-align: center;">
          <a href="https://hotmarketdtf.com/orders" class="cta-button">View Order Details</a>
        </div>
      </div>
      
      <div class="footer">
        <p>We'll keep you updated on your order status via email.</p>
        <p>For any questions, please contact our customer service team.</p>
        <p class="copyright">
          This email was sent to ${
            orderData.customerInfo.email
          } on ${new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })} at ${new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })} • © ${new Date().getFullYear()} Hot Market Design DTF
        </p>
      </div>
    </div>
  </body>
  </html>
  `;

  const mailOptions = {
    from: "Hot Market Design DTF <no-reply@dtfstickers.com>",
    to,
    subject: `Order Confirmation - ${orderData.orderNumber}`,
    html,
  };

  await transporter.sendMail(mailOptions);
};

// Order status update email
export const sendOrderStatusUpdateEmail = async (
  to: string,
  orderData: {
    orderNumber: string;
    status: string;
    customerInfo: {
      firstName: string;
      lastName: string;
    };
    note?: string;
  }
) => {
  const transporter = createTransporter();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "order_placed":
        return "#f39c12";
      case "in_printing":
        return "#3498db";
      case "order_dispatched":
        return "#9b59b6";
      case "completed":
        return "#27ae60";
      case "cancelled":
        return "#e74c3c";
      default:
        return "#7f8c8d";
    }
  };

  const getStatusText = (status: string) => {
    return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case "order_placed":
        return "Your order has been received and is being processed.";
      case "in_printing":
        return "Your order is now in production and being printed.";
      case "order_dispatched":
        return "Great news! Your order has been dispatched and is on its way.";
      case "completed":
        return "Your order has been completed and delivered successfully.";
      case "cancelled":
        return "Your order has been cancelled. Please contact us if you have any questions.";
      default:
        return "Your order status has been updated.";
    }
  };

  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Update - ${orderData.orderNumber}</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        line-height: 1.6;
        color: #1a1a1a;
        background-color: #f8f9fa;
        padding: 20px;
      }
      
      .email-container {
        max-width: 600px;
        margin: 0 auto;
        background: #ffffff;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        overflow: hidden;
      }
      
      .header {
        background: #ffffff;
        border-bottom: 1px solid #e5e7eb;
        padding: 32px 24px;
        text-align: center;
      }
      
      .logo {
        font-size: 24px;
        font-weight: 700;
        color: #1a1a1a;
        margin-bottom: 8px;
      }
      
      .header-title {
        font-size: 20px;
        font-weight: 600;
        color: #374151;
        margin-bottom: 4px;
      }
      
      .header-subtitle {
        font-size: 14px;
        color: #6b7280;
      }
      
      .content {
        padding: 32px 24px;
      }
      
      .status-update {
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 24px;
        text-align: center;
        margin-bottom: 32px;
      }
      
      .status-badge {
        display: inline-block;
        background: ${getStatusColor(orderData.status)};
        color: white;
        padding: 8px 16px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
        text-transform: uppercase;
        margin-bottom: 16px;
      }
      
      .status-message {
        font-size: 16px;
        font-weight: 500;
        color: #1a1a1a;
        line-height: 1.5;
      }
      
      .order-info {
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        padding: 20px;
        margin-bottom: 24px;
      }
      
      .order-info h3 {
        font-size: 16px;
        font-weight: 600;
        color: #1a1a1a;
        margin-bottom: 16px;
      }
      
      .info-row {
        margin-bottom: 8px;
        display: flex;
        align-items: center;
      }
      
      .info-label {
        font-weight: 500;
        color: #374151;
        min-width: 100px;
        margin-right: 12px;
        font-size: 14px;
      }
      
      .info-value {
        color: #1a1a1a;
        font-size: 14px;
      }
      
      .note-section {
        background: #fef3c7;
        border: 1px solid #f59e0b;
        border-radius: 6px;
        padding: 16px;
        margin: 24px 0;
      }
      
      .note-section h3 {
        font-size: 14px;
        font-weight: 600;
        color: #92400e;
        margin-bottom: 8px;
      }
      
      .note-section p {
        color: #92400e;
        font-size: 14px;
        line-height: 1.5;
        margin: 0;
      }
      
      .cta-button {
        display: inline-block;
        background: #85c03e;
        color: white;
        padding: 12px 24px;
        text-decoration: none;
        border-radius: 6px;
        font-weight: 500;
        font-size: 14px;
        margin: 24px 0;
        transition: background-color 0.2s ease;
      }
      
      .cta-button:hover {
        background: #6ba832;
      }
      
      .footer {
        background: #f9fafb;
        border-top: 1px solid #e5e7eb;
        padding: 24px;
        text-align: center;
      }
      
      .footer p {
        font-size: 14px;
        color: #6b7280;
        margin: 4px 0;
        line-height: 1.5;
      }
      
      .footer .copyright {
        font-size: 12px;
        color: #9ca3af;
        margin-top: 16px;
      }
    </style>
  </head>
  <body>
    <div class="email-container">
      <div class="header">
        <div class="logo">Hot Market Design DTF</div>
        <div class="header-title">Order Update</div>
        <div class="header-subtitle">Status notification</div>
      </div>
      
      <div class="content">
        <div class="status-update">
          <div class="status-badge">${getStatusText(orderData.status)}</div>
          <div class="status-message">${getStatusMessage(
            orderData.status
          )}</div>
        </div>
        
        <div class="order-info">
          <h3>Order Information</h3>
          <div class="info-row">
            <span class="info-label">Order #:</span>
            <span class="info-value">${orderData.orderNumber}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Customer:</span>
            <span class="info-value">${orderData.customerInfo.firstName} ${
    orderData.customerInfo.lastName
  }</span>
          </div>
          <div class="info-row">
            <span class="info-label">Status:</span>
            <span class="info-value">${getStatusText(orderData.status)}</span>
          </div>
        </div>
        
        ${
          orderData.note
            ? `
        <div class="note-section">
          <h3>Additional Information</h3>
          <p>${orderData.note}</p>
        </div>
        `
            : ""
        }
        
        <div style="text-align: center;">
          <a href="https://hotmarketdtf.com/orders" class="cta-button">View Order Details</a>
        </div>
      </div>
      
      <div class="footer">
        <p>We'll continue to keep you updated on your order progress.</p>
        <p>For any questions, please contact our customer service team.</p>
        <p class="copyright">© ${new Date().getFullYear()} Hot Market Design DTF. All rights reserved.</p>
      </div>
    </div>
  </body>
  </html>
  `;

  const mailOptions = {
    from: "Hot Market Design DTF <no-reply@dtfstickers.com>",
    to,
    subject: `Order Update - ${orderData.orderNumber} - ${getStatusText(
      orderData.status
    )}`,
    html,
  };

  await transporter.sendMail(mailOptions);
};
