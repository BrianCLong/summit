import React, { createContext, useContext } from "react";
import { useQuery } from "@apollo/client";
import { CURRENT_USER } from "../graphql/user.gql.js";
import { hasCapability } from "../utils/capabilities";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const { data, loading } = useQuery(CURRENT_USER, {
    fetchPolicy: "cache-first",
  });
  const user = data?.me;

  const hasRole = (role) => user?.role === role;
  const hasPermission = (perm) => hasCapability(user, perm);

  return (
    <AuthContext.Provider value={{ user, loading, hasRole, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
