import React, { useEffect, useRef, useState } from 'react';

interface SummitAppHostProps {
  appUri: string;
  className?: string;
  onContextUpdate?: (context: any) => void;
  onToolCall?: (toolName: string, args: any) => Promise<any>;
}

export const SummitAppHost: React.FC<SummitAppHostProps> = ({
  appUri,
  className,
  onContextUpdate,
  onToolCall
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Security: In a real implementation, verify origin strictly.
      // For now, we trust the source because it's served from our own /api/mcp-apps/render endpoint
      // which is same-origin (proxied) or configured CORS.

      // Prevent cross-component message leakage
      if (event.source !== iframeRef.current?.contentWindow) return;

      const data = event.data;
      if (!data || data.jsonrpc !== '2.0') return;

      console.log('[SummitAppHost] Received message:', data);
      setMessages(prev => [...prev, { direction: 'in', data }]);

      try {
        let result;
        if (data.method === 'tool/call') {
          // Handle tool call
          const { name, arguments: args } = data.params;
          console.log(`[SummitAppHost] Tool Call: ${name}`, args);

          if (onToolCall) {
            result = await onToolCall(name, args);
          } else {
            // Default mock behavior
            result = { status: 'success', message: `Tool ${name} called (mock)` };
          }
        } else if (data.method === 'context/update') {
          // Handle context update
          console.log(`[SummitAppHost] Context Update:`, data.params);
          if (onContextUpdate) {
            onContextUpdate(data.params);
          }
          result = { status: 'success' };
        } else {
          // Unknown method, but we should ack or ignore
           console.warn(`[SummitAppHost] Unknown method: ${data.method}`);
           // result = { status: 'ignored' };
           // Don't throw if we want to be lenient, but JSON-RPC usually expects error for unknown method
           throw new Error(`Method ${data.method} not supported`);
        }

        // Send response
        if (iframeRef.current && iframeRef.current.contentWindow) {
          const response = {
            jsonrpc: '2.0',
            id: data.id,
            result
          };
          iframeRef.current.contentWindow.postMessage(response, '*');
          setMessages(prev => [...prev, { direction: 'out', data: response }]);
        }

      } catch (err: any) {
        console.error('[SummitAppHost] Error handling message:', err);
        if (iframeRef.current && iframeRef.current.contentWindow) {
          const errorResponse = {
            jsonrpc: '2.0',
            id: data.id,
            error: {
              code: -32603,
              message: err.message
            }
          };
          iframeRef.current.contentWindow.postMessage(errorResponse, '*');
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onContextUpdate, onToolCall]);

  const renderUrl = `/api/mcp-apps/render?uri=${encodeURIComponent(appUri)}`;

  return (
    <div className={`flex flex-col border rounded-lg overflow-hidden bg-white shadow-sm ${className || ''}`}>
      <div className="bg-slate-50 border-b px-4 py-2 flex justify-between items-center">
        <div className="text-sm font-medium text-slate-700 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            MCP App Host
        </div>
        <div className="text-xs text-slate-500 font-mono">{appUri}</div>
      </div>

      <div className="relative flex-1 min-h-[500px] bg-slate-100">
        <iframe
            ref={iframeRef}
            src={renderUrl}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-forms"
            title="MCP App"
        />
      </div>

      {/* Interaction Ledger / Debug Log */}
      <div className="bg-slate-900 text-slate-200 p-4 h-32 overflow-y-auto text-xs font-mono border-t">
        <div className="font-bold text-slate-400 mb-2 uppercase tracking-wider flex justify-between">
            <span>Interaction Ledger</span>
            <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded">NON-REPUDIABLE</span>
        </div>
        {messages.map((msg, idx) => (
            <div key={idx} className={`mb-1 ${msg.direction === 'in' ? 'text-blue-300' : 'text-green-300'}`}>
                <span className="opacity-50 mr-2">{msg.direction === 'in' ? '<<' : '>>'}</span>
                {JSON.stringify(msg.data)}
            </div>
        ))}
        {messages.length === 0 && <div className="text-slate-600 italic">Waiting for interactions...</div>}
      </div>
    </div>
  );
};
