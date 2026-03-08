"use strict";
// apps/web/src/hooks/useGitHubIntegration.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useGitHubBranches = exports.useCreatePullRequest = exports.useGitHubStats = exports.useTriggerGitHubWorkflow = exports.useGitHubBranchProtection = exports.useGitHubInsights = exports.useGitHubWebhooks = exports.useGitHubDependabot = exports.useGitHubCodeScanning = exports.useCreateGitHubIssue = exports.useGitHubWorkflows = exports.useGitHubIntegration = void 0;
const react_query_1 = require("@tanstack/react-query");
const react_1 = require("react");
const config_1 = __importDefault(require("../config"));
const useGitHubIntegration = (options = {}) => {
    const { repository = config_1.default.integrations.github.repo, refreshInterval = 60000, } = options;
    const queryClient = (0, react_query_1.useQueryClient)();
    const fetchGitHubMetrics = async () => {
        const headers = {
            Accept: 'application/vnd.github.v3+json',
        };
        if (config_1.default.integrations.github.token) {
            headers.Authorization = `Bearer ${config_1.default.integrations.github.token}`;
        }
        const response = await fetch(`/api/integrations/github/metrics?repo=${repository}`, {
            headers,
        });
        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.statusText}`);
        }
        return response.json();
    };
    const githubQuery = (0, react_query_1.useQuery)({
        queryKey: ['github-metrics', repository],
        queryFn: fetchGitHubMetrics,
        refetchInterval: refreshInterval,
        staleTime: 30000,
        retry: 2,
        retryDelay: 5000,
    });
    return {
        data: githubQuery.data,
        loading: githubQuery.isLoading,
        error: githubQuery.error,
        refetch: githubQuery.refetch,
    };
};
exports.useGitHubIntegration = useGitHubIntegration;
// Hook for GitHub actions/workflows
const useGitHubWorkflows = (repository) => {
    return (0, react_query_1.useQuery)({
        queryKey: ['github-workflows', repository],
        queryFn: async () => {
            const response = await fetch(`/api/integrations/github/workflows?repo=${repository}`);
            return response.json();
        },
        refetchInterval: 120000, // 2 minutes
        staleTime: 60000,
    });
};
exports.useGitHubWorkflows = useGitHubWorkflows;
// Hook for creating GitHub issues from conductor
const useCreateGitHubIssue = () => {
    const queryClient = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: async (issue) => {
            const response = await fetch('/api/integrations/github/issues', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(issue),
            });
            if (!response.ok) {
                throw new Error('Failed to create GitHub issue');
            }
            return response.json();
        },
        onSuccess: (data, variables) => {
            // Invalidate and refetch GitHub metrics
            queryClient.invalidateQueries({
                queryKey: ['github-metrics', variables.repository],
            });
        },
    });
};
exports.useCreateGitHubIssue = useCreateGitHubIssue;
// Hook for GitHub code scanning alerts
const useGitHubCodeScanning = (repository) => {
    return (0, react_query_1.useQuery)({
        queryKey: ['github-code-scanning', repository],
        queryFn: async () => {
            const response = await fetch(`/api/integrations/github/code-scanning?repo=${repository}`);
            return response.json();
        },
        refetchInterval: 300000, // 5 minutes
        staleTime: 180000, // 3 minutes
    });
};
exports.useGitHubCodeScanning = useGitHubCodeScanning;
// Hook for GitHub Dependabot alerts
const useGitHubDependabot = (repository) => {
    return (0, react_query_1.useQuery)({
        queryKey: ['github-dependabot', repository],
        queryFn: async () => {
            const response = await fetch(`/api/integrations/github/dependabot?repo=${repository}`);
            return response.json();
        },
        refetchInterval: 3600000, // 1 hour
        staleTime: 1800000, // 30 minutes
    });
};
exports.useGitHubDependabot = useGitHubDependabot;
// Real-time GitHub webhooks hook
const useGitHubWebhooks = (repository) => {
    const [webhookEvents, setWebhookEvents] = (0, react_1.useState)([]);
    (0, react_1.useEffect)(() => {
        const eventSource = new EventSource(`/api/integrations/github/webhooks/stream?repo=${repository}`);
        eventSource.onmessage = event => {
            try {
                const webhookEvent = JSON.parse(event.data);
                setWebhookEvents(prev => [webhookEvent, ...prev].slice(0, 100)); // Keep last 100 events
            }
            catch (error) {
                console.error('Failed to parse webhook event:', error);
            }
        };
        eventSource.onerror = error => {
            console.error('GitHub webhooks SSE error:', error);
        };
        return () => eventSource.close();
    }, [repository]);
    return {
        webhookEvents,
        latestEvent: webhookEvents[0],
    };
};
exports.useGitHubWebhooks = useGitHubWebhooks;
// Hook for GitHub repository insights
const useGitHubInsights = (repository, timeRange = '30d') => {
    return (0, react_query_1.useQuery)({
        queryKey: ['github-insights', repository, timeRange],
        queryFn: async () => {
            const response = await fetch(`/api/integrations/github/insights?repo=${repository}&timeRange=${timeRange}`);
            return response.json();
        },
        refetchInterval: 3600000, // 1 hour
        staleTime: 1800000, // 30 minutes
    });
};
exports.useGitHubInsights = useGitHubInsights;
// Hook for GitHub branch protection rules
const useGitHubBranchProtection = (repository) => {
    return (0, react_query_1.useQuery)({
        queryKey: ['github-branch-protection', repository],
        queryFn: async () => {
            const response = await fetch(`/api/integrations/github/branch-protection?repo=${repository}`);
            return response.json();
        },
        staleTime: 3600000, // 1 hour - branch protection doesn't change often
        refetchOnWindowFocus: false,
    });
};
exports.useGitHubBranchProtection = useGitHubBranchProtection;
// Hook for triggering GitHub Actions workflows
const useTriggerGitHubWorkflow = () => {
    const queryClient = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: async (params) => {
            const response = await fetch('/api/integrations/github/workflows/dispatch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params),
            });
            if (!response.ok) {
                throw new Error('Failed to trigger GitHub workflow');
            }
            return response.json();
        },
        onSuccess: (data, variables) => {
            // Refresh workflows data
            queryClient.invalidateQueries({
                queryKey: ['github-workflows', variables.repository],
            });
        },
    });
};
exports.useTriggerGitHubWorkflow = useTriggerGitHubWorkflow;
// Hook for GitHub repository statistics
const useGitHubStats = (repository) => {
    return (0, react_query_1.useQuery)({
        queryKey: ['github-stats', repository],
        queryFn: async () => {
            const response = await fetch(`/api/integrations/github/stats?repo=${repository}`);
            return response.json();
        },
        refetchInterval: 21600000, // 6 hours
        staleTime: 10800000, // 3 hours
    });
};
exports.useGitHubStats = useGitHubStats;
const useCreatePullRequest = () => {
    const queryClient = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: async (pr) => {
            const response = await fetch('/api/integrations/github/pull-requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: pr.title,
                    body: pr.body,
                    head: pr.head,
                    base: pr.base || 'main',
                    draft: pr.draft || false,
                    labels: pr.labels || [],
                    assignees: pr.assignees || [],
                    targetRepo: pr.repository,
                }),
            });
            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.message || 'Failed to create pull request');
            }
            return response.json();
        },
        onSuccess: (data, variables) => {
            // Invalidate and refetch GitHub metrics
            queryClient.invalidateQueries({
                queryKey: ['github-metrics', variables.repository],
            });
        },
    });
};
exports.useCreatePullRequest = useCreatePullRequest;
// Hook for listing branches
const useGitHubBranches = (repository) => {
    return (0, react_query_1.useQuery)({
        queryKey: ['github-branches', repository],
        queryFn: async () => {
            const response = await fetch(`/api/integrations/github/branches?repo=${repository}`);
            if (!response.ok) {
                throw new Error('Failed to fetch branches');
            }
            return response.json();
        },
        staleTime: 60000, // 1 minute
    });
};
exports.useGitHubBranches = useGitHubBranches;
