import API from "../constants/api";

// Admin
export const listAllDeliveries = (params) => API.get("/deliveries/admin/all", { params });
export const assignRider = (id, riderId) => API.patch(`/deliveries/admin/${id}/assign`, { riderId });

// Rider
export const getMyDeliveries = () => API.get("/deliveries/rider/my");
export const updateDeliveryStatus = (id, status) => API.patch(`/deliveries/rider/${id}/status`, { status });

// Customer
export const getDeliveryByOrder = (orderId) => API.get(`/deliveries/order/${orderId}`);

// Rider management (admin)
export const createRider = (data) => API.post("/auth/admin/create-rider", data);
export const listRiders = () => API.get("/auth/admin/riders");
