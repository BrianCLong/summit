// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useEffect, useState, useCallback } from 'react';
import { useSocket } from './useSocket';

export const useDashboardSocket = () => {
   
  const { socket, connected, error } = useSocket('/realtime') as any;
   
  const [metrics, setMetrics] = useState<any>(null);
   
  const [insights, setInsights] = useState<any[]>([]);
   
  const [activity, setActivity] = useState<any[]>([]);
   
  const [graphUpdates, setGraphUpdates] = useState<any[]>([]);

  useEffect(() => {
    if (socket && connected) {
      // Join dashboard room
      socket.emit('dashboard:join');

      // Listen for updates
       
      socket.on('dashboard:metrics', (data: any) => {
        setMetrics(data);
      });

       
      socket.on('dashboard:insights', (data: any) => {
        setInsights(data); // In a real app, you might want to append/merge
      });

       
      socket.on('dashboard:activity', (data: any) => {
         
        setActivity((prev: any[]) => [data, ...prev].slice(0, 50)); // Keep last 50
      });

       
      socket.on('dashboard:graph_update', (data: any) => {
         
        setGraphUpdates((prev: any[]) => [data, ...prev].slice(0, 20));
      });

      return () => {
        socket.emit('dashboard:leave');
        socket.off('dashboard:metrics');
        socket.off('dashboard:insights');
        socket.off('dashboard:activity');
        socket.off('dashboard:graph_update');
      };
    }
  }, [socket, connected]);

  return {
    metrics,
    insights,
    activity,
    graphUpdates,
    connected,
    error
  };
};

export default useDashboardSocket;
