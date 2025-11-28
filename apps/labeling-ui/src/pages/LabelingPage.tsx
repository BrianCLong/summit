/**
 * Labeling Page
 *
 * Main labeling interface for annotators.
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { useMyJobs, useJob, useSample, useAssignJobs, useStartJob, useSubmitLabel } from '../hooks/useApi';
import { useLabelingStore } from '../store/labelingStore';
import { EntityMatchTask } from '../components/labeling/EntityMatchTask';
import { ClusterReviewTask } from '../components/labeling/ClusterReviewTask';
import { ClaimAssessmentTask } from '../components/labeling/ClaimAssessmentTask';
import { SafetyDecisionTask } from '../components/labeling/SafetyDecisionTask';
import { TextClassificationTask } from '../components/labeling/TextClassificationTask';
import { Play, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { cn } from '../utils/cn';
import type { Label, TaskType } from '../types';

export function LabelingPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const { data: myJobs, isLoading: jobsLoading } = useMyJobs('assigned');
  const { data: currentJobData, isLoading: jobLoading } = useJob(jobId || '');
  const assignJobs = useAssignJobs();
  const startJob = useStartJob();
  const submitLabel = useSubmitLabel();

  const {
    currentJob,
    currentSample,
    setCurrentJob,
    setCurrentSample,
    pendingLabels,
    clearLabels,
    notes,
    confidence,
    sessionStartTime,
    startSession,
    getTimeSpent,
    resetSession,
    getInstructions,
  } = useLabelingStore();

  // Fetch sample when job is available
  const { data: sampleData } = useSample(currentJob?.sampleId || '');

  React.useEffect(() => {
    if (currentJobData) {
      setCurrentJob(currentJobData);
    }
  }, [currentJobData, setCurrentJob]);

  React.useEffect(() => {
    if (sampleData) {
      setCurrentSample(sampleData);
    }
  }, [sampleData, setCurrentSample]);

  const handleAssignJobs = async () => {
    try {
      const jobs = await assignJobs.mutateAsync({ count: 5 });
      if (jobs.length > 0) {
        setCurrentJob(jobs[0]);
      }
    } catch (error) {
      console.error('Failed to assign jobs:', error);
    }
  };

  const handleStartJob = async (jId: string) => {
    try {
      const job = await startJob.mutateAsync(jId);
      setCurrentJob(job);
      startSession();
    } catch (error) {
      console.error('Failed to start job:', error);
    }
  };

  const handleSubmitLabel = async (labels: Label[]) => {
    if (!currentJob) return;

    try {
      await submitLabel.mutateAsync({
        jobId: currentJob.id,
        labels,
        confidence: confidence || undefined,
        notes: notes || undefined,
        timeSpent: getTimeSpent(),
      });

      // Move to next job
      resetSession();
      if (myJobs && myJobs.length > 1) {
        const nextJob = myJobs.find((j) => j.id !== currentJob.id);
        if (nextJob) {
          setCurrentJob(nextJob);
        }
      }
    } catch (error) {
      console.error('Failed to submit label:', error);
    }
  };

  const renderTaskComponent = () => {
    if (!currentJob || !currentSample) return null;

    const props = {
      sample: currentSample,
      job: currentJob,
      onSubmit: handleSubmitLabel,
      instructions: getInstructions(currentJob.taskType),
    };

    switch (currentJob.taskType) {
      case 'entity_match':
      case 'entity_no_match':
        return <EntityMatchTask {...props} />;
      case 'cluster_review':
        return <ClusterReviewTask {...props} />;
      case 'claim_assessment':
        return <ClaimAssessmentTask {...props} />;
      case 'safety_decision':
        return <SafetyDecisionTask {...props} />;
      case 'text_classification':
      default:
        return <TextClassificationTask {...props} />;
    }
  };

  if (jobsLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Job Queue Sidebar */}
      <aside className="w-80 border-r bg-card p-4 overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">My Tasks</h2>
          <button
            onClick={handleAssignJobs}
            disabled={assignJobs.isPending}
            className="text-sm text-primary hover:underline disabled:opacity-50"
          >
            {assignJobs.isPending ? 'Loading...' : 'Get More'}
          </button>
        </div>

        {myJobs && myJobs.length > 0 ? (
          <div className="space-y-2">
            {myJobs.map((job) => (
              <div
                key={job.id}
                className={cn(
                  'rounded-lg border p-3 cursor-pointer transition-colors',
                  currentJob?.id === job.id
                    ? 'border-primary bg-primary/5'
                    : 'hover:bg-muted'
                )}
                onClick={() => {
                  if (job.status === 'assigned') {
                    handleStartJob(job.id);
                  } else if (job.status === 'in_progress') {
                    setCurrentJob(job);
                    if (!sessionStartTime) {
                      startSession();
                    }
                  }
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium capitalize">
                    {job.taskType.replace(/_/g, ' ')}
                  </span>
                  <JobStatusBadge status={job.status} />
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  Sample: {job.sampleId.slice(0, 8)}...
                </p>
                <div className="flex items-center mt-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 mr-1" />
                  Priority: {job.priority}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No tasks assigned</p>
            <button
              onClick={handleAssignJobs}
              disabled={assignJobs.isPending}
              className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Play className="h-4 w-4 mr-2" />
              Get Tasks
            </button>
          </div>
        )}
      </aside>

      {/* Main Labeling Area */}
      <main className="flex-1 overflow-auto p-6">
        {currentJob && currentSample ? (
          renderTaskComponent()
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <CheckCircle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Ready to Label</h2>
              <p className="text-muted-foreground mb-4">
                Select a task from the sidebar or get new tasks to begin labeling.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function JobStatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; label: string }> = {
    queued: { color: 'bg-gray-100 text-gray-800', label: 'Queued' },
    assigned: { color: 'bg-blue-100 text-blue-800', label: 'Assigned' },
    in_progress: { color: 'bg-yellow-100 text-yellow-800', label: 'In Progress' },
    submitted: { color: 'bg-green-100 text-green-800', label: 'Submitted' },
    approved: { color: 'bg-green-100 text-green-800', label: 'Approved' },
    rejected: { color: 'bg-red-100 text-red-800', label: 'Rejected' },
  };

  const { color, label } = config[status] || config.queued;

  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', color)}>
      {label}
    </span>
  );
}
