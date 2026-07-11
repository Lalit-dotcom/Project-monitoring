import React, { createContext, useContext, useState, useEffect } from 'react';
import { setAuthToken, registerAuthCallbacks } from '../lib/api';

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
  login: (username: string, password: string) => Promise<any>;
  verifyMfa: (mfaToken: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  setSession: (accessToken: string, user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accessToken, setAccessState] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const updateAccess = (token: string | null) => {
    setAccessState(token);
    setAuthToken(token);
  };

  const handleLogoutRedirect = () => {
    updateAccess(null);
    setUser(null);
    window.location.href = '/login';
  };

  const handleTokenRefreshed = (newToken: string) => {
    setAccessState(newToken);
  };

  // Register silent refresh callbacks inside api.ts
  useEffect(() => {
    registerAuthCallbacks(handleLogoutRedirect, handleTokenRefreshed);

    // Silent refresh check on bootstrap
    const checkSession = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        });
        
        if (res.ok) {
          const data = await res.json();
          updateAccess(data.accessToken);
          
          // Parse JWT payload to get user info
          try {
            const payload = JSON.parse(atob(data.accessToken.split('.')[1]));
            setUser({
              username: payload.username,
              role: payload.role,
              prjMgrId: payload.prjMgrId,
              prjMgrName: null // Or fetch it if really needed, but usually null for superadmin anyway
            });
          } catch (e) {
            console.error('Failed to parse JWT payload', e);
          }
        }
      } catch (err) {
        console.error('Silent refresh failed:', err);
      } finally {
        setLoading(false);
      }
    };
    
    checkSession();
  }, []);

  const login = async (username: string, password: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include'
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Invalid credentials');
      }

      const data = await res.json();
      if (data.mfaRequired) {
        return data;
      }

      updateAccess(data.accessToken);
      setUser(data.user);
      return data;
    } finally {
      setLoading(false);
    }
  };

  const verifyMfa = async (mfaToken: string, code: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/auth/2fa/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mfaToken, code }),
        credentials: 'include'
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Invalid MFA verification code');
      }

      const data = await res.json();
      updateAccess(data.accessToken);
      setUser(data.user);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
    } catch (err) {
      console.error('Logout request error:', err);
    } finally {
      updateAccess(null);
      setUser(null);
      setLoading(false);
      window.location.href = '/login';
    }
  };

  const setSession = (token: string, userData: User) => {
    updateAccess(token);
    setUser(userData);
  };

  return (
    <AuthContext.Provider value={{ accessToken, user, loading, login, verifyMfa, logout, setSession }}>
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
