// src/context/AuthContext.tsx
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  username: string;
  // Add other user fields if needed, e.g., email
}

interface AuthContextType {
  currentUser: User | null;
  login: (username: string, /* password (not truly secure here) */) => boolean; // Return true on success
  logout: () => void;
  register: (username: string, /* password */) => boolean; // Return true on success
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper functions for localStorage
const LOCAL_STORAGE_USERS_KEY = 'ecoDashUsers';
const LOCAL_STORAGE_CURRENT_USER_KEY = 'ecoDashCurrentUser';

const getUsersFromStorage = (): Record<string, User> => {
  if (typeof window === 'undefined') return {};
  const users = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
  return users ? JSON.parse(users) : {};
};

const saveUsersToStorage = (users: Record<string, User>) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(users));
};

const getCurrentUserFromStorage = (): User | null => {
  if (typeof window === 'undefined') return null;
  const user = localStorage.getItem(LOCAL_STORAGE_CURRENT_USER_KEY);
  return user ? JSON.parse(user) : null;
};

const saveCurrentUserToStorage = (user: User | null) => {
  if (typeof window === 'undefined') return;
  if (user) {
    localStorage.setItem(LOCAL_STORAGE_CURRENT_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(LOCAL_STORAGE_CURRENT_USER_KEY);
  }
};


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // To handle initial load from localStorage

  useEffect(() => {
    // Load current user from localStorage on initial mount
    const user = getCurrentUserFromStorage();
    if (user) {
      setCurrentUser(user);
    }
    setIsLoading(false);
  }, []);

  const login = (username: string): boolean => {
    const users = getUsersFromStorage();
    // For this simple localStorage version, we're not really checking passwords.
    // In a real app, you'd hash and compare passwords (on the server).
    if (users[username]) {
      const userToLogin = users[username];
      setCurrentUser(userToLogin);
      saveCurrentUserToStorage(userToLogin);
      return true;
    }
    alert("Login failed: User not found or incorrect credentials."); // Basic feedback
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    saveCurrentUserToStorage(null);
    // Optionally redirect to home or login page
    // router.push('/'); // If using Next router
  };

  const register = (username: string): boolean => {
    if (!username.trim()) {
        alert("Username cannot be empty.");
        return false;
    }
    const users = getUsersFromStorage();
    if (users[username]) {
      alert("Registration failed: Username already exists.");
      return false;
    }
    const newUser: User = { username };
    users[username] = newUser;
    saveUsersToStorage(users);
    // Optionally auto-login after registration
    // login(username);
    alert("Registration successful! Please log in.");
    return true;
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, register, isLoading }}>
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