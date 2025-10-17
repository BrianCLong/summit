import React from 'react';

export const useToast = () => ({
  addToast: jest.fn(),
  removeToast: jest.fn(),
  clearAllToasts: jest.fn(),
});

export const useToastHelpers = () => ({
  success: () => 'mock-toast',
  error: () => 'mock-toast',
  warning: () => 'mock-toast',
  info: () => 'mock-toast',
});

export const ToastProvider: React.FC<{ children: React.ReactNode }>= ({ children }) => <>{children}</>;
