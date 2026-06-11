const METHOD_LABELS: Record<string, string> = {
  cod: 'Cash on Delivery',
  wallet: 'Wallet',
  razorpay: 'Online',
  demo: 'Demo',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  paid: 'Paid',
  failed: 'Failed',
  cod: 'Pay on delivery',
};

export function formatPaymentMethod(method?: string | null): string {
  if (!method) return '—';
  return METHOD_LABELS[method.toLowerCase()] ?? method;
}

export function formatPaymentStatus(
  status?: string | null,
  method?: string | null
): string {
  const normalizedStatus = (status ?? 'pending').toLowerCase();
  const normalizedMethod = (method ?? '').toLowerCase();

  if (normalizedStatus === 'cod') {
    return 'Pay on delivery';
  }

  if (normalizedStatus === 'pending' && normalizedMethod === 'cod') {
    return 'Pay on delivery';
  }

  if (normalizedStatus === 'paid' && normalizedMethod === 'cod') {
    return 'Paid on delivery';
  }

  return STATUS_LABELS[normalizedStatus] ?? status ?? 'Pending';
}
