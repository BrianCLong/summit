import React from 'react';

interface Props {
  role: string;
  allow: string[];
  children: React.ReactNode;
}

/**
 * TenantGuard renders children only if user role is allowed.
 * This is a client-side convenience and must not replace server checks.
 */
export const TenantGuard: React.FC<Props> = ({ role, allow, children }) => {
  if (!allow.includes(role)) {
    return null;
  }
  return <>{children}</>;
};
