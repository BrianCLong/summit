import React, { createContext, useContext, useMemo, useCallback } from 'react';
import { useQuery } from '@apollo/client';
import { CURRENT_USER } from '../graphql/user.gql.js';

const ROLE_PERMISSIONS = {
  ADMIN: ['*'],
  ANALYST: [
    'investigation:create',
    'investigation:read',
    'investigation:update',
    'entity:create',
    'entity:read',
    'entity:update',
    'entity:delete',
    'relationship:create',
    'relationship:read',
    'relationship:update',
    'relationship:delete',
    'tag:create',
    'tag:read',
    'tag:delete',
    'graph:read',
    'graph:export',
    'ai:request',
  ],
  VIEWER: [
    'investigation:read',
    'entity:read',
    'relationship:read',
    'tag:read',
    'graph:read',
    'graph:export',
  ],
};

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const { data, loading } = useQuery(CURRENT_USER, {
    fetchPolicy: 'cache-first',
  });
  const user = data?.me;

  // Memoize permissions calculation to avoid recomputation on every render
  const permissions = useMemo(
    () => (user ? ROLE_PERMISSIONS[user.role] || [] : []),
    [user]
  );

  // Memoize hasRole function to prevent recreation on every render
  const hasRole = useCallback((role) => user?.role === role, [user]);

  // Memoize hasPermission function to prevent recreation on every render
  const hasPermission = useCallback(
    (perm) => permissions.includes('*') || permissions.includes(perm),
    [permissions]
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
