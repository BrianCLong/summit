// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useEffect, useState, useCallback } from "react";
import { useSocket } from "./useSocket";

export const useDashboardSocket = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { socket, connected, error } = useSocket("/realtime") as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [metrics, setMetrics] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [insights, setInsights] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [activity, setActivity] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [graphUpdates, setGraphUpdates] = useState<any[]>([]);

  useEffect(() => {
    if (socket && connected) {
      // Join dashboard room
      socket.emit("dashboard:join");

      // Listen for updates
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      socket.on("dashboard:metrics", (data: any) => {
        setMetrics(data);
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      socket.on("dashboard:insights", (data: any) => {
        setInsights(data); // In a real app, you might want to append/merge
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      socket.on("dashboard:activity", (data: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setActivity((prev: any[]) => [data, ...prev].slice(0, 50)); // Keep last 50
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      socket.on("dashboard:graph_update", (data: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setGraphUpdates((prev: any[]) => [data, ...prev].slice(0, 20));
      });

      return () => {
        socket.emit("dashboard:leave");
        socket.off("dashboard:metrics");
        socket.off("dashboard:insights");
        socket.off("dashboard:activity");
        socket.off("dashboard:graph_update");
      };
    }
  }, [socket, connected]);

  return {
    metrics,
    insights,
    activity,
    graphUpdates,
    connected,
    error,
  };
};

export default useDashboardSocket;
