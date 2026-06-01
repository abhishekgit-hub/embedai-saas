import axios from "axios";

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api",
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("clientToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Public API instance without auth interceptor for signup/verify/forgot-password flows
const PublicAPI = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api",
});

export const clientSignup = (data) => PublicAPI.post("/clients/signup", data);
export const clientLogin = (email, password) =>
  PublicAPI.post("/clients/login", { email, password });
export const verifyEmail = (email, otp) =>
  PublicAPI.post("/clients/verify-email", { email, otp });
export const resendOTP = (email, type) =>
  PublicAPI.post("/clients/resend-otp", { email, type });
export const forgotPassword = (email) =>
  PublicAPI.post("/clients/forgot-password", { email });
export const resetPassword = (email, otp, newPassword) =>
  PublicAPI.post("/clients/reset-password", { email, otp, newPassword });
export const changeEmail = (newEmail, password) =>
  API.put("/clients/change-email", { newEmail, password });
export const verifyChangeEmail = (otp) =>
  API.post("/clients/verify-change-email", { otp });
export const getClientMe = () => API.get("/clients/me");
export const updateClientProfile = (data) => API.put("/clients/profile", data);
export const changeClientPassword = (currentPassword, newPassword) =>
  API.put("/clients/change-password", { currentPassword, newPassword });
export const deleteClientAccount = () => API.delete("/clients/account");
export const getClientStats = () => API.get("/clients/stats");

export const uploadClientDocument = (formData) =>
  API.post("/clients/docs/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const addClientTextDocument = (title, content) =>
  API.post("/clients/docs/text", { title, content });
export const getClientDocuments = () => API.get("/clients/docs");
export const deleteClientDocument = (id) => API.delete(`/clients/docs/${id}`);
export const toggleClientDocument = (id) => API.patch(`/clients/docs/${id}/toggle`);

const WIDGET_API = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

export const getWidgetConfig = (apiKey) =>
  axios.get(`${WIDGET_API}/widget/${apiKey}/config`);

export const getWidgetConfigByClientId = (clientId) =>
  axios.get(`${WIDGET_API}/widget/client/${clientId}/config`);

export const sendWidgetMessage = (apiKey, sessionId, message) =>
  axios.post(`${WIDGET_API}/widget/${apiKey}/chat`, { sessionId, message });

export default API;
