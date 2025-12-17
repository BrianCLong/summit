import { useEffect, useState, useCallback } from 'react';
import { useSocket } from './useSocket';

export const useDashboardSocket = () => {
  const { socket, connected, error } = useSocket('/realtime');
  const [metrics, setMetrics] = useState(null);
  const [insights, setInsights] = useState([]);
  const [activity, setActivity] = useState([]);
  const [graphUpdates, setGraphUpdates] = useState([]);

  useEffect(() => {
    if (socket && connected) {
      // Join dashboard room
      socket.emit('dashboard:join');

      // Listen for updates
      socket.on('dashboard:metrics', (data) => {
        setMetrics(data);
      });

      socket.on('dashboard:insights', (data) => {
        setInsights(data); // In a real app, you might want to append/merge
      });

      socket.on('dashboard:activity', (data) => {
        setActivity(prev => [data, ...prev].slice(0, 50)); // Keep last 50
      });

       socket.on('dashboard:graph_update', (data) => {
        setGraphUpdates(prev => [data, ...prev].slice(0, 20));
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
