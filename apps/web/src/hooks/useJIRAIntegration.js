"use strict";
// apps/web/src/hooks/useJIRAIntegration.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useCreateConductorIssue = exports.useJIRADashboard = exports.useJIRATimeTracking = exports.useJIRAWorkload = exports.useJIRAProjectConfig = exports.useJIRASearch = exports.useJIRAWebhooks = exports.useJIRAQualityMetrics = exports.useJIRACycleTime = exports.useJIRAVelocity = exports.useJIRABurndown = exports.useJIRASprintManagement = exports.useUpdateJIRAIssue = exports.useCreateJIRAIssue = exports.useJIRAIntegration = void 0;
const react_query_1 = require("@tanstack/react-query");
const react_1 = require("react");
const config_1 = __importDefault(require("../config"));
const useJIRAIntegration = (options = {}) => {
    const { projectKey = config_1.default.integrations.jira.projectKey, refreshInterval = 120000, // 2 minutes
    maxResults = 50, } = options;
    const fetchJIRAMetrics = async () => {
        const params = new URLSearchParams({
            projectKey: projectKey || '',
            maxResults: maxResults.toString(),
        });
        const headers = {
            'Content-Type': 'application/json',
        };
        if (config_1.default.integrations.jira.token) {
            headers.Authorization = `Bearer ${config_1.default.integrations.jira.token}`;
        }
        const response = await fetch(`/api/integrations/jira/metrics?${params}`, {
            headers,
        });
        if (!response.ok) {
            throw new Error(`JIRA API error: ${response.statusText}`);
        }
        return response.json();
    };
    const jiraQuery = (0, react_query_1.useQuery)({
        queryKey: ['jira-metrics', projectKey],
        queryFn: fetchJIRAMetrics,
        refetchInterval: refreshInterval,
        staleTime: 60000, // 1 minute
        retry: 2,
        retryDelay: 3000,
        enabled: Boolean(projectKey),
    });
    return {
        data: jiraQuery.data,
        loading: jiraQuery.isLoading,
        error: jiraQuery.error,
        refetch: jiraQuery.refetch,
    };
};
exports.useJIRAIntegration = useJIRAIntegration;
// Hook for JIRA issue creation
const useCreateJIRAIssue = () => {
    const queryClient = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: async (issue) => {
            const response = await fetch('/api/integrations/jira/issues', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(issue),
            });
            if (!response.ok) {
                throw new Error('Failed to create JIRA issue');
            }
            return response.json();
        },
        onSuccess: (data, variables) => {
            // Invalidate JIRA metrics to reflect new issue
            queryClient.invalidateQueries({
                queryKey: ['jira-metrics', variables.projectKey],
            });
        },
    });
};
exports.useCreateJIRAIssue = useCreateJIRAIssue;
// Hook for JIRA issue updates
const useUpdateJIRAIssue = () => {
    const queryClient = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: async (update) => {
            const response = await fetch(`/api/integrations/jira/issues/${update.issueKey}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(update),
            });
            if (!response.ok) {
                throw new Error('Failed to update JIRA issue');
            }
            return response.json();
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({
                queryKey: ['jira-metrics', variables.projectKey],
            });
            queryClient.invalidateQueries({
                queryKey: ['jira-issue', variables.issueKey],
            });
        },
    });
};
exports.useUpdateJIRAIssue = useUpdateJIRAIssue;
// Hook for JIRA sprint management
const useJIRASprintManagement = (projectKey) => {
    return (0, react_query_1.useQuery)({
        queryKey: ['jira-sprints', projectKey],
        queryFn: async () => {
            const response = await fetch(`/api/integrations/jira/sprints?projectKey=${projectKey}`);
            return response.json();
        },
        refetchInterval: 300000, // 5 minutes
        staleTime: 180000, // 3 minutes
        enabled: Boolean(projectKey),
    });
};
exports.useJIRASprintManagement = useJIRASprintManagement;
// Hook for JIRA burndown data
const useJIRABurndown = (sprintId) => {
    return (0, react_query_1.useQuery)({
        queryKey: ['jira-burndown', sprintId],
        queryFn: async () => {
            const response = await fetch(`/api/integrations/jira/burndown?sprintId=${sprintId}`);
            return response.json();
        },
        refetchInterval: 3600000, // 1 hour
        staleTime: 1800000, // 30 minutes
        enabled: Boolean(sprintId),
    });
};
exports.useJIRABurndown = useJIRABurndown;
// Hook for JIRA velocity tracking
const useJIRAVelocity = (projectKey, sprintCount = 10) => {
    return (0, react_query_1.useQuery)({
        queryKey: ['jira-velocity', projectKey, sprintCount],
        queryFn: async () => {
            const response = await fetch(`/api/integrations/jira/velocity?projectKey=${projectKey}&sprintCount=${sprintCount}`);
            return response.json();
        },
        refetchInterval: 21600000, // 6 hours
        staleTime: 10800000, // 3 hours
        enabled: Boolean(projectKey),
    });
};
exports.useJIRAVelocity = useJIRAVelocity;
// Hook for JIRA cycle time analysis
const useJIRACycleTime = (projectKey, timeRange = '30d') => {
    return (0, react_query_1.useQuery)({
        queryKey: ['jira-cycle-time', projectKey, timeRange],
        queryFn: async () => {
            const response = await fetch(`/api/integrations/jira/cycle-time?projectKey=${projectKey}&timeRange=${timeRange}`);
            return response.json();
        },
        refetchInterval: 3600000, // 1 hour
        staleTime: 1800000, // 30 minutes
        enabled: Boolean(projectKey),
    });
};
exports.useJIRACycleTime = useJIRACycleTime;
// Hook for JIRA quality metrics
const useJIRAQualityMetrics = (projectKey) => {
    return (0, react_query_1.useQuery)({
        queryKey: ['jira-quality', projectKey],
        queryFn: async () => {
            const response = await fetch(`/api/integrations/jira/quality?projectKey=${projectKey}`);
            return response.json();
        },
        refetchInterval: 7200000, // 2 hours
        staleTime: 3600000, // 1 hour
        enabled: Boolean(projectKey),
    });
};
exports.useJIRAQualityMetrics = useJIRAQualityMetrics;
// Real-time JIRA webhooks hook
const useJIRAWebhooks = (projectKey) => {
    const [webhookEvents, setWebhookEvents] = (0, react_1.useState)([]);
    (0, react_1.useEffect)(() => {
        const eventSource = new EventSource(`/api/integrations/jira/webhooks/stream?projectKey=${projectKey}`);
        eventSource.onmessage = event => {
            try {
                const webhookEvent = JSON.parse(event.data);
                setWebhookEvents(prev => [webhookEvent, ...prev].slice(0, 100)); // Keep last 100 events
            }
            catch (error) {
                console.error('Failed to parse JIRA webhook event:', error);
            }
        };
        eventSource.onerror = error => {
            console.error('JIRA webhooks SSE error:', error);
        };
        return () => eventSource.close();
    }, [projectKey]);
    return {
        webhookEvents,
        latestEvent: webhookEvents[0],
    };
};
exports.useJIRAWebhooks = useJIRAWebhooks;
// Hook for JIRA advanced search
const useJIRASearch = (jql, maxResults = 50) => {
    return (0, react_query_1.useQuery)({
        queryKey: ['jira-search', jql, maxResults],
        queryFn: async () => {
            const response = await fetch('/api/integrations/jira/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jql, maxResults }),
            });
            return response.json();
        },
        enabled: Boolean(jql) && jql.length > 0,
        staleTime: 30000, // 30 seconds
    });
};
exports.useJIRASearch = useJIRASearch;
// Hook for JIRA project configuration
const useJIRAProjectConfig = (projectKey) => {
    return (0, react_query_1.useQuery)({
        queryKey: ['jira-project-config', projectKey],
        queryFn: async () => {
            const response = await fetch(`/api/integrations/jira/project/${projectKey}/config`);
            return response.json();
        },
        staleTime: 3600000, // 1 hour - project config doesn't change often
        refetchOnWindowFocus: false,
        enabled: Boolean(projectKey),
    });
};
exports.useJIRAProjectConfig = useJIRAProjectConfig;
// Hook for JIRA user assignments and workload
const useJIRAWorkload = (projectKey) => {
    return (0, react_query_1.useQuery)({
        queryKey: ['jira-workload', projectKey],
        queryFn: async () => {
            const response = await fetch(`/api/integrations/jira/workload?projectKey=${projectKey}`);
            return response.json();
        },
        refetchInterval: 1800000, // 30 minutes
        staleTime: 900000, // 15 minutes
        enabled: Boolean(projectKey),
    });
};
exports.useJIRAWorkload = useJIRAWorkload;
// Hook for JIRA time tracking
const useJIRATimeTracking = (projectKey, timeRange = '30d') => {
    return (0, react_query_1.useQuery)({
        queryKey: ['jira-time-tracking', projectKey, timeRange],
        queryFn: async () => {
            const response = await fetch(`/api/integrations/jira/time-tracking?projectKey=${projectKey}&timeRange=${timeRange}`);
            return response.json();
        },
        refetchInterval: 3600000, // 1 hour
        staleTime: 1800000, // 30 minutes
        enabled: Boolean(projectKey),
    });
};
exports.useJIRATimeTracking = useJIRATimeTracking;
// Hook for JIRA dashboard configuration
const useJIRADashboard = (dashboardId) => {
    return (0, react_query_1.useQuery)({
        queryKey: ['jira-dashboard', dashboardId],
        queryFn: async () => {
            const response = await fetch(`/api/integrations/jira/dashboard${dashboardId ? `/${dashboardId}` : ''}`);
            return response.json();
        },
        staleTime: 1800000, // 30 minutes
        enabled: Boolean(dashboardId),
    });
};
exports.useJIRADashboard = useJIRADashboard;
// Hook for creating conductor issues from JIRA events
const useCreateConductorIssue = () => {
    return (0, react_query_1.useMutation)({
        mutationFn: async (issue) => {
            const response = await fetch('/api/conductor/v1/issues', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(issue),
            });
            if (!response.ok) {
                throw new Error('Failed to create conductor issue');
            }
            return response.json();
        },
    });
};
exports.useCreateConductorIssue = useCreateConductorIssue;
