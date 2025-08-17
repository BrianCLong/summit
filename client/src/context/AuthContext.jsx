import React, { createContext, useContext } from "react";
import { useQuery } from "@apollo/client";
import { CURRENT_USER } from "../graphql/user.gql.js";

const ROLE_PERMISSIONS = {
  ADMIN: ["*"],
  ANALYST: [
    "investigation:create",
    "investigation:read",
    "investigation:update",
    "entity:create",
    "entity:read",
    "entity:update",
    "entity:delete",
    "relationship:create",
    "relationship:read",
    "relationship:update",
    "relationship:delete",
    "tag:create",
    "tag:read",
    "tag:delete",
    "graph:read",
    "graph:export",
    "ai:request",
  ],
  VIEWER: [
    "investigation:read",
    "entity:read",
    "relationship:read",
    "tag:read",
    "graph:read",
    "graph:export",
  ],
};

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const { data, loading } = useQuery(CURRENT_USER, {
    fetchPolicy: "cache-first",
  });
  const user = data?.me;
  const permissions = user ? ROLE_PERMISSIONS[user.role] || [] : [];

  const hasRole = (role) => user?.role === role;
  const hasPermission = (perm) =>
    permissions.includes("*") || permissions.includes(perm);

  return (
    <AuthContext.Provider value={{ user, loading, hasRole, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
