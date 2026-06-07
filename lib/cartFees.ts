/** Free delivery when cart subtotal reaches this amount */
export const FREE_DELIVERY_MIN_ORDER = 299;

/** Delivery fee when cart is below the minimum */
export const DELIVERY_CHARGE = 30;

export function calculateDeliveryFee(subtotal: number) {
  return subtotal >= FREE_DELIVERY_MIN_ORDER ? 0 : DELIVERY_CHARGE;
}

export function calculateOrderTotal(subtotal: number) {
  const deliveryFee = calculateDeliveryFee(subtotal);
  return {
    deliveryFee,
    total: subtotal + deliveryFee,
    minOrderValue: FREE_DELIVERY_MIN_ORDER,
  };
}

export function amountForFreeDelivery(subtotal: number) {
  const remaining = FREE_DELIVERY_MIN_ORDER - subtotal;
  return remaining > 0 ? Math.ceil(remaining) : 0;
}

export function freeDeliveryMessage(subtotal: number) {
  const gap = amountForFreeDelivery(subtotal);
  if (gap <= 0) return null;
  return `Please add ₹${gap} more to get free delivery (no ₹${DELIVERY_CHARGE} delivery fee)`;
}
