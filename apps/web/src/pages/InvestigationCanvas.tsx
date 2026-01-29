import React from 'react';
import { SummitAppHost } from '@/components/SummitAppHost';

const InvestigationCanvas: React.FC = () => {
  const handleToolCall = async (toolName: string, args: any) => {
    // Simulate backend tool execution
    console.log(`[Page] Executing tool ${toolName}`, args);
    await new Promise(resolve => setTimeout(resolve, 500)); // Latency simulation

    if (toolName === 'graph.expand') {
      return { nodes: 5, edges: 10, message: 'Graph expanded' };
    }
    if (toolName === 'approval.request') {
      return { id: 'req-123', status: 'pending' };
    }
    return { status: 'unknown_tool' };
  };

  return (
    <div className="p-6 h-full flex flex-col bg-slate-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Investigation Canvas</h1>
        <p className="text-slate-600">MCP App Reference Implementation</p>
      </div>

      <div className="flex-1">
        <SummitAppHost
          appUri="ui://investigation-canvas/main"
          className="h-full border shadow-sm min-h-[600px]"
          onToolCall={handleToolCall}
        />
      </div>
    </div>
  );
};

export default InvestigationCanvas;
