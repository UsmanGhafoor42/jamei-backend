# Authorize.net Setup Guide

## 🚨 Current Issue: Authentication Failed

The error "User authentication failed due to invalid authentication values" means your Authorize.net credentials are not properly configured.

## 🔧 Step-by-Step Setup

### **1. Get Authorize.net Sandbox Credentials**

#### **Option A: Use Authorize.net Sandbox (Recommended for Testing)**

1. Go to [Authorize.net Sandbox](https://sandbox.authorize.net/)
2. Click "Get Started" or "Sign Up"
3. Create a free sandbox account
4. After login, go to **Account → Settings → API Credentials & Keys**
5. Copy your **Login ID** and **Transaction Key**

#### **Option B: Use Test Credentials (Quick Testing)**

For immediate testing, you can use these test credentials:

```bash
AUTHORIZE_NET_LOGIN_ID=5KP3u95bQpv
AUTHORIZE_NET_TRANSACTION_KEY=346HZ32z3fP4hTG2
```

**⚠️ Note**: These are public test credentials and should only be used for development/testing.

### **2. Configure Your Environment Variables**

#### **Create/Update your `.env` file:**

```bash
# Backend Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
MONGODB_URI=your_mongodb_connection_string

# JWT Configuration
JWT_SECRET=your_jwt_secret_key

# Image URL Configuration
BACKEND_BASE_URL=http://localhost:5000

# Authorize.net Configuration
AUTHORIZE_NET_LOGIN_ID=your_login_id_here
AUTHORIZE_NET_TRANSACTION_KEY=your_transaction_key_here
```

#### **For Testing (Use these credentials):**

```bash
AUTHORIZE_NET_LOGIN_ID=5KP3u95bQpv
AUTHORIZE_NET_TRANSACTION_KEY=346HZ32z3fP4hTG2
```

### **3. Restart Your Server**

After updating the `.env` file, restart your server:

```bash
npm run dev
```

### **4. Test with Valid Card Numbers**

Use these test card numbers with your sandbox account:

```javascript
// Test Cards for Sandbox
const testCards = {
  visa: "4111111111111111",
  mastercard: "5555555555554444",
  amex: "378282246310005",
  discover: "6011111111111117",
};

// Test Card Details
const testCardData = {
  cardNumber: "4111111111111111",
  expirationDate: "12/25", // Any future date
  cvv: "123",
};
```

### **5. Verify Configuration**

Add this to your payment controller to verify credentials are loaded:

```javascript
// Add this logging to see if credentials are loaded
console.log("Authorize.net Config Check:", {
  loginId: process.env.AUTHORIZE_NET_LOGIN_ID ? "SET" : "MISSING",
  transactionKey: process.env.AUTHORIZE_NET_TRANSACTION_KEY ? "SET" : "MISSING",
  env: process.env.NODE_ENV,
});
```

## 🧪 Testing Steps

### **1. Test Environment Variables**

```bash
# Check if .env is loaded
node -e "console.log('AUTHORIZE_NET_LOGIN_ID:', process.env.AUTHORIZE_NET_LOGIN_ID ? 'SET' : 'MISSING')"
```

### **2. Test Payment Flow**

1. Use test card: `4111111111111111`
2. Expiration: `12/25` (any future date)
3. CVV: `123`
4. Submit payment
5. Check server console for logs

### **3. Expected Success Response**

```json
{
  "message": "Payment processed successfully",
  "order": {
    "id": "...",
    "orderNumber": "ORD...",
    "total": 86.5,
    "status": "order_placed"
  },
  "transactionId": "..."
}
```

## 🚨 Common Issues & Solutions

### **Issue 1: "User authentication failed"**

**Solution**: Check your `.env` file has correct credentials

### **Issue 2: "Invalid card number"**

**Solution**: Use the exact test card numbers above

### **Issue 3: "Environment variables not loading"**

**Solution**:

1. Make sure `.env` file is in the root directory
2. Restart the server after changes
3. Check file permissions

### **Issue 4: "Sandbox account not working"**

**Solution**:

1. Verify you're using sandbox credentials (not production)
2. Make sure account is activated
3. Check if you need to verify your email

## 📱 Frontend Test Code

```javascript
// Test payment data
const testPaymentData = {
  paymentData: {
    cardNumber: "4111111111111111",
    expirationDate: "12/25",
    cvv: "123",
    cardholderName: "Test User",
  },
  customerInfo: {
    firstName: "Test",
    lastName: "User",
    email: "test@example.com",
    phone: "1234567890",
    address: {
      street: "123 Test St",
      city: "Test City",
      state: "TS",
      zipCode: "12345",
      country: "US",
    },
  },
  shippingInfo: {
    method: "Standard Shipping",
    address: {
      street: "123 Test St",
      city: "Test City",
      state: "TS",
      zipCode: "12345",
      country: "US",
    },
  },
  cartItems: [
    /* your cart items */
  ],
  pricing: {
    subtotal: 86.5,
    tax: 0,
    shipping: 0,
    discount: 0,
    total: 86.5,
  },
};

// Test the payment
const response = await axios.post("/api/payment/process", testPaymentData);
console.log("Payment response:", response.data);
```

## 🔄 Production Setup

When ready for production:

1. **Get Live Credentials**: Sign up for Authorize.net merchant account
2. **Update Environment**: Replace sandbox credentials with live ones
3. **Test Thoroughly**: Use real cards in test mode first
4. **Security**: Ensure credentials are never exposed in client-side code

## 📞 Support

- **Authorize.net Developer Center**: https://developer.authorize.net/
- **Sandbox Testing Guide**: https://developer.authorize.net/hello_world/testing_guide/
- **API Documentation**: https://developer.authorize.net/api/reference/

---

**Follow these steps and your payment integration should work! 🎉**
