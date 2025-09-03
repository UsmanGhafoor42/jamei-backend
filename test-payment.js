// Test script to check payment configuration
require('dotenv').config();

console.log('=== Payment Configuration Test ===');
console.log('Environment Variables:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('AUTHORIZE_NET_LOGIN_ID:', process.env.AUTHORIZE_NET_LOGIN_ID ? 'SET' : 'MISSING');
console.log('AUTHORIZE_NET_TRANSACTION_KEY:', process.env.AUTHORIZE_NET_TRANSACTION_KEY ? 'SET' : 'MISSING');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'MISSING');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'SET' : 'MISSING');

console.log('\n=== Test Card Validation ===');
const testCard = '4111111111111111';
const cleanCard = testCard.replace(/\D/g, '');
console.log('Original card:', testCard);
console.log('Cleaned card:', cleanCard);
console.log('Card length:', cleanCard.length);
console.log('Valid length (13-19):', cleanCard.length >= 13 && cleanCard.length <= 19);

// Luhn algorithm test
function isValidCardNumber(cardNumber) {
  let sum = 0;
  let isEven = false;
  
  for (let i = cardNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cardNumber.charAt(i));
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
}

console.log('Luhn validation:', isValidCardNumber(cleanCard));

console.log('\n=== Test Data ===');
const testData = {
  cardNumber: '4111111111111111',
  expirationDate: '12/25',
  cvv: '123'
};

console.log('Test payment data:', testData);
console.log('Expiration format valid:', /^\d{2}\/\d{2,4}$/.test(testData.expirationDate));
console.log('CVV format valid:', /^\d{3,4}$/.test(testData.cvv));

console.log('\n=== Configuration Status ===');
const hasCredentials = !!(process.env.AUTHORIZE_NET_LOGIN_ID && process.env.AUTHORIZE_NET_TRANSACTION_KEY);
console.log('Payment ready:', hasCredentials ? 'YES' : 'NO');

if (!hasCredentials) {
  console.log('\n❌ MISSING CREDENTIALS');
  console.log('Add these to your .env file:');
  console.log('AUTHORIZE_NET_LOGIN_ID=5KP3u95bQpv');
  console.log('AUTHORIZE_NET_TRANSACTION_KEY=346HZ32z3fP4hTG2');
} else {
  console.log('\n✅ CREDENTIALS SET');
  console.log('Ready for payment testing!');
}
