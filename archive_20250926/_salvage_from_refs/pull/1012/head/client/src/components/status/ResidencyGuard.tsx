import React from 'react';

type Props = {
  region: string;
  allowed: string[];
  children: React.ReactNode;
};

export const ResidencyGuard: React.FC<Props> = ({ region, allowed, children }) => {
  if (!allowed.includes(region)) {
    return <div className="residency-warning">Region not allowed</div>;
  }
  return <>{children}</>;
};
