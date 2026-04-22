import API from "../constants/api";

export const createOrder = (data) => API.post("/orders", data);
export const getMyOrders = () => API.get("/orders/my");
export const getOrderById = (id) => API.get(`/orders/${id}`);
export const cancelOrder = (id) => API.patch(`/orders/${id}/cancel`);
export const listAllOrders = (params) => API.get("/orders/admin/all", { params });
export const updateOrderStatus = (id, status) => API.patch(`/orders/admin/${id}/status`, { status });
export const deleteOrder = (id) => API.delete(`/orders/admin/${id}`);
