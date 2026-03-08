"use strict";
// @ts-nocheck - React 18/19 type compatibility issue
/**
 * Labeling Page
 *
 * Main labeling interface for annotators.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LabelingPage = LabelingPage;
const react_1 = __importDefault(require("react"));
const react_router_dom_1 = require("react-router-dom");
const useApi_1 = require("../hooks/useApi");
const labelingStore_1 = require("../store/labelingStore");
const EntityMatchTask_1 = require("../components/labeling/EntityMatchTask");
const ClusterReviewTask_1 = require("../components/labeling/ClusterReviewTask");
const ClaimAssessmentTask_1 = require("../components/labeling/ClaimAssessmentTask");
const SafetyDecisionTask_1 = require("../components/labeling/SafetyDecisionTask");
const TextClassificationTask_1 = require("../components/labeling/TextClassificationTask");
const lucide_react_1 = require("lucide-react");
const cn_1 = require("../utils/cn");
function LabelingPage() {
    const { jobId } = (0, react_router_dom_1.useParams)();
    const { data: myJobs, isLoading: jobsLoading } = (0, useApi_1.useMyJobs)('assigned');
    const { data: currentJobData } = (0, useApi_1.useJob)(jobId || '');
    const assignJobs = (0, useApi_1.useAssignJobs)();
    const startJob = (0, useApi_1.useStartJob)();
    const submitLabel = (0, useApi_1.useSubmitLabel)();
    const { currentJob, currentSample, setCurrentJob, setCurrentSample, notes, confidence, sessionStartTime, startSession, getTimeSpent, resetSession, getInstructions, } = (0, labelingStore_1.useLabelingStore)();
    // Fetch sample when job is available
    const { data: sampleData } = (0, useApi_1.useSample)(currentJob?.sampleId || '');
    react_1.default.useEffect(() => {
        if (currentJobData) {
            setCurrentJob(currentJobData);
        }
    }, [currentJobData, setCurrentJob]);
    react_1.default.useEffect(() => {
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
        }
        catch (error) {
            console.error('Failed to assign jobs:', error);
        }
    };
    const handleStartJob = async (jId) => {
        try {
            const job = await startJob.mutateAsync(jId);
            setCurrentJob(job);
            startSession();
        }
        catch (error) {
            console.error('Failed to start job:', error);
        }
    };
    const handleSubmitLabel = async (labels) => {
        if (!currentJob)
            return;
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
        }
        catch (error) {
            console.error('Failed to submit label:', error);
        }
    };
    const renderTaskComponent = () => {
        if (!currentJob || !currentSample)
            return null;
        const props = {
            sample: currentSample,
            job: currentJob,
            onSubmit: handleSubmitLabel,
            instructions: getInstructions(currentJob.taskType),
        };
        switch (currentJob.taskType) {
            case 'entity_match':
            case 'entity_no_match':
                return <EntityMatchTask_1.EntityMatchTask {...props}/>;
            case 'cluster_review':
                return <ClusterReviewTask_1.ClusterReviewTask {...props}/>;
            case 'claim_assessment':
                return <ClaimAssessmentTask_1.ClaimAssessmentTask {...props}/>;
            case 'safety_decision':
                return <SafetyDecisionTask_1.SafetyDecisionTask {...props}/>;
            case 'text_classification':
            default:
                return <TextClassificationTask_1.TextClassificationTask {...props}/>;
        }
    };
    if (jobsLoading) {
        return (<div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>);
    }
    return (<div className="flex h-full">
      {/* Job Queue Sidebar */}
      <aside className="w-80 border-r bg-card p-4 overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">My Tasks</h2>
          <button onClick={handleAssignJobs} disabled={assignJobs.isPending} className="text-sm text-primary hover:underline disabled:opacity-50">
            {assignJobs.isPending ? 'Loading...' : 'Get More'}
          </button>
        </div>

        {myJobs && myJobs.length > 0 ? (<div className="space-y-2">
            {myJobs.map((job) => (<div key={job.id} className={(0, cn_1.cn)('rounded-lg border p-3 cursor-pointer transition-colors', currentJob?.id === job.id
                    ? 'border-primary bg-primary/5'
                    : 'hover:bg-muted')} onClick={() => {
                    if (job.status === 'assigned') {
                        handleStartJob(job.id);
                    }
                    else if (job.status === 'in_progress') {
                        setCurrentJob(job);
                        if (!sessionStartTime) {
                            startSession();
                        }
                    }
                }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium capitalize">
                    {job.taskType.replace(/_/g, ' ')}
                  </span>
                  <JobStatusBadge status={job.status}/>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  Sample: {job.sampleId.slice(0, 8)}...
                </p>
                <div className="flex items-center mt-2 text-xs text-muted-foreground">
                  <lucide_react_1.Clock className="h-3 w-3 mr-1"/>
                  Priority: {job.priority}
                </div>
              </div>))}
          </div>) : (<div className="text-center py-8">
            <lucide_react_1.AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4"/>
            <p className="text-muted-foreground mb-4">No tasks assigned</p>
            <button onClick={handleAssignJobs} disabled={assignJobs.isPending} className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              <lucide_react_1.Play className="h-4 w-4 mr-2"/>
              Get Tasks
            </button>
          </div>)}
      </aside>

      {/* Main Labeling Area */}
      <main className="flex-1 overflow-auto p-6">
        {currentJob && currentSample ? (renderTaskComponent()) : (<div className="flex h-full items-center justify-center">
            <div className="text-center">
              <lucide_react_1.CheckCircle className="h-16 w-16 mx-auto text-muted-foreground mb-4"/>
              <h2 className="text-xl font-semibold mb-2">Ready to Label</h2>
              <p className="text-muted-foreground mb-4">
                Select a task from the sidebar or get new tasks to begin labeling.
              </p>
            </div>
          </div>)}
      </main>
    </div>);
}
function JobStatusBadge({ status }) {
    const config = {
        queued: { color: 'bg-gray-100 text-gray-800', label: 'Queued' },
        assigned: { color: 'bg-blue-100 text-blue-800', label: 'Assigned' },
        in_progress: { color: 'bg-yellow-100 text-yellow-800', label: 'In Progress' },
        submitted: { color: 'bg-green-100 text-green-800', label: 'Submitted' },
        approved: { color: 'bg-green-100 text-green-800', label: 'Approved' },
        rejected: { color: 'bg-red-100 text-red-800', label: 'Rejected' },
    };
    const { color, label } = config[status] || config.queued;
    return (<span className={(0, cn_1.cn)('px-2 py-0.5 rounded-full text-xs font-medium', color)}>
      {label}
    </span>);
}
