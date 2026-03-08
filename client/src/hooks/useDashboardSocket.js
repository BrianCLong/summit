"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useDashboardSocket = void 0;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const react_1 = require("react");
const useSocket_1 = require("./useSocket");
const useDashboardSocket = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { socket, connected, error } = (0, useSocket_1.useSocket)('/realtime');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [metrics, setMetrics] = (0, react_1.useState)(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [insights, setInsights] = (0, react_1.useState)([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [activity, setActivity] = (0, react_1.useState)([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [graphUpdates, setGraphUpdates] = (0, react_1.useState)([]);
    (0, react_1.useEffect)(() => {
        if (socket && connected) {
            // Join dashboard room
            socket.emit('dashboard:join');
            // Listen for updates
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            socket.on('dashboard:metrics', (data) => {
                setMetrics(data);
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            socket.on('dashboard:insights', (data) => {
                setInsights(data); // In a real app, you might want to append/merge
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            socket.on('dashboard:activity', (data) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setActivity((prev) => [data, ...prev].slice(0, 50)); // Keep last 50
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            socket.on('dashboard:graph_update', (data) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setGraphUpdates((prev) => [data, ...prev].slice(0, 20));
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
exports.useDashboardSocket = useDashboardSocket;
exports.default = exports.useDashboardSocket;
