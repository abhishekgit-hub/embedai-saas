import React, { createContext, useContext, useState, useEffect } from "react";
import { getClientMe } from "../utils/clientApi";

const ClientAuthContext = createContext(null);

export function ClientAuthProvider({ children }) {
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("clientToken");
    if (token) {
      getClientMe()
        .then((res) => setClient(res.data))
        .catch(() => localStorage.removeItem("clientToken"))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = (token, clientData) => {
    localStorage.setItem("clientToken", token);
    setClient(clientData);
  };

  const logout = () => {
    localStorage.removeItem("clientToken");
    setClient(null);
  };

  const refreshClient = async () => {
    const res = await getClientMe();
    setClient(res.data);
    return res.data;
  };

  return (
    <ClientAuthContext.Provider
      value={{ client, login, logout, loading, refreshClient, setClient }}
    >
      {children}
    </ClientAuthContext.Provider>
  );
}

export const useClientAuth = () => useContext(ClientAuthContext);
