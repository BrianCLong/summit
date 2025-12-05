/**
 * Labeling UI - API Hooks
 *
 * React Query hooks for data fetching and mutations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import type {
  Dataset,
  Sample,
  LabelingJob,
  LabelSet,
  QualityReport,
  LabelingWorkflow,
  PaginatedResponse,
  Label,
} from '../types';

const api = axios.create({
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

export function useDatasets(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ['datasets', page, pageSize],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Dataset>>(
        `/datasets?page=${page}&pageSize=${pageSize}`
      );
      return data;
    },
  });
}

export function useDataset(id: string) {
  return useQuery({
    queryKey: ['dataset', id],
    queryFn: async () => {
      const { data } = await api.get<Dataset>(`/datasets/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useDatasetStatistics(id: string) {
  return useQuery({
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

export function useSamples(datasetId: string, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ['samples', datasetId, page, pageSize],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Sample>>(
        `/datasets/${datasetId}/samples?page=${page}&pageSize=${pageSize}`
      );
      return data;
    },
    enabled: !!datasetId,
  });
}

export function useSample(id: string) {
  return useQuery({
    queryKey: ['sample', id],
    queryFn: async () => {
      const { data } = await api.get<Sample>(`/samples/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useNextSamples(datasetId: string, count = 1) {
  return useQuery({
    queryKey: ['samples', datasetId, 'next', count],
    queryFn: async () => {
      const { data } = await api.get<Sample[]>(
        `/datasets/${datasetId}/samples/next?count=${count}`
      );
      return data;
    },
    enabled: !!datasetId,
  });
}

// ============================================================================
// Job Hooks
// ============================================================================

export function useMyJobs(status?: string) {
  const userId = localStorage.getItem('userId') || 'anonymous';
  return useQuery({
    queryKey: ['jobs', 'my', status],
    queryFn: async () => {
      const params = status ? `?status=${status}` : '';
      const { data } = await api.get<LabelingJob[]>(
        `/annotators/${userId}/jobs${params}`
      );
      return data;
    },
  });
}

export function useJob(id: string) {
  return useQuery({
    queryKey: ['job', id],
    queryFn: async () => {
      const { data } = await api.get<LabelingJob>(`/jobs/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useAssignJobs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { count?: number; taskType?: string }) => {
      const userId = localStorage.getItem('userId') || 'anonymous';
      const { data } = await api.post<LabelingJob[]>('/jobs/assign', {
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

export function useStartJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (jobId: string) => {
      const { data } = await api.post<LabelingJob>(`/jobs/${jobId}/start`);
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

export function useSubmitLabel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      jobId: string;
      labels: Label[];
      confidence?: number;
      notes?: string;
      timeSpent: number;
    }) => {
      const { data } = await api.post<LabelSet>('/labels', params);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['samples'] });
    },
  });
}

export function useReviewLabel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      labelSetId: string;
      approved: boolean;
      notes?: string;
    }) => {
      const { data } = await api.post<LabelSet>(
        `/labels/${params.labelSetId}/review`,
        {
          approved: params.approved,
          notes: params.notes,
        }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels'] });
      queryClient.invalidateQueries({ queryKey: ['samples'] });
    },
  });
}

export function useLabelsNeedingReview(datasetId: string, limit = 20) {
  return useQuery({
    queryKey: ['labels', 'review', datasetId, limit],
    queryFn: async () => {
      const { data } = await api.get<LabelSet[]>(
        `/datasets/${datasetId}/labels/review?limit=${limit}`
      );
      return data;
    },
    enabled: !!datasetId,
  });
}

// ============================================================================
// Quality Hooks
// ============================================================================

export function useQualityReport(datasetId: string) {
  return useQuery({
    queryKey: ['quality', datasetId],
    queryFn: async () => {
      const { data } = await api.get<QualityReport>(
        `/datasets/${datasetId}/quality/report`
      );
      return data;
    },
    enabled: !!datasetId,
  });
}

export function useAgreement(datasetId: string) {
  return useQuery({
    queryKey: ['quality', datasetId, 'agreement'],
    queryFn: async () => {
      const { data } = await api.get(
        `/datasets/${datasetId}/quality/agreement`
      );
      return data;
    },
    enabled: !!datasetId,
  });
}

export function useSamplesNeedingAdjudication(datasetId: string, limit = 20) {
  return useQuery({
    queryKey: ['quality', datasetId, 'adjudication', limit],
    queryFn: async () => {
      const { data } = await api.get(
        `/datasets/${datasetId}/quality/adjudication?limit=${limit}`
      );
      return data;
    },
    enabled: !!datasetId,
  });
}

export function useResolveByMajorityVote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sampleId: string) => {
      const { data } = await api.post(
        `/samples/${sampleId}/quality/resolve/majority`
      );
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

export function useWorkflows(datasetId: string) {
  return useQuery({
    queryKey: ['workflows', datasetId],
    queryFn: async () => {
      const { data } = await api.get<LabelingWorkflow[]>(
        `/datasets/${datasetId}/workflows`
      );
      return data;
    },
    enabled: !!datasetId,
  });
}

export function useWorkflow(id: string) {
  return useQuery({
    queryKey: ['workflow', id],
    queryFn: async () => {
      const { data } = await api.get<LabelingWorkflow>(`/workflows/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useWorkflowProgress(id: string) {
  return useQuery({
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

export function useAnnotatorLeaderboard(metric = 'totalLabeled', limit = 10) {
  return useQuery({
    queryKey: ['annotators', 'leaderboard', metric, limit],
    queryFn: async () => {
      const { data } = await api.get(
        `/annotators/leaderboard?metric=${metric}&limit=${limit}`
      );
      return data;
    },
  });
}

export function useMyProfile() {
  const userId = localStorage.getItem('userId') || 'anonymous';
  return useQuery({
    queryKey: ['annotator', userId],
    queryFn: async () => {
      const { data } = await api.get(`/annotators/user/${userId}`);
      return data;
    },
  });
}
