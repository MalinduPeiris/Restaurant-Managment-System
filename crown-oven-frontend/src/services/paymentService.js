import API from "../constants/api";

export const createPayment = (data) => API.post("/payments", data);
export const uploadProof = (id, formData) =>
  API.post(`/payments/${id}/upload-proof`, formData, { headers: { "Content-Type": "multipart/form-data" } });
export const getPaymentByOrder = (orderId) => API.get(`/payments/order/${orderId}`);
export const requestRefund = (id) => API.post(`/payments/${id}/refund`);
export const listAllPayments = (params) => API.get("/payments/admin/all", { params });
export const verifyPayment = (id, action) => API.patch(`/payments/admin/${id}/verify`, { action });
export const reviewRefund = (id, action) => API.patch(`/payments/admin/${id}/refund-review`, { action });
