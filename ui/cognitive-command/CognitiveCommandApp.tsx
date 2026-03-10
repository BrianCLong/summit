import React, { Suspense } from 'react';
import { CognitiveCommandShell } from './CognitiveCommandShell';
import { CommandContextProvider } from './CommandContextProvider';

export function CognitiveCommandApp() {
  return (
    <CommandContextProvider>
      <Suspense fallback={<CognitiveCommandLoader />}>
        <CognitiveCommandShell />
      </Suspense>
    </CommandContextProvider>
  );
}

function CognitiveCommandLoader() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-zinc-950">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
        <span className="text-sm text-zinc-400">Initializing Cognitive Command Center...</span>
      </div>
    </div>
  );
}
