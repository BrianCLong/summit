"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useTasks = useTasks;
/**
 * Tasks Hook
 * Provides task data with offline support
 */
const react_1 = require("react");
const offlineCache_1 = require("@/lib/offlineCache");
const syncEngine_1 = require("@/lib/syncEngine");
const NetworkContext_1 = require("@/contexts/NetworkContext");
const AuthContext_1 = require("@/contexts/AuthContext");
function useTasks() {
    const [tasks, setTasks] = (0, react_1.useState)([]);
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const { isOnline } = (0, NetworkContext_1.useNetwork)();
    const { accessToken } = (0, AuthContext_1.useAuth)();
    // Load tasks from cache
    const loadFromCache = (0, react_1.useCallback)(async () => {
        try {
            const cached = await offlineCache_1.offlineCache.tasks.getPending();
            setTasks(cached.sort((a, b) => {
                // Sort by priority first, then due date
                const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
                const aPriority = priorityOrder[a.priority] ?? 4;
                const bPriority = priorityOrder[b.priority] ?? 4;
                if (aPriority !== bPriority)
                    return aPriority - bPriority;
                if (a.dueDate && b.dueDate) {
                    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                }
                return 0;
            }));
        }
        catch (err) {
            console.error('Failed to load tasks from cache:', err);
        }
    }, []);
    // Fetch tasks from server
    const fetchFromServer = (0, react_1.useCallback)(async () => {
        if (!isOnline || !accessToken)
            return;
        try {
            const response = await fetch('/api/mobile/tasks', {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            if (!response.ok) {
                throw new Error('Failed to fetch tasks');
            }
            const data = await response.json();
            await offlineCache_1.offlineCache.tasks.setMany(data);
            setTasks(data);
            setError(null);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
            await loadFromCache();
        }
    }, [isOnline, accessToken, loadFromCache]);
    // Refresh tasks
    const refresh = (0, react_1.useCallback)(async () => {
        setIsLoading(true);
        try {
            if (isOnline) {
                await fetchFromServer();
            }
            else {
                await loadFromCache();
            }
        }
        finally {
            setIsLoading(false);
        }
    }, [isOnline, fetchFromServer, loadFromCache]);
    // Update task status
    const updateStatus = (0, react_1.useCallback)(async (id, status) => {
        const now = new Date().toISOString();
        // Optimistic update
        setTasks((prev) => prev.map((task) => task.id === id
            ? {
                ...task,
                status,
                completedAt: status === 'completed' ? now : undefined,
            }
            : task));
        // Get current task and update cache
        const task = tasks.find((t) => t.id === id);
        if (task) {
            const updatedTask = {
                ...task,
                status,
                completedAt: status === 'completed' ? now : undefined,
            };
            await offlineCache_1.offlineCache.tasks.set(updatedTask);
            // Queue for sync
            await syncEngine_1.syncEngine.queueForSync('update', 'acknowledgement', {
                taskId: id,
                status,
                timestamp: now,
            });
        }
    }, [tasks]);
    // Get tasks by case
    const getByCase = (0, react_1.useCallback)((caseId) => {
        return tasks.filter((t) => t.caseId === caseId);
    }, [tasks]);
    // Initial load
    (0, react_1.useEffect)(() => {
        refresh();
    }, [refresh]);
    // Pending count
    const pendingCount = tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress').length;
    return {
        tasks,
        pendingCount,
        isLoading,
        error,
        refresh,
        updateStatus,
        getByCase,
    };
}
