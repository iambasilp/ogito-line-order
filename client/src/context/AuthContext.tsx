import React, { createContext, useContext, useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import type { User } from '@/types';
import api from '@/lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAdmin: boolean;
  isCeo: boolean;
  isGlobalViewer: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = Cookies.get('token');
      const storedUser = localStorage.getItem('user');
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        const parsedUser = JSON.parse(storedUser);
        
        // Self-heal backwards compatibility for sessions that were saved without 'id' but have '_id'
        if (!parsedUser.id && parsedUser._id) {
          parsedUser.id = parsedUser._id;
        }
        
        setUser(parsedUser);

        // Fetch fresh user data to sync across devices automatically
        try {
          // Temporarily set default header just for this request since we might be mounting before api.ts sets it globally
          const res = await api.get('/auth/me', { headers: { Authorization: `Bearer ${storedToken}` } });
          if (res.data) {
            setUser(res.data);
            localStorage.setItem('user', JSON.stringify(res.data));
          }
        } catch (error) {
          console.error('Failed to sync user session:', error);
          // If token is invalid (401), we should probably log them out, but we'll let api interceptors handle it
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = (newToken: string, newUser: User) => {
    Cookies.set('token', newToken, { expires: 14, sameSite: 'strict' });
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    Cookies.remove('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const isAdmin = user?.role === 'admin';
  const isCeo = user?.role === 'ceo';
  const isGlobalViewer = isAdmin || isCeo || user?.role === 'driver';

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAdmin, isCeo, isGlobalViewer, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
