import crypto from 'crypto';

const KEY_ID = process.env.RAZORPAY_KEY_ID;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const IS_CONFIGURED = !!(KEY_ID && KEY_SECRET);

export function isRazorpayConfigured() {
  return IS_CONFIGURED;
}

export function getRazorpayKeyId() {
  return KEY_ID ?? 'rzp_test_demo';
}

async function razorpayRequest(path, method, body) {
  const auth = Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64');
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.description ?? 'Razorpay API error');
  }
  return data;
}

export async function createRazorpayOrder({ amount, receipt, notes }) {
  if (!IS_CONFIGURED) {
    return {
      id: `order_demo_${Date.now()}`,
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt,
      status: 'created',
      demo: true,
    };
  }

  return razorpayRequest('/orders', 'POST', {
    amount: Math.round(amount * 100),
    currency: 'INR',
    receipt,
    notes,
  });
}

export function verifyPaymentSignature({ orderId, paymentId, signature }) {
  if (!IS_CONFIGURED) {
    return signature === 'demo_signature';
  }

  const payload = `${orderId}|${paymentId}`;
  const expected = crypto
    .createHmac('sha256', KEY_SECRET)
    .update(payload)
    .digest('hex');

  return expected === signature;
}
