import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../apps/web/src/components/ui/Card';
import { Badge } from '../../apps/web/src/components/ui/Badge';
import { Button } from '../../apps/web/src/components/ui/Button';
import { useSocket } from '../../apps/web/src/contexts/SocketContext';
import { MODIFIER_KEY, SHIFT_KEY, ALT_KEY } from '../../apps/web/src/lib/utils'; // Make sure to use platform independent modifiers

// Real-time hook utilizing the actual context
const useWarRoomWebSocket = () => {
  const { on, off, connected } = useSocket();
  const [threats, setThreats] = useState<any[]>([
    { id: 1, text: 'Unusual login activity detected', severity: 'high', timestamp: new Date().toISOString() },
    { id: 2, text: 'New external dependency added', severity: 'medium', timestamp: new Date().toISOString() },
  ]);
  const [operations, setOperations] = useState<any[]>([
    { id: 1, name: 'Malware Scan', progress: 45 },
    { id: 2, name: 'Code Audit', progress: 80 },
  ]);
  const [alerts, setAlerts] = useState<any[]>([
    { id: 1, title: 'API Key Exposure Risk', status: 'pending' },
  ]);

  useEffect(() => {
    const handleNewThreat = (data: any) => {
      setThreats((prev) => [data, ...prev].slice(0, 50)); // Keep last 50
    };

    const handleOpProgress = (data: any) => {
      setOperations((prev) => {
         const exists = prev.find(op => op.id === data.id);
         if(exists) {
            return prev.map(op => op.id === data.id ? {...op, progress: data.progress} : op);
         }
         return [...prev, data];
      });
    };

    const handleNewAlert = (data: any) => {
      setAlerts((prev) => [...prev, data]);
    };

    if (connected) {
      on('warroom:threat_feed', handleNewThreat);
      on('warroom:operation_progress', handleOpProgress);
      on('warroom:new_alert', handleNewAlert);
    }

    return () => {
      off('warroom:threat_feed', handleNewThreat);
      off('warroom:operation_progress', handleOpProgress);
      off('warroom:new_alert', handleNewAlert);
    };
  }, [connected, on, off]);

  return { threats, operations, alerts, setAlerts, connected };
};

export const WarRoom: React.FC = () => {
  const { threats, operations, alerts, setAlerts, connected } = useWarRoomWebSocket();
  const [spotlightEntity, setSpotlightEntity] = useState<any | null>(null);

  // Keyboard Shortcuts for power users
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Focus spotlight logic or dismiss top alert
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
          e.preventDefault();
          console.log('Shortcut: Spotlight focus toggled');
          // Add your logic to focus spotlight search or clear it
          if (spotlightEntity) setSpotlightEntity(null);
      }

      // Auto-dismiss top alert
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'D') {
          e.preventDefault();
          if (alerts.length > 0) {
              const topAlert = alerts[0];
              handleDismissAlert(topAlert.id);
          }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [alerts, spotlightEntity]);

  const handleDismissAlert = useCallback((id: number) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, [setAlerts]);

  const handleEscalateAlert = useCallback((id: number) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'escalated' } : a)));
  }, [setAlerts]);

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'default';
    }
  };

  return (
    <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-900 min-h-screen text-gray-100">
      <div className="md:col-span-3 flex justify-between items-center">
        <h1 className="text-3xl font-bold mb-4">Command Center: War Room</h1>
        <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-400">{connected ? 'Live' : 'Disconnected'}</span>
        </div>
      </div>

      {/* Narrative Threat Feed */}
      <Card className="bg-gray-800 border-gray-700 md:col-span-1 h-96 flex flex-col">
        <CardHeader>
          <CardTitle className="text-gray-100">Narrative Threat Feed</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto">
          <ul className="space-y-3">
            {threats.map((threat) => (
              <li
                key={threat.id}
                className="flex items-center justify-between p-3 rounded bg-gray-700 cursor-pointer hover:bg-gray-600 transition-colors"
                onClick={() => setSpotlightEntity(threat)}
              >
                <span className="text-sm break-words line-clamp-2 pr-2">{threat.text}</span>
                <Badge variant={getSeverityColor(threat.severity) as any}>
                  {threat.severity}
                </Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Active Operations Tracker */}
      <Card className="bg-gray-800 border-gray-700 md:col-span-1 h-96 flex flex-col">
        <CardHeader>
          <CardTitle className="text-gray-100">Active Operations Tracker</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto">
          <ul className="space-y-4">
            {operations.map((op) => (
              <li key={op.id}>
                <div className="flex justify-between mb-1 text-sm">
                  <span>{op.name}</span>
                  <span className="font-mono">{op.progress}%</span>
                </div>
                <div className="w-full bg-gray-600 rounded-full h-2.5">
                  <div
                    className="bg-blue-500 h-2.5 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${op.progress}%` }}
                  ></div>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Priority Alert Queue */}
      <Card className="bg-gray-800 border-gray-700 md:col-span-1 h-96 flex flex-col">
        <CardHeader>
          <CardTitle className="text-gray-100">Priority Alert Queue</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto">
          <ul className="space-y-3">
            {alerts.length === 0 ? (
              <li className="text-gray-400 italic text-sm text-center mt-8">No pending alerts.</li>
            ) : (
              alerts.map((alert) => (
                <li key={alert.id} className="p-3 rounded bg-gray-700 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <span className="font-semibold text-sm">{alert.title}</span>
                    <Badge variant={alert.status === 'escalated' ? 'destructive' : 'default'}>
                      {alert.status}
                    </Badge>
                  </div>
                  {alert.status === 'pending' && (
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="outline" onClick={() => handleDismissAlert(alert.id)}>
                        Dismiss
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleEscalateAlert(alert.id)}>
                        Escalate
                      </Button>
                    </div>
                  )}
                </li>
              ))
            )}
          </ul>
        </CardContent>
      </Card>

      {/* Entity Spotlight Panel */}
      <div className="md:col-span-3">
        <Card className="bg-gray-800 border-gray-700 min-h-[250px]">
          <CardHeader>
            <CardTitle className="text-gray-100 flex justify-between items-center">
                <span>Entity Spotlight</span>
                {spotlightEntity && <span className="text-xs text-gray-400 font-normal">Press {MODIFIER_KEY}+S to clear</span>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {spotlightEntity ? (
              <div className="p-4 bg-gray-700 rounded border border-gray-600 animate-in fade-in duration-300">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold">Deep-Dive: {spotlightEntity.text}</h3>
                  <Badge variant={getSeverityColor(spotlightEntity.severity) as any} className="uppercase">
                    {spotlightEntity.severity}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm text-gray-300 mb-6">
                    <div>
                        <p className="font-semibold text-gray-400 mb-1">First Seen</p>
                        <p>{new Date(spotlightEntity.timestamp || Date.now()).toLocaleString()}</p>
                    </div>
                    <div>
                        <p className="font-semibold text-gray-400 mb-1">Source Context</p>
                        <p>Graph Intelligence Node #{spotlightEntity.id}</p>
                    </div>
                </div>

                <p className="text-gray-300 mb-6 border-l-2 border-blue-500 pl-3">
                  Detailed analysis and historical context for this entity shows correlated activity patterns over the last 48 hours. The narrative engine has linked this event to 3 other low-severity occurrences.
                </p>

                <div className="flex gap-3">
                  <Button variant="default">View Full Graph</Button>
                  <Button variant="secondary" onClick={() => setSpotlightEntity(null)}>Clear Selection</Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-gray-500 italic space-y-2">
                <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                <span>Select an item from the Threat Feed to spotlight.</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
