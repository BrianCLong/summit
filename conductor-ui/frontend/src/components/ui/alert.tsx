import React from 'react';

interface AlertProps {
  className?: string;
  children: React.ReactNode;
}

export const Alert: React.FC<AlertProps> = ({ className = '', children }) => {
  return (
    <div className={`border-l-4 p-4 mb-4 ${className}`} role="alert">
      {children}
    </div>
  );
};

export const AlertDescription: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div className="text-sm">{children}</div>;
};
