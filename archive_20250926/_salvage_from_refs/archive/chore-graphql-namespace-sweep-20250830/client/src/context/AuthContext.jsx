import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(true); // Mock auth for now
  const [user, setUser] = useState({ roles: ['USER', 'ADMIN'], permissions: [] });

  const hasRole = (role) => user.roles.includes(role);
  const hasPermission = (permission) => user.permissions.includes(permission);

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      user,
      hasRole,
      hasPermission,
      login: () => setIsAuthenticated(true),
      logout: () => setIsAuthenticated(false)
    }}>
      {children}
    </AuthContext.Provider>
  );
};
