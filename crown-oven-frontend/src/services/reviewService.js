import API from "../constants/api";

export const createReview = (data) => API.post("/reviews", data);
export const getDishReviews = (dishId) => API.get(`/reviews/dish/${dishId}`);
export const getMyReviews = () => API.get("/reviews/my");
export const updateReview = (id, data) => API.patch(`/reviews/${id}`, data);
export const deleteReview = (id) => API.delete(`/reviews/${id}`);
export const listAllReviews = () => API.get("/reviews/admin/all");
export const adminDeleteReview = (id) => API.delete(`/reviews/admin/${id}`);
export const adminReplyReview = (id, reply) => API.patch(`/reviews/admin/${id}/reply`, { reply });
