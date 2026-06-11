import { apiRequest } from '@/lib/api';

export type PaymentConfig = {
  provider: string;
  keyId: string;
  configured: boolean;
  demoMode?: boolean;
  currency: string;
  methods: string[];
};

export type CreatePaymentOrderPayload = {
  items: { productId: string; quantity: number; price: number }[];
  deliverySlot: string;
  total: number;
  deliveryFee: number;
  platformFee: number;
  promoCode?: string;
  promoDiscount?: number;
  paymentMethod: 'razorpay' | 'wallet' | 'cod';
};

export type RazorpayCheckoutData = {
  orderId: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  keyId: string;
  demo: boolean;
  user: { name: string; email: string; phone?: string };
};

export function getPaymentConfig(token: string) {
  return apiRequest<PaymentConfig>('/payments/config', { token });
}

export type WalletOrderResult = { paymentMethod: 'wallet'; order: unknown };
export type CodOrderResult = { paymentMethod: 'cod'; order: unknown };

export function createPaymentOrder(token: string, payload: CreatePaymentOrderPayload) {
  return apiRequest<RazorpayCheckoutData | WalletOrderResult | CodOrderResult>(
    '/payments/create-order',
    { method: 'POST', token, body: payload }
  );
}

export function verifyPayment(
  token: string,
  payload: {
    orderId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }
) {
  return apiRequest<{ success: boolean; order: unknown }>('/payments/verify', {
    method: 'POST',
    token,
    body: payload,
  });
}

export function buildRazorpayHtml(data: RazorpayCheckoutData) {
  const options = {
    key: data.keyId,
    amount: data.amount,
    currency: data.currency,
    name: 'Milkbasket',
    description: `Order ${data.orderId}`,
    order_id: data.razorpayOrderId,
    prefill: {
      name: data.user.name,
      email: data.user.email,
      contact: data.user.phone ?? '',
    },
    theme: { color: '#1B8B4C' },
  };

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
        <style>
          body { font-family: Arial, sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; background:#f5f7f6; }
          .box { text-align:center; padding:24px; }
          button { background:#1B8B4C; color:#fff; border:none; padding:14px 28px; border-radius:10px; font-size:16px; font-weight:700; }
        </style>
      </head>
      <body>
        <div class="box">
          <h2>Milkbasket Payment</h2>
          <p>Total: ₹${(data.amount / 100).toFixed(2)}</p>
          <button id="pay-btn">Pay Now</button>
        </div>
        <script>
          const options = ${JSON.stringify(options)};
          options.handler = function (response) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              status: 'success',
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            }));
          };
          options.modal = {
            ondismiss: function () {
              window.ReactNativeWebView.postMessage(JSON.stringify({ status: 'cancelled' }));
            }
          };
          document.getElementById('pay-btn').onclick = function () {
            ${data.demo ? `
              window.ReactNativeWebView.postMessage(JSON.stringify({
                status: 'success',
                razorpay_payment_id: 'pay_demo_${Date.now()}',
                razorpay_order_id: '${data.razorpayOrderId}',
                razorpay_signature: 'demo_signature',
              }));
            ` : 'new Razorpay(options).open();'}
          };
        </script>
      </body>
    </html>
  `;
}
