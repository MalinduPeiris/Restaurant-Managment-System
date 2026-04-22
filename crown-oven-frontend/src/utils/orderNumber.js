export function formatOrderNumber(orderNumber) {
  if (!orderNumber) return "N/A";

  const digits = String(orderNumber).replace(/\D/g, "");
  const shortDigits = digits.slice(-4).padStart(4, "0");

  return `ORD-${shortDigits}`;
}
