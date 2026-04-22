import AsyncStorage from "@react-native-async-storage/async-storage";
import API from "../constants/api";

export const getPublicDishes = (params) => API.get("/dishes", { params });
export const getAdminDishes = () => API.get("/dishes/admin/all");
export const getDishById = (id) => API.get(`/dishes/${id}`);

async function sendDishRequest(url, method, payload) {
  const token = await AsyncStorage.getItem("token");
  const isFormData = typeof FormData !== "undefined" && payload instanceof FormData;

  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API.defaults.baseURL}${url}`, {
    method,
    headers,
    body: isFormData ? payload : JSON.stringify(payload),
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const error = new Error((data && data.message) || `Request failed with status ${response.status}`);
    error.response = { status: response.status, data };
    throw error;
  }

  return { data };
}

export const addDish = (payload) => sendDishRequest("/dishes/admin", "POST", payload);
export const updateDish = (id, payload) => sendDishRequest(`/dishes/admin/${id}`, "PATCH", payload);
export const deleteDish = (id) => API.delete(`/dishes/admin/${id}`);
