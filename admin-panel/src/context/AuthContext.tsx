"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiRequest } from "@/lib/api";
import { AdminUser } from "@/types";

interface AuthContextType {
  token: string | null;
  user: AdminUser | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  updateUser: (updatedUser: Partial<AdminUser>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("kjs_admin_token");
    const storedUser = localStorage.getItem("kjs_admin_user");

    if (storedToken) {
      setToken(storedToken);
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (_) {}
      }

      // Verify and refresh profile from backend
      apiRequest<AdminUser>("/v1/auth/me")
        .then((profile) => {
          setUser(profile);
          localStorage.setItem("kjs_admin_user", JSON.stringify(profile));
        })
        .catch(() => {
          // If auth fails, trigger logout
          logout();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }

    const handleSessionExpired = () => {
      setToken(null);
      setUser(null);
    };

    window.addEventListener("kjs:session_expired", handleSessionExpired);
    return () => window.removeEventListener("kjs:session_expired", handleSessionExpired);
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await apiRequest<{
      accessToken: string;
      user?: AdminUser;
      actor?: AdminUser;
    }>("/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password: pass }),
    });

    const activeUser = res.user || res.actor;
    if (!activeUser || activeUser.role !== "admin") {
      throw new Error("Access Denied: Administrator role required.");
    }

    setToken(res.accessToken);
    setUser(activeUser);
    localStorage.setItem("kjs_admin_token", res.accessToken);
    localStorage.setItem("kjs_admin_user", JSON.stringify(activeUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("kjs_admin_token");
    localStorage.removeItem("kjs_admin_user");
  };

  const refreshProfile = async () => {
    try {
      const profile = await apiRequest<AdminUser>("/v1/auth/me");
      setUser(profile);
      localStorage.setItem("kjs_admin_user", JSON.stringify(profile));
    } catch (_) {}
  };

  const updateUser = (updated: Partial<AdminUser>) => {
    setUser((prev) => {
      if (!prev) return null;
      const next = { ...prev, ...updated };
      localStorage.setItem("kjs_admin_user", JSON.stringify(next));
      return next;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        loading,
        login,
        logout,
        refreshProfile,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
