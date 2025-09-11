import { Request, Response } from "express";
import Order from "../models/order.model";
import CartItem from "../models/cart.model";
import { APIContracts, APIControllers } from "authorizenet";
import { sendOrderConfirmationEmail } from "../utils/mailer";

interface PaymentResult {
  success: boolean;
  transactionId?: string;
  authCode?: string;
  error?: string;
  order?: any; // Added for order creation result
}

// Process payment
export const processPayment = async (req: Request, res: Response) => {
  try {
    console.log("✅ INFO: POST /api/payment/process");

    const { paymentData, customerInfo, shippingInfo, cartItems, pricing } =
      req.body;

    console.log("Payment data received:", {
      cardNumber:
        paymentData.cardNumber.substring(0, 4) +
        "****" +
        paymentData.cardNumber.substring(-4),
      expirationDate: paymentData.expirationDate,
      cvv: "***",
      amount: pricing.total,
    });

    console.log("Starting payment processing...");

    const user = (req as any).user;

    // Process payment directly without complex Promise.race
    const result = await processPaymentDirect(
      paymentData,
      pricing.total,
      customerInfo,
      shippingInfo,
      cartItems,
      pricing,
      user.id
    );

    if (result.success) {
      console.log("Payment processed successfully:", result);
      res.json({
        success: true,
        message: "Payment processed successfully",
        order: result.order,
        transactionId: result.transactionId,
      });
    } else {
      console.log("Payment failed:", result.error);
      res.status(400).json({
        success: false,
        message: "Payment failed",
        error: result.error,
      });
    }
  } catch (error) {
    console.error("Payment processing error:", error);
    res.status(500).json({
      success: false,
      message: "Error processing payment",
      error: (error as Error).message,
    });
  }
};

// Simplified direct payment processing
const processPaymentDirect = async (
  paymentData: any,
  amount: number,
  customerInfo: any,
  shippingInfo: any,
  cartItems: any[],
  pricing: any,
  userId: string
): Promise<PaymentResult> => {
  try {
    console.log("Starting Authorize.net payment processing...");

    // Check if Authorize.net credentials are set
    const loginId = process.env.AUTHORIZE_NET_LOGIN_ID;
    const transactionKey = process.env.AUTHORIZE_NET_TRANSACTION_KEY;

    console.log("Authorize.net credentials check:", {
      loginId: loginId ? "SET" : "MISSING",
      transactionKey: transactionKey ? "SET" : "MISSING",
      amount: amount,
    });

    if (!loginId || !transactionKey) {
      console.error("Authorize.net credentials missing:", {
        loginId: loginId ? "SET" : "MISSING",
        transactionKey: transactionKey ? "SET" : "MISSING",
      });
      return {
        success: false,
        error: "Payment gateway configuration error. Please contact support.",
      };
    }

    // Clean and validate card number
    let cardNumber = paymentData.cardNumber;

    // Remove all non-digit characters (spaces, dashes, etc.)
    cardNumber = cardNumber.replace(/\D/g, "");

    // Debug logging
    console.log("Card number processing:", {
      originalLength: paymentData.cardNumber.length,
      cleanedLength: cardNumber.length,
      originalCard: paymentData.cardNumber,
      cleanedCard: cardNumber,
      originalCardFormatted:
        paymentData.cardNumber.substring(0, 4) +
        "****" +
        paymentData.cardNumber.substring(-4),
      cleanedCardFormatted:
        cardNumber.substring(0, 4) + "****" + cardNumber.substring(-4),
    });

    // Validate card number length (should be 13-19 digits)
    if (cardNumber.length < 13 || cardNumber.length > 19) {
      console.log("Card number length validation failed:", {
        length: cardNumber.length,
        cardNumber: cardNumber,
        originalCard: paymentData.cardNumber,
      });
      return {
        success: false,
        error: "Invalid card number length. Please enter a valid card number.",
      };
    }

    // Validate card number format (basic Luhn algorithm check)
    if (!isValidCardNumber(cardNumber)) {
      console.log("Card number Luhn validation failed:", {
        cardNumber: cardNumber,
        originalCard: paymentData.cardNumber,
      });
      return {
        success: false,
        error: "Invalid card number. Please check and try again.",
      };
    }

    // Validate expiration date format (MM/YY or MM/YYYY)
    const expirationDate = paymentData.expirationDate;
    if (!expirationDate || !/^\d{2}\/\d{2,4}$/.test(expirationDate)) {
      console.log("Expiration date validation failed:", expirationDate);
      return {
        success: false,
        error:
          "Invalid expiration date format. Please use MM/YY or MM/YYYY format.",
      };
    }

    // Validate CVV (3-4 digits)
    const cvv = paymentData.cvv;
    if (!cvv || !/^\d{3,4}$/.test(cvv)) {
      console.log("CVV validation failed:", cvv);
      return {
        success: false,
        error: "Invalid CVV. Please enter a 3 or 4 digit security code.",
      };
    }

    console.log("All validations passed, configuring Authorize.net...");

    // Configure Authorize.net credentials
    const merchantAuthenticationType =
      new APIContracts.MerchantAuthenticationType();
    merchantAuthenticationType.setName(loginId as string);
    merchantAuthenticationType.setTransactionKey(transactionKey as string);

    console.log("Creating credit card data...");
    // Create credit card data
    const creditCard = new APIContracts.CreditCardType();
    creditCard.setCardNumber(cardNumber); // Use cleaned card number
    creditCard.setExpirationDate(expirationDate);
    creditCard.setCardCode(cvv);

    // Create payment data
    const paymentType = new APIContracts.PaymentType();
    paymentType.setCreditCard(creditCard);

    console.log("Creating transaction request...");
    // Create transaction request
    const transactionRequestType = new APIContracts.TransactionRequestType();

    // Use direct AUTHCAPTURETRANSACTION for simplicity
    transactionRequestType.setTransactionType(
      APIContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION
    );
    transactionRequestType.setPayment(paymentType);
    transactionRequestType.setAmount(amount);

    // Add customer information
    const customer = new APIContracts.CustomerDataType();
    customer.setEmail(paymentData.cardholderName || "test@example.com");
    transactionRequestType.setCustomer(customer);

    // Add billing address
    const billTo = new APIContracts.CustomerAddressType();
    billTo.setFirstName(paymentData.cardholderName?.split(" ")[0] || "Test");
    billTo.setLastName(
      paymentData.cardholderName?.split(" ").slice(1).join(" ") || "User"
    );
    billTo.setAddress("123 Test St");
    billTo.setCity("Test City");
    billTo.setState("CA");
    billTo.setZip("12345");
    billTo.setCountry("US");
    transactionRequestType.setBillTo(billTo);

    // Create request
    const createRequest = new APIContracts.CreateTransactionRequest();
    createRequest.setMerchantAuthentication(merchantAuthenticationType);
    createRequest.setTransactionRequest(transactionRequestType);

    console.log("Processing transaction with Authorize.net...");
    // Process transaction
    const ctrl = new APIControllers.CreateTransactionController(
      createRequest.getJSON()
    );

    // Process payment synchronously
    const paymentResult = await new Promise<PaymentResult>((resolve) => {
      // Add timeout to prevent hanging
      const timeout = setTimeout(() => {
        console.log("Authorize.net execution timed out after 30 seconds");
        resolve({
          success: false,
          error: "Payment processing timed out",
        });
      }, 30000); // 30 second timeout

      try {
        ctrl.execute(() => {
          console.log("Authorize.net response received...");
          clearTimeout(timeout);

          try {
            const apiResponse = ctrl.getResponse();
            const response = new APIContracts.CreateTransactionResponse(
              apiResponse
            );

            console.log("Processing Authorize.net response...");
            console.log(
              "Response result code:",
              response.getMessages().getResultCode()
            );
            console.log(
              "Response messages:",
              response.getMessages().getMessage()
            );

            if (
              response.getMessages().getResultCode() ===
              APIContracts.MessageTypeEnum.OK
            ) {
              const transactionResponse = response.getTransactionResponse();
              console.log("Payment successful:", {
                transactionId: transactionResponse.getTransId(),
                authCode: transactionResponse.getAuthCode(),
                responseCode: transactionResponse.getResponseCode(),
              });

              console.log("=== PAYMENT COMPLETED, RESOLVING PROMISE ===");
              resolve({
                success: true,
                transactionId: transactionResponse.getTransId(),
                authCode: transactionResponse.getAuthCode(),
              });
            } else {
              // Get detailed error information
              const errorMessages = response.getMessages().getMessage();
              let errorMessage = "Payment failed";

              if (errorMessages && errorMessages.length > 0) {
                errorMessage = errorMessages[0].getText();
              }

              // Check for transaction response errors
              const transactionResponse = response.getTransactionResponse();
              if (transactionResponse) {
                const responseCode = transactionResponse.getResponseCode();
                console.log("Transaction response error:", {
                  responseCode,
                  transactionId: transactionResponse.getTransId(),
                });
              }

              console.log("Payment failed:", errorMessage);
              resolve({
                success: false,
                error: errorMessage,
              });
            }
          } catch (responseError) {
            console.error(
              "Error processing Authorize.net response:",
              responseError
            );
            resolve({
              success: false,
              error:
                "Error processing payment response: " +
                (responseError as Error).message,
            });
          }
        });
      } catch (executeError) {
        console.error(
          "Error executing Authorize.net transaction:",
          executeError
        );
        clearTimeout(timeout);
        resolve({
          success: false,
          error: "Error executing payment: " + (executeError as Error).message,
        });
      }
    });

    console.log("=== PAYMENT RESULT RECEIVED ===", paymentResult);

    // If payment successful, create order
    if (paymentResult.success) {
      console.log("=== PAYMENT SUCCESSFUL, STARTING ORDER CREATION ===");
      const orderResult = await createOrder(
        customerInfo,
        shippingInfo,
        cartItems,
        pricing,
        paymentResult.transactionId!,
        paymentResult.authCode || "",
        userId
      );

      console.log("=== ORDER CREATION COMPLETED ===", orderResult);

      if (orderResult.success) {
        console.log("=== ORDER CREATED SUCCESSFULLY ===");

        // Send order confirmation email
        try {
          console.log("Sending order confirmation email...");
          await sendOrderConfirmationEmail(
            customerInfo.email,
            orderResult.order
          );
          console.log("Order confirmation email sent successfully");
        } catch (emailError) {
          console.error("Failed to send order confirmation email:", emailError);
          // Don't fail the order creation if email fails
        }

        return {
          success: true,
          transactionId: paymentResult.transactionId,
          authCode: paymentResult.authCode,
          order: orderResult.order,
        };
      } else {
        console.log("=== ORDER CREATION FAILED ===");
        return {
          success: false,
          error:
            "Payment successful but order creation failed: " +
            orderResult.error,
        };
      }
    }

    console.log("=== RETURNING PAYMENT RESULT ===", paymentResult);
    return paymentResult;
  } catch (error) {
    console.error("Authorize.net error details:", {
      error: error,
      message: (error as Error).message,
      stack: (error as Error).stack,
      name: (error as Error).name,
    });
    return {
      success: false,
      error: "Payment processing error",
    };
  }
};

// Capture transaction after authorization
const captureTransaction = async (
  transactionId: string,
  amount: number
): Promise<PaymentResult> => {
  try {
    console.log("=== STARTING CAPTURE TRANSACTION ===");
    console.log("Capturing transaction:", transactionId, "Amount:", amount);

    const loginId = process.env.AUTHORIZE_NET_LOGIN_ID;
    const transactionKey = process.env.AUTHORIZE_NET_TRANSACTION_KEY;

    if (!loginId || !transactionKey) {
      throw new Error("Authorize.net credentials not configured");
    }

    console.log("Setting up capture transaction...");
    const merchantAuthenticationType =
      new APIContracts.MerchantAuthenticationType();
    merchantAuthenticationType.setName(loginId as string);
    merchantAuthenticationType.setTransactionKey(transactionKey as string);

    console.log("Creating capture transaction request...");
    const transactionRequestType = new APIContracts.TransactionRequestType();
    transactionRequestType.setTransactionType(
      APIContracts.TransactionTypeEnum.PRIORAUTHCAPTURETRANSACTION
    );
    transactionRequestType.setRefTransId(transactionId);
    transactionRequestType.setAmount(amount);

    console.log("Building capture request...");
    const createRequest = new APIContracts.CreateTransactionRequest();
    createRequest.setMerchantAuthentication(merchantAuthenticationType);
    createRequest.setTransactionRequest(transactionRequestType);

    console.log("Creating capture controller...");
    const ctrl = new APIControllers.CreateTransactionController(
      createRequest.getJSON()
    );

    console.log("Executing capture transaction...");
    return new Promise<PaymentResult>((resolve) => {
      // Add timeout to prevent hanging
      const timeout = setTimeout(() => {
        console.log("Capture transaction timed out after 30 seconds");
        resolve({
          success: false,
          error: "Capture transaction timed out",
        });
      }, 30000); // 30 second timeout

      ctrl.execute(() => {
        console.log("=== CAPTURE RESPONSE RECEIVED ===");
        clearTimeout(timeout);

        const apiResponse = ctrl.getResponse();
        console.log("Raw API response:", apiResponse);

        const response = new APIContracts.CreateTransactionResponse(
          apiResponse
        );

        console.log(
          "Capture response result code:",
          response.getMessages().getResultCode()
        );
        console.log(
          "Capture response messages:",
          response.getMessages().getMessage()
        );

        if (
          response.getMessages().getResultCode() ===
          APIContracts.MessageTypeEnum.OK
        ) {
          const transactionResponse = response.getTransactionResponse();
          console.log("=== CAPTURE SUCCESSFUL ===");
          console.log("Transaction captured successfully:", {
            transactionId: transactionResponse.getTransId(),
            authCode: transactionResponse.getAuthCode(),
            responseCode: transactionResponse.getResponseCode(),
            responseReason: transactionResponse.getResponseReasonDescription(),
          });
          resolve({
            success: true,
            transactionId: transactionResponse.getTransId(),
            authCode: transactionResponse.getAuthCode(),
          });
        } else {
          console.log("=== CAPTURE FAILED ===");
          const errorMessages = response.getMessages().getMessage();
          const errorMessage =
            errorMessages && errorMessages.length > 0
              ? errorMessages[0].getText()
              : "Capture failed";
          console.log("Capture failed:", errorMessage);
          resolve({
            success: false,
            error: errorMessage,
          });
        }
      });
    });
  } catch (error) {
    console.error("=== CAPTURE ERROR ===");
    console.error("Capture error:", error);
    return {
      success: false,
      error: "Capture processing error: " + (error as Error).message,
    };
  }
};

// Create order in database
const createOrder = async (
  customerInfo: any,
  shippingInfo: any,
  cartItems: any[],
  pricing: any,
  transactionId: string,
  authCode: string,
  userId: string
): Promise<PaymentResult> => {
  try {
    console.log("=== STARTING ORDER CREATION ===");
    console.log("User ID:", userId);
    console.log("Cart items count:", cartItems.length);
    console.log("Transaction ID:", transactionId);

    // Convert userId to ObjectId if it's a string
    const mongoose = require("mongoose");
    let userObjectId;
    try {
      userObjectId = new mongoose.Types.ObjectId(userId);
      console.log("User ID converted to ObjectId:", userObjectId);
    } catch (error) {
      console.error("Invalid user ID format:", userId);
      return {
        success: false,
        error: "Invalid user ID format",
      };
    }

    // Create order items from cart
    console.log("Creating order items...");
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
    console.log("Order items created:", orderItems.length);

    // Create new order
    console.log("Creating order data...");
    const orderData = {
      user: userObjectId,
      customerInfo: {
        firstName: customerInfo.firstName,
        lastName: customerInfo.lastName,
        email: customerInfo.email,
        phone: customerInfo.phone,
        address: customerInfo.address,
      },
      payment: {
        method: "Credit Card",
        transactionId: transactionId,
        amount: pricing.total,
        currency: "USD",
        status: "completed" as const,
        authCode: authCode,
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
    console.log("Order data prepared, attempting to save...");

    console.log("Saving order to database...");
    const order = await Order.create(orderData);
    console.log("Order saved successfully, ID:", order._id);

    // Clear user's cart after successful order
    console.log("Clearing user cart...");
    const deleteResult = await CartItem.deleteMany({ user: userObjectId });
    console.log("Cart cleared, deleted items:", deleteResult.deletedCount);

    console.log("Order created successfully!");
    return {
      success: true,
      order: order,
    };
  } catch (error) {
    console.error("=== ORDER CREATION ERROR ===");
    console.error("Error creating order:", error);
    console.error("Error details:", {
      message: (error as Error).message,
      stack: (error as Error).stack,
      name: (error as Error).name,
    });
    return {
      success: false,
      error: "Error creating order: " + (error as Error).message,
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

// Test Authorize.net configuration
export const testPaymentConfig = async (req: Request, res: Response) => {
  try {
    const loginId = process.env.AUTHORIZE_NET_LOGIN_ID;
    const transactionKey = process.env.AUTHORIZE_NET_TRANSACTION_KEY;

    const configStatus = {
      loginId: loginId ? "SET" : "MISSING",
      transactionKey: transactionKey ? "SET" : "MISSING",
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    };

    console.log("Payment config check:", configStatus);

    res.json({
      message: "Payment configuration status",
      config: configStatus,
      ready: !!(loginId && transactionKey),
    });
  } catch (error) {
    console.error("Error checking payment config:", error);
    res.status(500).json({
      message: "Error checking payment configuration",
    });
  }
};

// Test Authorize.net connection
export const testAuthorizeNetConnection = async (
  req: Request,
  res: Response
) => {
  try {
    console.log("Testing Authorize.net connection...");

    const loginId = process.env.AUTHORIZE_NET_LOGIN_ID;
    const transactionKey = process.env.AUTHORIZE_NET_TRANSACTION_KEY;

    if (!loginId || !transactionKey) {
      return res.status(500).json({
        success: false,
        error: "Authorize.net credentials not configured",
      });
    }

    // Configure Authorize.net credentials
    const merchantAuthenticationType =
      new APIContracts.MerchantAuthenticationType();
    merchantAuthenticationType.setName(loginId as string);
    merchantAuthenticationType.setTransactionKey(transactionKey as string);

    // Create a simple test transaction
    const creditCard = new APIContracts.CreditCardType();
    creditCard.setCardNumber("4111111111111111");
    creditCard.setExpirationDate("12/25");
    creditCard.setCardCode("123");

    const paymentType = new APIContracts.PaymentType();
    paymentType.setCreditCard(creditCard);

    const transactionRequestType = new APIContracts.TransactionRequestType();
    // Use AUTHCAPTURETRANSACTION for testing
    transactionRequestType.setTransactionType(
      APIContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION
    );
    transactionRequestType.setPayment(paymentType);
    transactionRequestType.setAmount(1.0); // Test with $1.00

    const createRequest = new APIContracts.CreateTransactionRequest();
    createRequest.setMerchantAuthentication(merchantAuthenticationType);
    createRequest.setTransactionRequest(transactionRequestType);

    const ctrl = new APIControllers.CreateTransactionController(
      createRequest.getJSON()
    );

    return new Promise<void>((resolve) => {
      ctrl.execute(() => {
        const apiResponse = ctrl.getResponse();
        const response = new APIContracts.CreateTransactionResponse(
          apiResponse
        );

        console.log("Test transaction response:", {
          resultCode: response.getMessages().getResultCode(),
          messages: response.getMessages().getMessage(),
        });

        if (
          response.getMessages().getResultCode() ===
          APIContracts.MessageTypeEnum.OK
        ) {
          const transactionResponse = response.getTransactionResponse();
          res.json({
            success: true,
            message: "Authorize.net connection successful",
            transactionId: transactionResponse.getTransId(),
            authCode: transactionResponse.getAuthCode(),
            responseCode: transactionResponse.getResponseCode(),
            responseReason: transactionResponse.getResponseReasonDescription(),
          });
        } else {
          const errorMessages = response.getMessages().getMessage();
          const errorMessage =
            errorMessages && errorMessages.length > 0
              ? errorMessages[0].getText()
              : "Test transaction failed";

          res.status(400).json({
            success: false,
            error: errorMessage,
            details: {
              resultCode: response.getMessages().getResultCode(),
              messages: response.getMessages().getMessage(),
            },
          });
        }
        resolve();
      });
    });
  } catch (error) {
    console.error("Authorize.net test error:", error);
    res.status(500).json({
      success: false,
      error: "Authorize.net test failed",
      details: (error as Error).message,
    });
  }
};

// Test database connection
export const testDatabase = async (req: Request, res: Response) => {
  try {
    console.log("=== TESTING DATABASE CONNECTION ===");

    // Test Order model
    console.log("Testing Order model...");
    const orderCount = await Order.countDocuments();
    console.log("Order count:", orderCount);

    // Test CartItem model
    console.log("Testing CartItem model...");
    const cartCount = await CartItem.countDocuments();
    console.log("Cart count:", cartCount);

    // Test creating a simple order with valid ObjectId
    console.log("Testing order creation...");
    const mongoose = require("mongoose");
    const testUserId = new mongoose.Types.ObjectId(); // Create valid ObjectId

    const testOrder = await Order.create({
      user: testUserId,
      orderNumber: "TEST-" + Date.now(),
      orderDate: new Date(),
      status: "order_placed",
      statusHistory: [{ status: "order_placed", timestamp: new Date() }],
      customerInfo: {
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        phone: "123-456-7890",
        address: {
          street: "123 Test St",
          city: "Test City",
          state: "CA",
          zipCode: "12345",
          country: "US",
        },
      },
      payment: {
        method: "Test",
        transactionId: "test-transaction",
        amount: 10.0,
        currency: "USD",
        status: "completed",
        authCode: "test-auth",
        paymentDate: new Date(),
      },
      items: [
        {
          productId: "test-product",
          title: "Test Product",
          quantity: 1,
          unitPrice: 10.0,
          totalPrice: 10.0,
        },
      ],
      subtotal: 10.0,
      tax: 0,
      shippingCost: 0,
      discount: 0,
      total: 10.0,
      shipping: {
        method: "Test Shipping",
        address: {
          street: "123 Test St",
          city: "Test City",
          state: "CA",
          zipCode: "12345",
          country: "US",
        },
      },
    });

    console.log("Test order created:", testOrder._id);

    // Clean up test order
    await Order.findByIdAndDelete(testOrder._id);
    console.log("Test order cleaned up");

    res.json({
      success: true,
      message: "Database connection and operations working",
      orderCount,
      cartCount,
    });
  } catch (error) {
    console.error("Database test error:", error);
    res.status(500).json({
      success: false,
      error: "Database test failed: " + (error as Error).message,
    });
  }
};

// Test Authorize.net SDK functionality
export const testAuthorizeNetSDK = async (req: Request, res: Response) => {
  try {
    console.log("=== TESTING AUTHORIZE.NET SDK ===");

    const loginId = process.env.AUTHORIZE_NET_LOGIN_ID;
    const transactionKey = process.env.AUTHORIZE_NET_TRANSACTION_KEY;

    if (!loginId || !transactionKey) {
      return res.status(500).json({
        success: false,
        error: "Authorize.net credentials not configured",
      });
    }

    // Configure Authorize.net credentials
    const merchantAuthenticationType =
      new APIContracts.MerchantAuthenticationType();
    merchantAuthenticationType.setName(loginId as string);
    merchantAuthenticationType.setTransactionKey(transactionKey as string);

    // Create a simple test transaction
    const creditCard = new APIContracts.CreditCardType();
    creditCard.setCardNumber("4111111111111111");
    creditCard.setExpirationDate("12/25");
    creditCard.setCardCode("123");

    const paymentType = new APIContracts.PaymentType();
    paymentType.setCreditCard(creditCard);

    const transactionRequestType = new APIContracts.TransactionRequestType();
    transactionRequestType.setTransactionType(
      APIContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION
    );
    transactionRequestType.setPayment(paymentType);
    transactionRequestType.setAmount(1.0);

    const createRequest = new APIContracts.CreateTransactionRequest();
    createRequest.setMerchantAuthentication(merchantAuthenticationType);
    createRequest.setTransactionRequest(transactionRequestType);

    const ctrl = new APIControllers.CreateTransactionController(
      createRequest.getJSON()
    );

    console.log("Executing test transaction...");

    return new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        console.log("Test transaction timed out");
        res.status(500).json({
          success: false,
          error: "Test transaction timed out",
        });
        resolve();
      }, 15000); // 15 second timeout

      ctrl.execute(() => {
        console.log("Test transaction callback executed");
        clearTimeout(timeout);

        try {
          const apiResponse = ctrl.getResponse();
          console.log("Raw API response:", apiResponse);

          const response = new APIContracts.CreateTransactionResponse(
            apiResponse
          );

          console.log("Test transaction response:", {
            resultCode: response.getMessages().getResultCode(),
            messages: response.getMessages().getMessage(),
          });

          if (
            response.getMessages().getResultCode() ===
            APIContracts.MessageTypeEnum.OK
          ) {
            const transactionResponse = response.getTransactionResponse();
            res.json({
              success: true,
              message: "Authorize.net SDK working properly",
              transactionId: transactionResponse.getTransId(),
              authCode: transactionResponse.getAuthCode(),
              responseCode: transactionResponse.getResponseCode(),
            });
          } else {
            const errorMessages = response.getMessages().getMessage();
            const errorMessage =
              errorMessages && errorMessages.length > 0
                ? errorMessages[0].getText()
                : "Test transaction failed";

            res.status(400).json({
              success: false,
              error: errorMessage,
            });
          }
        } catch (error) {
          console.error("Error processing test response:", error);
          res.status(500).json({
            success: false,
            error:
              "Error processing test response: " + (error as Error).message,
          });
        }
        resolve();
      });
    });
  } catch (error) {
    console.error("Authorize.net SDK test error:", error);
    res.status(500).json({
      success: false,
      error: "Authorize.net SDK test failed: " + (error as Error).message,
    });
  }
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
