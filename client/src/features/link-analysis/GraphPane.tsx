import React, { useEffect } from "react";
import ReactFlow, { Background, Controls, MiniMap } from "reactflow";
import "reactflow/dist/style.css";
import { useAnalysisStore } from "./store";

export const GraphPane: React.FC = () => {
  const { timeRange, streaming, startStream, stopStream, nodes, edges, error } = useAnalysisStore();

  useEffect(() => {
    startStream();
    return () => stopStream();
  }, [startStream, stopStream]);

  return (
    <div data-testid="graph-pane" style={{ height: "100%", position: "relative" }}>
      <div className="flex items-center justify-between px-4 py-2 text-sm bg-slate-900 text-slate-100">
        <div className="flex items-center gap-3">
          <span className="font-semibold">Streaming graph</span>
          <span className="text-slate-400">
            Window: {timeRange.start} - {timeRange.end}
          </span>
          {streaming && <span className="animate-pulse text-cyan-300">results streaming…</span>}
          {error && <span className="text-amber-300">{error}</span>}
        </div>
        <div className="flex gap-2">
          <button
            className="rounded bg-cyan-600 px-3 py-1 text-white"
            onClick={() => startStream()}
          >
            Restart stream
          </button>
          <button
            className="rounded border border-slate-500 px-3 py-1 text-slate-100"
            onClick={() => stopStream()}
          >
            Stop
          </button>
        </div>
      </div>

      <ReactFlow nodes={nodes} edges={edges} fitView>
        <MiniMap />
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
};

export default GraphPane;
