import API from "../constants/api";

export const listTables = () => API.get("/tables");
export const getAvailableTables = (date, timeSlot, minSeats) => {
  const params = { date, timeSlot };
  if (minSeats) params.minSeats = minSeats;
  return API.get("/tables/available", { params });
};
export const getTableDashboard = (date) => {
  const params = {};
  if (date) params.date = date;
  return API.get("/tables/dashboard", { params });
};
export const addTable = (data) => API.post("/tables/admin", data);
export const updateTable = (id, data) => API.patch(`/tables/admin/${id}`, data);
export const deleteTable = (id) => API.delete(`/tables/admin/${id}`);
