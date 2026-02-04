/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import ForceGraph2D, { ForceGraphMethods } from 'react-force-graph-2d';
import { useWorkspaceStore } from '../store/workspaceStore';

interface GraphWrapperProps {
  children: (width: number, height: number) => React.ReactNode;
}

// Simple wrapper to handle resize if hook doesn't exist
const GraphWrapper = ({ children }: GraphWrapperProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = React.useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full">
      {dimensions.width > 0 && dimensions.height > 0 && children(dimensions.width, dimensions.height)}
    </div>
  );
};

export const GraphPane = () => {
  const { entities, links, selectedEntityIds, selectEntity, isSyncing, syncError, retrySync } = useWorkspaceStore();
  const graphRef = useRef<ForceGraphMethods | undefined>(undefined);

  // Syncing indicator logic (only show if lag > 250ms)
  const [showSyncing, setShowSyncing] = useState(false);

  useEffect(() => {
      let timer: NodeJS.Timeout;
      if (isSyncing) {
          timer = setTimeout(() => setShowSyncing(true), 250);
      } else {
          setShowSyncing(false);
      }
      return () => clearTimeout(timer);
  }, [isSyncing]);


  // Prepare graph data
  // Memoize graphData to ensure reference stability. This prevents ForceGraph2D
  // from restarting the simulation (and resetting node positions) on every render.
  const graphData = useMemo(() => ({
    nodes: entities.map(e => ({ ...e })),
    links: links.map(l => ({ ...l }))
  }), [entities, links]);

  // Handle node click
  const handleNodeClick = useCallback((node: any) => {
    selectEntity(node.id);
  }, [selectEntity]);

  // Effect to highlight/zoom on selection
  useEffect(() => {
    if (selectedEntityIds.length === 1 && graphRef.current) {
        // Optional: center on selected node
        // graphRef.current.centerAt(node.x, node.y, 1000);
        // graphRef.current.zoom(8, 2000);
    }
  }, [selectedEntityIds]);

  return (
    <div className="w-full h-full relative bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex flex-col">
        <div className="absolute top-2 left-2 z-10 bg-slate-900/80 backdrop-blur px-3 py-1 rounded text-xs font-mono text-purple-400 border border-purple-900/50">
            NETWORK ANALYSIS
        </div>

        {/* Syncing Indicator */}
        {showSyncing && (
            <div className="absolute top-2 right-2 z-20 bg-yellow-500/80 text-black px-2 py-1 rounded text-xs font-bold animate-pulse">
                Syncing...
            </div>
        )}

        {/* Error Banner */}
        {syncError && (
             <div className="absolute top-10 left-1/2 transform -translate-x-1/2 z-30 bg-red-900/90 border border-red-500 text-white px-4 py-3 rounded shadow-lg flex flex-col items-center gap-2">
                 <div className="font-bold text-sm">Couldn’t refresh results</div>
                 <div className="text-xs">Your selected time range is unchanged.</div>
                 <button
                    onClick={retrySync}
                    className="bg-red-700 hover:bg-red-600 px-3 py-1 rounded text-xs font-semibold transition-colors"
                 >
                     Retry
                 </button>
             </div>
        )}

      <GraphWrapper>
        {(width, height) => (
          <ForceGraph2D
            ref={graphRef}
            width={width}
            height={height}
            graphData={graphData}
            nodeLabel="label"
            nodeColor={(node: any) => selectedEntityIds.includes(node.id) ? '#22d3ee' : '#a855f7'}
            nodeRelSize={6}
            linkColor={() => '#475569'}
            backgroundColor="#0f172a"
            onNodeClick={handleNodeClick}
            cooldownTicks={100}
            linkDirectionalArrowLength={3.5}
            linkDirectionalArrowRelPos={1}
          />
        )}
      </GraphWrapper>
    </div>
  );
};
