export function generateOrderNumber() {
  return `ORD-${Date.now()}`;
}

export function generatePaymentId() {
  return `PAY-${Date.now()}`;
}
