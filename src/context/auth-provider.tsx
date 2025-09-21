"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

type User = {
  username: string;
  createdAt: number;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CURRENT_USER_KEY = 'qynx_current_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = () => {
      try {
        const currentUserData = localStorage.getItem(CURRENT_USER_KEY);
        if (currentUserData) {
          const userData = JSON.parse(currentUserData);
          setUser(userData);
        }
      } catch (error) {
        console.error('Error loading user:', error);
        localStorage.removeItem(CURRENT_USER_KEY);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    const expectedUsername = process.env.NEXT_PUBLIC_QYNX_USERNAME;
    const expectedPassword = process.env.NEXT_PUBLIC_QYNX_PASSWORD;

    if (!expectedUsername || !expectedPassword) {
      console.error('QYNX_USERNAME and QYNX_PASSWORD environment variables are not set');
      return false;
    }

    if (username === expectedUsername && password === expectedPassword) {
      const userData: User = {
        username,
        createdAt: Date.now(),
      };
      setUser(userData);
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userData));
      return true;
    }

    return false;
  };

  const register = async (username: string, password: string): Promise<boolean> => {
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(CURRENT_USER_KEY);
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
