import crypto from 'crypto';

const KEY_ID = process.env.RAZORPAY_KEY_ID?.trim() || '';
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET?.trim() || '';
const IS_CONFIGURED = !!(KEY_ID && KEY_SECRET);
const PAYMENT_MODE = (process.env.RAZORPAY_MODE || 'auto').trim().toLowerCase();

export function isRazorpayConfigured() {
  return IS_CONFIGURED;
}

export function getRazorpayKeyId() {
  return KEY_ID || 'rzp_test_demo';
}

/** @returns {'demo' | 'test' | 'live' | 'live-unconfigured'} */
export function getRazorpayMode() {
  if (!IS_CONFIGURED) {
    return PAYMENT_MODE === 'live' ? 'live-unconfigured' : 'demo';
  }
  if (KEY_ID.startsWith('rzp_live_')) {
    return 'live';
  }
  return 'test';
}

export function isLiveModeEnabled() {
  const mode = getRazorpayMode();
  return mode === 'live' || mode === 'live-unconfigured';
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
    if (PAYMENT_MODE === 'live') {
      throw new Error(
        'Razorpay live mode is enabled but API keys are missing. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to services/.env, then restart the server.'
      );
    }

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

export function verifyWebhookSignature(rawBody, signature) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret || !signature) {
    return false;
  }

  const expected = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
  return expected === signature;
}
