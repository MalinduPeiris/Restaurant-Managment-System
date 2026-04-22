import API from "../constants/api";

export const registerUser = (data) => API.post("/auth/register", data);
export const loginUser = (data) => API.post("/auth/login", data);
export const getProfile = () => API.get("/auth/profile");
export const updateProfile = (data) => API.patch("/auth/profile", data);
export const changePassword = (data) => API.post("/auth/change-password", data);
export const uploadAvatar = (formData) =>
  API.post("/auth/upload-avatar", formData, { headers: { "Content-Type": "multipart/form-data" } });
export const listUsers = () => API.get("/auth/admin/users");
export const updateUser = (id, data) => API.patch(`/auth/admin/users/${id}`, data);
export const deleteUser = (id) => API.delete(`/auth/admin/users/${id}`);
