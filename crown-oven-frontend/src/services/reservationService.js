import API from "../constants/api";

export const createReservation = (data) => API.post("/reservations", data);
export const getMyReservations = () => API.get("/reservations/my");
export const cancelReservation = (id) => API.patch(`/reservations/${id}/cancel`);
export const getAvailableTablesForReservation = (date, timeSlot, minSeats) => {
  const params = { date, timeSlot };
  if (minSeats) params.minSeats = minSeats;
  return API.get("/reservations/available", { params });
};
export const listAllReservations = (params) => API.get("/reservations/admin/all", { params });
export const updateReservationStatus = (id, status) =>
  API.patch(`/reservations/admin/${id}/status`, { status });
