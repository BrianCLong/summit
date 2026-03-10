import React, { type ReactNode } from 'react';

interface CognitiveWorkspaceProps {
  children: ReactNode;
}

export function CognitiveWorkspace({ children }: CognitiveWorkspaceProps) {
  return (
    <main className="flex-1 overflow-hidden" role="main" aria-label="Cognitive workspace">
      {children}
    </main>
  );
}
