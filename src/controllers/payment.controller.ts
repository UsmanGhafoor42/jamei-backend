import { Request, Response } from "express";
import Order from "../models/order.model";
import CartItem from "../models/cart.model";
import { APIContracts, APIControllers } from "authorizenet";

interface PaymentResult {
  success: boolean;
  transactionId?: string;
  authCode?: string;
  error?: string;
}

export const processPayment = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { paymentData, customerInfo, shippingInfo, cartItems, pricing } =
      req.body;

    // Debug logging
    console.log("Payment data received:", {
      cardNumber: paymentData?.cardNumber
        ? `${paymentData.cardNumber.substring(
            0,
            4
          )}****${paymentData.cardNumber.substring(-4)}`
        : "undefined",
      expirationDate: paymentData?.expirationDate,
      cvv: paymentData?.cvv ? "***" : "undefined",
      amount: pricing?.total,
    });

    // Validate required data
    if (
      !paymentData ||
      !customerInfo ||
      !shippingInfo ||
      !cartItems ||
      !pricing
    ) {
      return res.status(400).json({
        message: "Missing required payment information",
      });
    }

    // Process payment with Authorize.net
    const paymentResult: PaymentResult = await processAuthorizeNetPayment(
      paymentData,
      pricing.total
    );

    if (!paymentResult.success) {
      return res.status(400).json({
        message: "Payment failed",
        error: paymentResult.error,
      });
    }

    // Create order items from cart
    const orderItems = cartItems.map((item: any) => ({
      productId: item.productId,
      title: item.title,
      imageUrl: item.imageUrl,
      size: item.size,
      sizeAndQuantity: item.sizeAndQuantity,
      colorsName: item.colorsName,
      colorsCode: item.colorsCode,
      options: item.options,
      quantity: item.quantity,
      unitPrice: item.total / item.quantity,
      totalPrice: item.total,
      imprintFiles: item.imprintFiles,
      imprintLocations: item.imprintLocations,
      orderNotes: item.orderNotes,
    }));

    // Create new order
    const orderData = {
      user: user.id,
      customerInfo: {
        firstName: customerInfo.firstName,
        lastName: customerInfo.lastName,
        email: customerInfo.email,
        phone: customerInfo.phone,
        address: customerInfo.address,
      },
      payment: {
        method: "Credit Card",
        transactionId: paymentResult.transactionId!,
        amount: pricing.total,
        currency: "USD",
        status: "completed" as const,
        authCode: paymentResult.authCode,
        paymentDate: new Date(),
      },
      items: orderItems,
      subtotal: pricing.subtotal,
      tax: pricing.tax,
      shippingCost: pricing.shipping,
      discount: pricing.discount,
      total: pricing.total,
      shipping: {
        method: shippingInfo.method,
        address: shippingInfo.address,
      },
      status: "order_placed" as const,
    };

    const order = await Order.create(orderData);

    // Clear user's cart after successful order
    await CartItem.deleteMany({ user: user.id });

    res.status(201).json({
      message: "Payment processed successfully",
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        total: order.total,
        status: order.status,
      },
      transactionId: paymentResult.transactionId,
    });
  } catch (error) {
    console.error("Payment processing error:", error);
    res.status(500).json({
      message: "Error processing payment",
      error:
        process.env.NODE_ENV === "development"
          ? (error as Error).message
          : "Internal server error",
    });
  }
};

// Authorize.net payment processing
const processAuthorizeNetPayment = async (
  paymentData: any,
  amount: number
): Promise<PaymentResult> => {
  try {
    // Clean and validate card number
    let cardNumber = paymentData.cardNumber;

    // Remove all non-digit characters (spaces, dashes, etc.)
    cardNumber = cardNumber.replace(/\D/g, "");

    // Debug logging
    console.log("Card number processing:", {
      originalLength: paymentData.cardNumber.length,
      cleanedLength: cardNumber.length,
      originalCard:
        paymentData.cardNumber.substring(0, 4) +
        "****" +
        paymentData.cardNumber.substring(-4),
      cleanedCard:
        cardNumber.substring(0, 4) + "****" + cardNumber.substring(-4),
    });

    // Validate card number length (should be 13-19 digits)
    if (cardNumber.length < 13 || cardNumber.length > 19) {
      return {
        success: false,
        error: "Invalid card number length. Please enter a valid card number.",
      };
    }

    // Validate card number format (basic Luhn algorithm check)
    if (!isValidCardNumber(cardNumber)) {
      return {
        success: false,
        error: "Invalid card number. Please check and try again.",
      };
    }

    // Validate expiration date format (MM/YY or MM/YYYY)
    const expirationDate = paymentData.expirationDate;
    if (!expirationDate || !/^\d{2}\/\d{2,4}$/.test(expirationDate)) {
      return {
        success: false,
        error:
          "Invalid expiration date format. Please use MM/YY or MM/YYYY format.",
      };
    }

    // Validate CVV (3-4 digits)
    const cvv = paymentData.cvv;
    if (!cvv || !/^\d{3,4}$/.test(cvv)) {
      return {
        success: false,
        error: "Invalid CVV. Please enter a 3 or 4 digit security code.",
      };
    }

    // Configure Authorize.net credentials
    const merchantAuthenticationType =
      new APIContracts.MerchantAuthenticationType();
    merchantAuthenticationType.setName(process.env.AUTHORIZE_NET_LOGIN_ID!);
    merchantAuthenticationType.setTransactionKey(
      process.env.AUTHORIZE_NET_TRANSACTION_KEY!
    );

    // Create credit card data
    const creditCard = new APIContracts.CreditCardType();
    creditCard.setCardNumber(cardNumber); // Use cleaned card number
    creditCard.setExpirationDate(paymentData.expirationDate);
    creditCard.setCardCode(paymentData.cvv);

    // Create payment data
    const paymentType = new APIContracts.PaymentType();
    paymentType.setCreditCard(creditCard);

    // Create transaction request
    const transactionRequestType = new APIContracts.TransactionRequestType();
    transactionRequestType.setTransactionType(
      APIContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION
    );
    transactionRequestType.setPayment(paymentType);
    transactionRequestType.setAmount(amount);

    // Create request
    const createRequest = new APIContracts.CreateTransactionRequest();
    createRequest.setMerchantAuthentication(merchantAuthenticationType);
    createRequest.setTransactionRequest(transactionRequestType);

    // Process transaction
    const ctrl = new APIControllers.CreateTransactionController(
      createRequest.getJSON()
    );

    return new Promise<PaymentResult>((resolve) => {
      ctrl.execute(() => {
        const apiResponse = ctrl.getResponse();
        const response = new APIContracts.CreateTransactionResponse(
          apiResponse
        );

        if (
          response.getMessages().getResultCode() ===
          APIContracts.MessageTypeEnum.OK
        ) {
          const transactionResponse = response.getTransactionResponse();
          resolve({
            success: true,
            transactionId: transactionResponse.getTransId(),
            authCode: transactionResponse.getAuthCode(),
          });
        } else {
          const errorMessages = response.getMessages().getMessage();
          const errorMessage = errorMessages
            ? errorMessages[0].getText()
            : "Payment failed";
          resolve({
            success: false,
            error: errorMessage,
          });
        }
      });
    });
  } catch (error) {
    console.error("Authorize.net error:", error);
    return {
      success: false,
      error: "Payment processing error",
    };
  }
};

// Luhn algorithm to validate card number
const isValidCardNumber = (cardNumber: string): boolean => {
  let sum = 0;
  let isEven = false;

  // Loop through values starting from the rightmost side
  for (let i = cardNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cardNumber.charAt(i));

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
};

// Get user's past orders
export const getUserOrders = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const orders = await Order.find({ user: user.id })
      .sort({ createdAt: -1 })
      .select("-adminNotes"); // Don't send admin notes to users

    res.json(orders);
  } catch (error) {
    console.error("Error fetching user orders:", error);
    res.status(500).json({
      message: "Error fetching orders",
    });
  }
};

// Get single order details
export const getOrderDetails = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { orderId } = req.params;

    const order = await Order.findOne({ _id: orderId, user: user.id }).select(
      "-adminNotes"
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

// Reorder functionality
export const reorderItems = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { orderId } = req.params;

    // Get the original order
    const originalOrder = await Order.findOne({ _id: orderId, user: user.id });
    if (!originalOrder) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    // Convert order items back to cart items
    const cartItems = originalOrder.items.map((item) => ({
      user: user.id,
      productId: item.productId,
      title: item.title,
      imageUrl: item.imageUrl,
      size: item.size,
      sizeAndQuantity: item.sizeAndQuantity,
      colorsName: item.colorsName,
      colorsCode: item.colorsCode,
      options: item.options,
      quantity: item.quantity,
      total: item.totalPrice,
      imprintFiles: item.imprintFiles,
      imprintLocations: item.imprintLocations,
      orderNotes: item.orderNotes,
    }));

    // Add items back to cart
    await CartItem.insertMany(cartItems);

    res.json({
      message: "Items added to cart successfully",
      addedItems: cartItems.length,
    });
  } catch (error) {
    console.error("Error reordering items:", error);
    res.status(500).json({
      message: "Error adding items to cart",
    });
  }
};
