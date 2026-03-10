import React, { useEffect } from 'react';
import { CognitiveCommandLayout } from './CognitiveCommandLayout';
import { GlobalMissionRail } from './GlobalMissionRail';
import { StrategicStatusBar } from './StrategicStatusBar';
import { useCommandContext } from './CommandContextProvider';

export function CognitiveCommandShell() {
  const { toggleCommandPalette } = useCommandContext();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleCommandPalette();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleCommandPalette]);

  return (
    <div className="flex h-screen w-full flex-col bg-zinc-950 text-zinc-100">
      <StrategicStatusBar />
      <div className="flex flex-1 overflow-hidden">
        <GlobalMissionRail />
        <CognitiveCommandLayout />
      </div>
    </div>
  );
}
