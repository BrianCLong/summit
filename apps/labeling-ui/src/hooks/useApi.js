"use strict";
/**
 * Labeling UI - API Hooks
 *
 * React Query hooks for data fetching and mutations.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useDatasets = useDatasets;
exports.useDataset = useDataset;
exports.useDatasetStatistics = useDatasetStatistics;
exports.useSamples = useSamples;
exports.useSample = useSample;
exports.useNextSamples = useNextSamples;
exports.useMyJobs = useMyJobs;
exports.useJob = useJob;
exports.useAssignJobs = useAssignJobs;
exports.useStartJob = useStartJob;
exports.useSubmitLabel = useSubmitLabel;
exports.useReviewLabel = useReviewLabel;
exports.useLabelsNeedingReview = useLabelsNeedingReview;
exports.useQualityReport = useQualityReport;
exports.useAgreement = useAgreement;
exports.useSamplesNeedingAdjudication = useSamplesNeedingAdjudication;
exports.useResolveByMajorityVote = useResolveByMajorityVote;
exports.useWorkflows = useWorkflows;
exports.useWorkflow = useWorkflow;
exports.useWorkflowProgress = useWorkflowProgress;
exports.useAnnotatorLeaderboard = useAnnotatorLeaderboard;
exports.useMyProfile = useMyProfile;
const react_query_1 = require("@tanstack/react-query");
const axios_1 = __importDefault(require("axios"));
const api = axios_1.default.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});
// Add user ID to all requests
api.interceptors.request.use((config) => {
    const userId = localStorage.getItem('userId') || 'anonymous';
    config.headers['x-user-id'] = userId;
    return config;
});
// ============================================================================
// Dataset Hooks
// ============================================================================
function useDatasets(page = 1, pageSize = 20) {
    return (0, react_query_1.useQuery)({
        queryKey: ['datasets', page, pageSize],
        queryFn: async () => {
            const { data } = await api.get(`/datasets?page=${page}&pageSize=${pageSize}`);
            return data;
        },
    });
}
function useDataset(id) {
    return (0, react_query_1.useQuery)({
        queryKey: ['dataset', id],
        queryFn: async () => {
            const { data } = await api.get(`/datasets/${id}`);
            return data;
        },
        enabled: !!id,
    });
}
function useDatasetStatistics(id) {
    return (0, react_query_1.useQuery)({
        queryKey: ['dataset', id, 'statistics'],
        queryFn: async () => {
            const { data } = await api.get(`/datasets/${id}/statistics`);
            return data;
        },
        enabled: !!id,
    });
}
// ============================================================================
// Sample Hooks
// ============================================================================
function useSamples(datasetId, page = 1, pageSize = 20) {
    return (0, react_query_1.useQuery)({
        queryKey: ['samples', datasetId, page, pageSize],
        queryFn: async () => {
            const { data } = await api.get(`/datasets/${datasetId}/samples?page=${page}&pageSize=${pageSize}`);
            return data;
        },
        enabled: !!datasetId,
    });
}
function useSample(id) {
    return (0, react_query_1.useQuery)({
        queryKey: ['sample', id],
        queryFn: async () => {
            const { data } = await api.get(`/samples/${id}`);
            return data;
        },
        enabled: !!id,
    });
}
function useNextSamples(datasetId, count = 1) {
    return (0, react_query_1.useQuery)({
        queryKey: ['samples', datasetId, 'next', count],
        queryFn: async () => {
            const { data } = await api.get(`/datasets/${datasetId}/samples/next?count=${count}`);
            return data;
        },
        enabled: !!datasetId,
    });
}
// ============================================================================
// Job Hooks
// ============================================================================
function useMyJobs(status) {
    const userId = localStorage.getItem('userId') || 'anonymous';
    return (0, react_query_1.useQuery)({
        queryKey: ['jobs', 'my', status],
        queryFn: async () => {
            const params = status ? `?status=${status}` : '';
            const { data } = await api.get(`/annotators/${userId}/jobs${params}`);
            return data;
        },
    });
}
function useJob(id) {
    return (0, react_query_1.useQuery)({
        queryKey: ['job', id],
        queryFn: async () => {
            const { data } = await api.get(`/jobs/${id}`);
            return data;
        },
        enabled: !!id,
    });
}
function useAssignJobs() {
    const queryClient = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: async (params) => {
            const userId = localStorage.getItem('userId') || 'anonymous';
            const { data } = await api.post('/jobs/assign', {
                annotatorId: userId,
                ...params,
            });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['jobs'] });
        },
    });
}
function useStartJob() {
    const queryClient = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: async (jobId) => {
            const { data } = await api.post(`/jobs/${jobId}/start`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['jobs'] });
        },
    });
}
// ============================================================================
// Label Hooks
// ============================================================================
function useSubmitLabel() {
    const queryClient = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: async (params) => {
            const { data } = await api.post('/labels', params);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['jobs'] });
            queryClient.invalidateQueries({ queryKey: ['samples'] });
        },
    });
}
function useReviewLabel() {
    const queryClient = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: async (params) => {
            const { data } = await api.post(`/labels/${params.labelSetId}/review`, {
                approved: params.approved,
                notes: params.notes,
            });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['labels'] });
            queryClient.invalidateQueries({ queryKey: ['samples'] });
        },
    });
}
function useLabelsNeedingReview(datasetId, limit = 20) {
    return (0, react_query_1.useQuery)({
        queryKey: ['labels', 'review', datasetId, limit],
        queryFn: async () => {
            const { data } = await api.get(`/datasets/${datasetId}/labels/review?limit=${limit}`);
            return data;
        },
        enabled: !!datasetId,
    });
}
// ============================================================================
// Quality Hooks
// ============================================================================
function useQualityReport(datasetId) {
    return (0, react_query_1.useQuery)({
        queryKey: ['quality', datasetId],
        queryFn: async () => {
            const { data } = await api.get(`/datasets/${datasetId}/quality/report`);
            return data;
        },
        enabled: !!datasetId,
    });
}
function useAgreement(datasetId) {
    return (0, react_query_1.useQuery)({
        queryKey: ['quality', datasetId, 'agreement'],
        queryFn: async () => {
            const { data } = await api.get(`/datasets/${datasetId}/quality/agreement`);
            return data;
        },
        enabled: !!datasetId,
    });
}
function useSamplesNeedingAdjudication(datasetId, limit = 20) {
    return (0, react_query_1.useQuery)({
        queryKey: ['quality', datasetId, 'adjudication', limit],
        queryFn: async () => {
            const { data } = await api.get(`/datasets/${datasetId}/quality/adjudication?limit=${limit}`);
            return data;
        },
        enabled: !!datasetId,
    });
}
function useResolveByMajorityVote() {
    const queryClient = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: async (sampleId) => {
            const { data } = await api.post(`/samples/${sampleId}/quality/resolve/majority`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['quality'] });
            queryClient.invalidateQueries({ queryKey: ['samples'] });
        },
    });
}
// ============================================================================
// Workflow Hooks
// ============================================================================
function useWorkflows(datasetId) {
    return (0, react_query_1.useQuery)({
        queryKey: ['workflows', datasetId],
        queryFn: async () => {
            const { data } = await api.get(`/datasets/${datasetId}/workflows`);
            return data;
        },
        enabled: !!datasetId,
    });
}
function useWorkflow(id) {
    return (0, react_query_1.useQuery)({
        queryKey: ['workflow', id],
        queryFn: async () => {
            const { data } = await api.get(`/workflows/${id}`);
            return data;
        },
        enabled: !!id,
    });
}
function useWorkflowProgress(id) {
    return (0, react_query_1.useQuery)({
        queryKey: ['workflow', id, 'progress'],
        queryFn: async () => {
            const { data } = await api.get(`/workflows/${id}/progress`);
            return data;
        },
        enabled: !!id,
        refetchInterval: 30000, // Refresh every 30 seconds
    });
}
// ============================================================================
// Annotator Hooks
// ============================================================================
function useAnnotatorLeaderboard(metric = 'totalLabeled', limit = 10) {
    return (0, react_query_1.useQuery)({
        queryKey: ['annotators', 'leaderboard', metric, limit],
        queryFn: async () => {
            const { data } = await api.get(`/annotators/leaderboard?metric=${metric}&limit=${limit}`);
            return data;
        },
    });
}
function useMyProfile() {
    const userId = localStorage.getItem('userId') || 'anonymous';
    return (0, react_query_1.useQuery)({
        queryKey: ['annotator', userId],
        queryFn: async () => {
            const { data } = await api.get(`/annotators/user/${userId}`);
            return data;
        },
    });
}
