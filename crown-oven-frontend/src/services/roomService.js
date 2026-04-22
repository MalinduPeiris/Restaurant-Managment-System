import API from "../constants/api";

export const listRooms = () => API.get("/rooms");
export const getRoomById = (id) => API.get(`/rooms/${id}`);
export const createRoom = (formData) =>
  API.post("/rooms", formData, { headers: { "Content-Type": "multipart/form-data" } });
export const updateRoom = (id, formData) =>
  API.patch(`/rooms/${id}`, formData, { headers: { "Content-Type": "multipart/form-data" } });
export const deleteRoom = (id) => API.delete(`/rooms/${id}`);

export const listAmenities = () => API.get("/amenities");
export const createAmenity = (data) => API.post("/amenities", data);
export const updateAmenity = (id, data) => API.patch(`/amenities/${id}`, data);

export const createRoomBooking = (data) => API.post("/room-bookings", data);
export const getMyRoomBookings = () => API.get("/room-bookings/my");
export const cancelRoomBooking = (id) => API.patch(`/room-bookings/${id}/cancel`);
export const listAllRoomBookings = (params) => API.get("/room-bookings/admin/all", { params });
export const updateRoomBookingStatus = (id, status) =>
  API.patch(`/room-bookings/admin/${id}/status`, { status });
