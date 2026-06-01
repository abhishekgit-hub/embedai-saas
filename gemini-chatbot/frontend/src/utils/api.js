import axios from "axios";

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api",
});

// Attach admin JWT if present
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("adminToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Public API instance without auth interceptor for auth flows
const PublicAPI = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api",
});

// Chat APIs
export const sendMessage = (sessionId, message) =>
  API.post("/chat/message", { sessionId, message });

export const getSessions = () => API.get("/chat/sessions");
export const getSession = (id) => API.get(`/chat/sessions/${id}`);
export const deleteSession = (id) => API.delete(`/chat/sessions/${id}`);

// Widget Chats APIs (admin only)
export const getWidgetSessions = () => API.get("/chat/widget-sessions");
export const deleteWidgetSessions = (sessionIds) =>
  API.delete("/chat/widget-sessions", { data: { sessionIds } });
export const deleteAllWidgetSessions = () =>
  API.delete("/chat/widget-sessions/all");

// Admin/Landing Page Chats APIs (admin only)
export const getAdminSessions = () => API.get("/chat/admin-sessions");
export const deleteAdminSessions = (sessionIds) =>
  API.delete("/chat/admin-sessions", { data: { sessionIds } });
export const deleteAllAdminSessions = () =>
  API.delete("/chat/admin-sessions/all");

// Auth APIs
export const adminLogin = (email, password) =>
  PublicAPI.post("/auth/login", { email, password });

export const verifyToken = () => API.get("/auth/me");
export const changePassword = (currentPassword, newPassword) =>
  API.put("/auth/change-password", { currentPassword, newPassword });
export const adminForgotPassword = (email) =>
  PublicAPI.post("/auth/forgot-password", { email });
export const adminResetPassword = (email, otp, newPassword) =>
  PublicAPI.post("/auth/reset-password", { email, otp, newPassword });
export const adminChangeEmail = (newEmail, password) =>
  API.put("/auth/change-email", { newEmail, password });
export const adminVerifyChangeEmail = (otp) =>
  API.post("/auth/verify-change-email", { otp });

// Document APIs
export const uploadDocument = (formData) =>
  API.post("/docs/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const addTextDocument = (title, content) =>
  API.post("/docs/text", { title, content });

export const getDocuments = () => API.get("/docs");
export const deleteDocument = (id) => API.delete(`/docs/${id}`);
export const toggleDocument = (id) => API.patch(`/docs/${id}/toggle`);

// Settings APIs
export const getSettings = () => API.get("/settings");
export const getPublicSettings = () => API.get("/settings/public");
export const saveSettings = (data) => API.put("/settings", data);

// Admin stats
export const getStats = () => API.get("/admin/stats");

// Admin clients
export const getClients = () => API.get("/admin/clients");
export const getPendingClients = () => API.get("/admin/clients/pending");
export const approveClient = (id) => API.patch(`/admin/clients/${id}/approve`);
export const rejectClient = (id) => API.patch(`/admin/clients/${id}/reject`);
export const toggleClient = (id) => API.patch(`/admin/clients/${id}/toggle`);
export const deleteClient = (id) => API.delete(`/admin/clients/${id}`);
export const getClientDocs = (id) => API.get(`/admin/clients/${id}/docs`);

export default API;
