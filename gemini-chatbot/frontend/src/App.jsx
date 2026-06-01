import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ClientAuthProvider, useClientAuth } from "./context/ClientAuthContext";
import ChatPage from "./pages/ChatPage";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminForgotPassword from "./pages/AdminForgotPassword";
import ClientSignup from "./pages/ClientSignup";
import ClientLogin from "./pages/ClientLogin";
import ClientDashboard from "./pages/ClientDashboard";
import ClientForgotPassword from "./pages/ClientForgotPassword";
import WidgetChat from "./pages/WidgetChat";

function ProtectedAdmin({ children }) {
  const { admin, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }
  return admin ? children : <Navigate to="/admin/login" replace />;
}

function ProtectedClient({ children }) {
  const { client, loading } = useClientAuth();
  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }
  return client ? children : <Navigate to="/client/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <ClientAuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<ChatPage />} />
            <Route path="/chat/:clientId" element={<WidgetChat />} />

            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/forgot-password" element={<AdminForgotPassword />} />
            <Route
              path="/admin/*"
              element={
                <ProtectedAdmin>
                  <AdminDashboard />
                </ProtectedAdmin>
              }
            />

            <Route path="/client/signup" element={<ClientSignup />} />
            <Route path="/client/login" element={<ClientLogin />} />
            <Route path="/client/forgot-password" element={<ClientForgotPassword />} />
            <Route
              path="/client/dashboard"
              element={
                <ProtectedClient>
                  <ClientDashboard />
                </ProtectedClient>
              }
            />

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </BrowserRouter>
      </ClientAuthProvider>
    </AuthProvider>
  );
}
