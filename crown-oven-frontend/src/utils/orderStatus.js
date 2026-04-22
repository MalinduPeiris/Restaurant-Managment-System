import COLORS from "../constants/colors";

const DEFAULT_STATUS_MAP = {
  Pending: { label: "Pending", color: COLORS.gray },
  Preparing: { label: "Preparing", color: "#E8732A" },
  Ready: { label: "Ready", color: "#D4A843" },
  Delivered: { label: "Delivered", color: "#2E7D32" },
  Collected: { label: "Collected", color: "#2E7D32" },
  Cancelled: { label: "Cancelled", color: "#C62828" },
};

const DELIVERY_STATUS_MAP = {
  PENDING: { label: "Waiting for delivery", color: "#D4A843" },
  ASSIGNED: { label: "Rider assigned", color: "#E8732A" },
  ON_THE_WAY: { label: "On the Way", color: "#DAA520" },
  DELIVERED: { label: "Delivered", color: "#2E7D32" },
};

export function getCustomerOrderDisplayStatus(order, delivery = null) {
  if (order?.orderType === "delivery") {
    if (delivery?.status && DELIVERY_STATUS_MAP[delivery.status]) {
      return DELIVERY_STATUS_MAP[delivery.status];
    }

    if (order.status === "Ready") {
      return DELIVERY_STATUS_MAP.PENDING;
    }
  }

  return DEFAULT_STATUS_MAP[order?.status] || { label: order?.status || "Unknown", color: COLORS.gray };
}

export { DELIVERY_STATUS_MAP };

