/**
 * useERBulkActions Hook
 *
 * Provides bulk operation capabilities for ER adjudication queue,
 * enabling efficient batch processing with progress tracking
 * and error handling.
 */

import { useState, useCallback } from 'react';
import { logger } from '../utils/logger';

interface BulkActionOptions {
  reason?: string;
  reviewerId?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
}

interface BulkExportOptions {
  format: 'csv' | 'json' | 'xlsx';
  includeMetadata?: boolean;
  includeHistory?: boolean;
  columns?: string[];
}

interface BulkActionResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: Array<{ candidateId: string; error: string }>;
  jobId?: string;
  downloadUrl?: string;
}

interface BulkActionJob {
  id: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  total: number;
  startTime: Date;
  endTime?: Date;
  results: BulkActionResult;
}

export const useERBulkActions = (tenantId: string) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeJobs, setActiveJobs] = useState<Map<string, BulkActionJob>>(new Map());

  // GraphQL mutation for bulk operations
  const executeBulkMutation = useCallback(async (
    mutation: string,
    variables: any
  ): Promise<any> => {
    try {
      const response = await fetch('/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': tenantId,
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          query: mutation,
          variables
        })
      });

      const result = await response.json();

      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      return result.data;
    } catch (error) {
      logger.error('GraphQL mutation failed:', error);
      throw error;
    }
  }, [tenantId]);

  // Bulk approve candidates
  const bulkApprove = useCallback(async (
    candidateIds: string[],
    options: BulkActionOptions = {}
  ): Promise<BulkActionResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const mutation = `
        mutation BulkApproveERCandidates($input: BulkERApprovalInput!) {
          bulkApproveERCandidates(input: $input) {
            success
            processed
            failed
            jobId
            errors {
              candidateId
              error
            }
          }
        }
      `;

      const variables = {
        input: {
          candidateIds,
          tenantId,
          reason: options.reason || 'Bulk approval',
          reviewerId: options.reviewerId,
          metadata: options.metadata
        }
      };

      const data = await executeBulkMutation(mutation, variables);
      return data.bulkApproveERCandidates;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);

      return {
        success: false,
        processed: 0,
        failed: candidateIds.length,
        errors: [{ candidateId: 'all', error: errorMessage }]
      };
    } finally {
      setIsLoading(false);
    }
  }, [executeBulkMutation]);

  // Bulk reject candidates
  const bulkReject = useCallback(async (
    candidateIds: string[],
    options: BulkActionOptions = {}
  ): Promise<BulkActionResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const mutation = `
        mutation BulkRejectERCandidates($input: BulkERRejectionInput!) {
          bulkRejectERCandidates(input: $input) {
            success
            processed
            failed
            jobId
            errors {
              candidateId
              error
            }
          }
        }
      `;

      const variables = {
        input: {
          candidateIds,
          tenantId,
          reason: options.reason || 'Bulk rejection',
          reviewerId: options.reviewerId,
          metadata: options.metadata
        }
      };

      const data = await executeBulkMutation(mutation, variables);
      return data.bulkRejectERCandidates;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);

      return {
        success: false,
        processed: 0,
        failed: candidateIds.length,
        errors: [{ candidateId: 'all', error: errorMessage }]
      };
    } finally {
      setIsLoading(false);
    }
  }, [executeBulkMutation]);

  // Bulk split candidates
  const bulkSplit = useCallback(async (
    candidateIds: string[],
    options: BulkActionOptions = {}
  ): Promise<BulkActionResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const mutation = `
        mutation BulkSplitERCandidates($input: BulkERSplitInput!) {
          bulkSplitERCandidates(input: $input) {
            success
            processed
            failed
            jobId
            errors {
              candidateId
              error
            }
          }
        }
      `;

      const variables = {
        input: {
          candidateIds,
          tenantId,
          reason: options.reason || 'Bulk split',
          reviewerId: options.reviewerId,
          metadata: options.metadata
        }
      };

      const data = await executeBulkMutation(mutation, variables);
      return data.bulkSplitERCandidates;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);

      return {
        success: false,
        processed: 0,
        failed: candidateIds.length,
        errors: [{ candidateId: 'all', error: errorMessage }]
      };
    } finally {
      setIsLoading(false);
    }
  }, [executeBulkMutation]);

  // Bulk assign reviewer
  const bulkAssignReviewer = useCallback(async (
    candidateIds: string[],
    reviewerId: string
  ): Promise<BulkActionResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const mutation = `
        mutation BulkAssignERReviewer($input: BulkERAssignmentInput!) {
          bulkAssignERReviewer(input: $input) {
            success
            processed
            failed
            jobId
            errors {
              candidateId
              error
            }
          }
        }
      `;

      const variables = {
        input: {
          candidateIds,
          tenantId,
          reviewerId
        }
      };

      const data = await executeBulkMutation(mutation, variables);
      return data.bulkAssignERReviewer;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);

      return {
        success: false,
        processed: 0,
        failed: candidateIds.length,
        errors: [{ candidateId: 'all', error: errorMessage }]
      };
    } finally {
      setIsLoading(false);
    }
  }, [executeBulkMutation]);

  // Bulk change priority
  const bulkChangePriority = useCallback(async (
    candidateIds: string[],
    priority: 'low' | 'medium' | 'high' | 'critical'
  ): Promise<BulkActionResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const mutation = `
        mutation BulkChangeERPriority($input: BulkERPriorityInput!) {
          bulkChangeERPriority(input: $input) {
            success
            processed
            failed
            jobId
            errors {
              candidateId
              error
            }
          }
        }
      `;

      const variables = {
        input: {
          candidateIds,
          tenantId,
          priority
        }
      };

      const data = await executeBulkMutation(mutation, variables);
      return data.bulkChangeERPriority;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);

      return {
        success: false,
        processed: 0,
        failed: candidateIds.length,
        errors: [{ candidateId: 'all', error: errorMessage }]
      };
    } finally {
      setIsLoading(false);
    }
  }, [executeBulkMutation]);

  // Bulk export candidates
  const bulkExport = useCallback(async (
    candidateIds: string[],
    options: BulkExportOptions
  ): Promise<BulkActionResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const mutation = `
        mutation BulkExportERCandidates($input: BulkERExportInput!) {
          bulkExportERCandidates(input: $input) {
            success
            processed
            failed
            jobId
            downloadUrl
            errors {
              candidateId
              error
            }
          }
        }
      `;

      const variables = {
        input: {
          candidateIds,
          tenantId,
          format: options.format,
          includeMetadata: options.includeMetadata || false,
          includeHistory: options.includeHistory || false,
          columns: options.columns
        }
      };

      const data = await executeBulkMutation(mutation, variables);
      const result = data.bulkExportERCandidates;

      // If export was successful and we have a download URL, trigger download
      if (result.success && result.downloadUrl) {
        const link = document.createElement('a');
        link.href = result.downloadUrl;
        link.download = `er-candidates-export-${Date.now()}.${options.format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);

      return {
        success: false,
        processed: 0,
        failed: candidateIds.length,
        errors: [{ candidateId: 'all', error: errorMessage }]
      };
    } finally {
      setIsLoading(false);
    }
  }, [executeBulkMutation]);

  // Bulk delete candidates
  const bulkDelete = useCallback(async (
    candidateIds: string[]
  ): Promise<BulkActionResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const mutation = `
        mutation BulkDeleteERCandidates($input: BulkERDeleteInput!) {
          bulkDeleteERCandidates(input: $input) {
            success
            processed
            failed
            jobId
            errors {
              candidateId
              error
            }
          }
        }
      `;

      const variables = {
        input: {
          candidateIds,
          tenantId
        }
      };

      const data = await executeBulkMutation(mutation, variables);
      return data.bulkDeleteERCandidates;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);

      return {
        success: false,
        processed: 0,
        failed: candidateIds.length,
        errors: [{ candidateId: 'all', error: errorMessage }]
      };
    } finally {
      setIsLoading(false);
    }
  }, [executeBulkMutation]);

  // Bulk reprocess failed candidates
  const bulkReprocess = useCallback(async (
    candidateIds: string[]
  ): Promise<BulkActionResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const mutation = `
        mutation BulkReprocessERCandidates($input: BulkERReprocessInput!) {
          bulkReprocessERCandidates(input: $input) {
            success
            processed
            failed
            jobId
            errors {
              candidateId
              error
            }
          }
        }
      `;

      const variables = {
        input: {
          candidateIds,
          tenantId
        }
      };

      const data = await executeBulkMutation(mutation, variables);
      return data.bulkReprocessERCandidates;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);

      return {
        success: false,
        processed: 0,
        failed: candidateIds.length,
        errors: [{ candidateId: 'all', error: errorMessage }]
      };
    } finally {
      setIsLoading(false);
    }
  }, [executeBulkMutation]);

  // Get job status
  const getJobStatus = useCallback(async (jobId: string): Promise<BulkActionJob | null> => {
    try {
      const query = `
        query GetBulkActionJob($jobId: ID!) {
          bulkActionJob(id: $jobId) {
            id
            type
            status
            progress
            total
            startTime
            endTime
            results {
              success
              processed
              failed
              errors {
                candidateId
                error
              }
            }
          }
        }
      `;

      const variables = { jobId };
      const data = await executeBulkMutation(query, variables);

      if (data.bulkActionJob) {
        const job: BulkActionJob = {
          id: data.bulkActionJob.id,
          type: data.bulkActionJob.type,
          status: data.bulkActionJob.status,
          progress: data.bulkActionJob.progress,
          total: data.bulkActionJob.total,
          startTime: new Date(data.bulkActionJob.startTime),
          endTime: data.bulkActionJob.endTime ? new Date(data.bulkActionJob.endTime) : undefined,
          results: data.bulkActionJob.results
        };

        setActiveJobs(prev => new Map(prev.set(jobId, job)));
        return job;
      }

      return null;

    } catch (error) {
      logger.error('Failed to get job status:', error);
      return null;
    }
  }, [executeBulkMutation]);

  // Cancel a running job
  const cancelJob = useCallback(async (jobId: string): Promise<boolean> => {
    try {
      const mutation = `
        mutation CancelBulkActionJob($jobId: ID!) {
          cancelBulkActionJob(id: $jobId) {
            success
          }
        }
      `;

      const variables = { jobId };
      const data = await executeBulkMutation(mutation, variables);

      if (data.cancelBulkActionJob.success) {
        setActiveJobs(prev => {
          const updated = new Map(prev);
          const job = updated.get(jobId);
          if (job) {
            job.status = 'failed';
            job.endTime = new Date();
          }
          return updated;
        });
      }

      return data.cancelBulkActionJob.success;

    } catch (error) {
      logger.error('Failed to cancel job:', error);
      return false;
    }
  }, [executeBulkMutation]);

  // Poll job status for active jobs
  const pollJobStatus = useCallback(async () => {
    const activeJobIds = Array.from(activeJobs.keys()).filter(jobId => {
      const job = activeJobs.get(jobId);
      return job && ['pending', 'running'].includes(job.status);
    });

    for (const jobId of activeJobIds) {
      await getJobStatus(jobId);
    }
  }, [activeJobs, getJobStatus]);

  // Auto-poll active jobs every 5 seconds
  useState(() => {
    const interval = setInterval(pollJobStatus, 5000);
    return () => clearInterval(interval);
  });

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // Actions
    bulkApprove,
    bulkReject,
    bulkSplit,
    bulkAssignReviewer,
    bulkChangePriority,
    bulkExport,
    bulkDelete,
    bulkReprocess,

    // Job management
    getJobStatus,
    cancelJob,
    activeJobs: Array.from(activeJobs.values()),

    // State
    isLoading,
    error,
    clearError
  };
};