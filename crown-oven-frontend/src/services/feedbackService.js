import API from "../constants/api";

// Customer
export const submitFeedback = (data) => API.post("/feedback", data);
export const getMyFeedback = () => API.get("/feedback/my");
export const getFeedbackByOrder = (orderId) => API.get(`/feedback/order/${orderId}`);

// Admin
export const listAllFeedback = () => API.get("/feedback/admin/all");
export const replyToFeedback = (id, reply) => API.patch(`/feedback/admin/${id}/reply`, { reply });
export const adminDeleteFeedback = (id) => API.delete(`/feedback/admin/${id}`);
