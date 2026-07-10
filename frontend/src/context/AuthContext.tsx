import React, { createContext, useContext, useState, useEffect } from 'react';
import { setAuthToken, setRefreshToken, registerAuthCallbacks } from '../lib/api';

export interface User {
  username: string;
  role: string;
  prjMgrId: number | null;
  prjMgrName: string | null;
}

interface AuthContextType {
  accessToken: string | null;
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accessToken, setAccessState] = useState<string | null>(null);
  const [refreshToken, setRefreshState] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  const updateAccess = (token: string | null) => {
    setAccessState(token);
    setAuthToken(token);
  };

  const updateRefresh = (token: string | null) => {
    setRefreshState(token);
    setRefreshToken(token);
  };

  const handleLogoutRedirect = () => {
    updateAccess(null);
    updateRefresh(null);
    setUser(null);
    window.location.href = '/login';
  };

  const handleTokenRefreshed = (newToken: string) => {
    setAccessState(newToken);
  };

  // Register silent refresh callbacks inside api.ts
  useEffect(() => {
    registerAuthCallbacks(handleLogoutRedirect, handleTokenRefreshed);
  }, []);

  const login = async (username: string, password: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Invalid credentials');
      }

      const data = await res.json();
      updateAccess(data.accessToken);
      updateRefresh(data.refreshToken);
      setUser(data.user);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      if (refreshToken) {
        await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });
      }
    } catch (err) {
      console.error('Logout request error:', err);
    } finally {
      updateAccess(null);
      updateRefresh(null);
      setUser(null);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ accessToken, user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
