import React from 'react';

export interface WorkspaceShellProps {
  children: React.ReactNode;
}

/**
 * WorkspaceShell wraps the main content area with proper scroll handling,
 * workspace panel support, and investigation tab management.
 */
export const WorkspaceShell: React.FC<WorkspaceShellProps> = ({ children }) => {
  return (
    <main className="flex-1 overflow-y-auto bg-bg-primary">
      <div className="h-full">
        {children}
      </div>
    </main>
  );
};
