import React, { createContext, useContext, useMemo, useCallback } from 'react';
import { useQuery } from '@apollo/client';
import { CURRENT_USER } from '../graphql/user.gql.js';
import {
  hasCapability,
} from '../utils/capabilities';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const { data, loading } = useQuery(CURRENT_USER, {
    fetchPolicy: 'cache-first',
  });
  const user = data?.me;

  // Memoize hasRole function to prevent recreation on every render
  const hasRole = useCallback((role) => user?.role === role, [user]);

  // Memoize hasPermission function to prevent recreation on every render
  const hasPermission = useCallback(
    (perm) => hasCapability(user, perm),
    [user]
  );

  // Memoize the context value to prevent unnecessary re-renders of consumers
  const value = useMemo(
    () => ({ user, loading, hasRole, hasPermission }),
    [user, loading, hasRole, hasPermission]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
