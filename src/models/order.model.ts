import mongoose, { Schema, Document } from "mongoose";

export interface IOrder extends Document {
  user: mongoose.Types.ObjectId;
  orderNumber: string;
  orderDate: Date;

  // Order Status
  status:
    | "order_placed"
    | "in_printing"
    | "order_dispatched"
    | "completed"
    | "cancelled";
  statusHistory: Array<{
    status: string;
    timestamp: Date;
    note?: string;
  }>;

  // Customer Information
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

  // Payment Information
  payment: {
    method: string;
    transactionId: string;
    amount: number;
    currency: string;
    status: "pending" | "completed" | "failed" | "refunded";
    authCode?: string;
    paymentDate?: Date;
  };

  // Order Items (from cart)
  items: Array<{
    productId?: string;
    title: string;
    imageUrl?: string;
    size?: string;
    sizeAndQuantity?: Record<string, number>;
    colorsName?: string;
    colorsCode?: string;
    options?: string[];
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    imprintFiles?: string[];
    imprintLocations?: string[];
    orderNotes?: string;
  }>;

  // Pricing Breakdown
  subtotal: number;
  tax: number;
  shippingCost: number;
  discount: number;
  total: number;

  // Shipping Information
  shipping: {
    method: string;
    trackingNumber?: string;
    estimatedDelivery?: Date;
    actualDelivery?: Date;
    address: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
  };

  // Admin Notes
  adminNotes?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema<IOrder>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },
    orderDate: {
      type: Date,
      default: Date.now,
    },

    // Order Status
    status: {
      type: String,
      enum: [
        "order_placed",
        "in_printing",
        "order_dispatched",
        "completed",
        "cancelled",
      ],
      default: "order_placed",
    },
    statusHistory: [
      {
        status: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        note: { type: String },
      },
    ],

    // Customer Information
    customerInfo: {
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String },
      address: {
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        zipCode: { type: String, required: true },
        country: { type: String, required: true },
      },
    },

    // Payment Information
    payment: {
      method: { type: String, required: true },
      transactionId: { type: String, required: true },
      amount: { type: Number, required: true },
      currency: { type: String, default: "USD" },
      status: {
        type: String,
        enum: ["pending", "completed", "failed", "refunded"],
        default: "pending",
      },
      authCode: { type: String },
      paymentDate: { type: Date },
    },

    // Order Items
    items: [
      {
        productId: { type: String },
        title: { type: String, required: true },
        imageUrl: { type: String },
        size: { type: String },
        sizeAndQuantity: { type: Schema.Types.Mixed },
        colorsName: { type: String },
        colorsCode: { type: String },
        options: [{ type: String }],
        quantity: { type: Number, required: true },
        unitPrice: { type: Number, required: true },
        totalPrice: { type: Number, required: true },
        imprintFiles: [{ type: String }],
        imprintLocations: [{ type: String }],
        orderNotes: { type: String },
      },
    ],

    // Pricing
    subtotal: { type: Number, required: true },
    tax: { type: Number, default: 0 },
    shippingCost: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true },

    // Shipping
    shipping: {
      method: { type: String, required: true },
      trackingNumber: { type: String },
      estimatedDelivery: { type: Date },
      actualDelivery: { type: Date },
      address: {
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        zipCode: { type: String, required: true },
        country: { type: String, required: true },
      },
    },

    // Admin Notes
    adminNotes: { type: String },
  },
  {
    timestamps: true,
  }
);

// Generate unique order number
orderSchema.pre("save", async function (next) {
  if (this.isNew && !this.orderNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");

    // Get count of orders for today
    const todayStart = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );
    const todayEnd = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate() + 1
    );

    const orderCount = await mongoose.model("Order").countDocuments({
      createdAt: { $gte: todayStart, $lt: todayEnd },
    });

    const sequence = (orderCount + 1).toString().padStart(3, "0");
    this.orderNumber = `ORD${year}${month}${day}${sequence}`;
  }

  // Add to status history when status changes
  if (this.isModified("status")) {
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date(),
    });
  }

  next();
});

export default mongoose.model<IOrder>("Order", orderSchema);
