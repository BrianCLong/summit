import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Circle,
  Database,
  Upload,
  Search,
  GitBranch,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { getFunnelProgress, type FunnelMilestone } from '@/telemetry/metrics';

interface MilestoneStep {
  id: FunnelMilestone;
  title: string;
  description: string;
  icon: React.ElementType;
  route: string;
  requiredInputs: string[];
  successCriteria: string;
  failureStates: string[];
}

const MILESTONES: MilestoneStep[] = [
  {
    id: 'signup_complete',
    title: 'Create Your Account',
    description: 'Sign up and verify your email to get started',
    icon: CheckCircle2,
    route: '/signup',
    requiredInputs: ['Email', 'Password', 'Organization name'],
    successCriteria: 'Account created and email verified',
    failureStates: ['Invalid email', 'Weak password', 'Email already exists'],
  },
  {
    id: 'data_source_connected',
    title: 'Connect a Data Source',
    description: 'Link your first integration or data source to begin ingesting data',
    icon: Database,
    route: '/data/sources',
    requiredInputs: ['Data source type', 'Connection credentials', 'Configuration'],
    successCriteria: 'Data source successfully connected and validated',
    failureStates: [
      'Invalid credentials',
      'Network timeout',
      'Unsupported data source version',
      'Missing permissions',
    ],
  },
  {
    id: 'data_ingested',
    title: 'Import Your Data',
    description: 'Ingest data from your connected source into the knowledge graph',
    icon: Upload,
    route: '/data/sources',
    requiredInputs: ['Connected data source', 'Ingestion schedule or manual trigger'],
    successCriteria: 'Data successfully ingested with entities and relationships created',
    failureStates: [
      'Empty dataset',
      'Ingestion job failed',
      'Data validation errors',
      'Schema mismatch',
    ],
  },
  {
    id: 'entities_explored',
    title: 'Explore Entities',
    description: 'View and navigate the entities in your knowledge graph',
    icon: Search,
    route: '/explore',
    requiredInputs: ['Ingested data'],
    successCriteria: 'Entity search executed and results displayed',
    failureStates: ['No entities found', 'Query timeout', 'Visualization error'],
  },
  {
    id: 'relationships_analyzed',
    title: 'Analyze Relationships',
    description: 'Discover connections and patterns in your data',
    icon: GitBranch,
    route: '/explore',
    requiredInputs: ['Entities with relationships'],
    successCriteria: 'Relationship graph displayed with connected entities',
    failureStates: ['No relationships found', 'Graph rendering failed', 'Query error'],
  },
];

export default function GettingStartedPage() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState<Record<string, { completed: boolean; timestamp: string; route: string }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProgress = () => {
      setLoading(true);
      const currentProgress = getFunnelProgress();
      setProgress(currentProgress);
      setLoading(false);
    };

    loadProgress();

    // Listen for funnel updates
    window.addEventListener('funnel_updated', loadProgress);
    window.addEventListener('storage', loadProgress);

    return () => {
      window.removeEventListener('funnel_updated', loadProgress);
      window.removeEventListener('storage', loadProgress);
    };
  }, []);

  const completedCount = MILESTONES.filter((m) => progress[m.id]?.completed).length;
  const progressPercent = (completedCount / MILESTONES.length) * 100;
  const nextMilestone = MILESTONES.find((m) => !progress[m.id]?.completed);

  const getMilestoneStatus = (milestoneId: FunnelMilestone): 'completed' | 'current' | 'pending' => {
    if (progress[milestoneId]?.completed) return 'completed';
    if (milestoneId === nextMilestone?.id) return 'current';
    return 'pending';
  };

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Getting Started</h1>
        <p className="text-muted-foreground mt-2">
          Complete these steps to unlock the full potential of the IntelGraph platform
        </p>
      </div>

      {/* Progress Overview */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Your Progress</CardTitle>
              <CardDescription>
                {completedCount === MILESTONES.length
                  ? 'All set! You\'re ready to go.'
                  : `${completedCount} of ${MILESTONES.length} steps completed`}
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-primary">
                {Math.round(progressPercent)}%
              </div>
              <div className="text-sm text-muted-foreground">Complete</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
                role="progressbar"
                aria-valuenow={progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Setup progress"
              />
            </div>
          </div>
          {nextMilestone && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm font-medium">
                Next: {nextMilestone.title}
              </p>
              <Button onClick={() => navigate(nextMilestone.route)} size="sm">
                Continue Setup
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Milestones Checklist */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Setup Steps</h2>
        <div className="space-y-4">
          {MILESTONES.map((milestone, index) => {
            const status = getMilestoneStatus(milestone.id);
            const Icon = milestone.icon;
            const isCompleted = status === 'completed';
            const isCurrent = status === 'current';

            return (
              <Card
                key={milestone.id}
                className={`transition-all ${
                  isCurrent
                    ? 'border-primary shadow-md'
                    : isCompleted
                    ? 'border-green-200 bg-green-50/50 dark:bg-green-950/20'
                    : 'border-border'
                }`}
              >
                <CardHeader>
                  <div className="flex items-start gap-4">
                    {/* Step Number / Status Icon */}
                    <div className="flex-shrink-0">
                      {isCompleted ? (
                        <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                          <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                      ) : (
                        <div
                          className={`h-10 w-10 rounded-full flex items-center justify-center ${
                            isCurrent
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          <span className="text-lg font-semibold">{index + 1}</span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{milestone.title}</CardTitle>
                        {isCompleted && (
                          <Badge variant="secondary" className="text-xs">
                            Completed
                          </Badge>
                        )}
                        {isCurrent && (
                          <Badge variant="default" className="text-xs">
                            Current
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="mt-1">
                        {milestone.description}
                      </CardDescription>

                      {/* Expandable Details */}
                      {isCurrent && (
                        <div className="mt-4 space-y-3 text-sm">
                          <div>
                            <p className="font-medium text-foreground mb-1">Required:</p>
                            <ul className="list-disc list-inside text-muted-foreground space-y-1">
                              {milestone.requiredInputs.map((input) => (
                                <li key={input}>{input}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="font-medium text-foreground mb-1">Success looks like:</p>
                            <p className="text-muted-foreground">{milestone.successCriteria}</p>
                          </div>
                        </div>
                      )}

                      {/* Completion Timestamp */}
                      {isCompleted && progress[milestone.id]?.timestamp && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Completed on{' '}
                          {new Date(progress[milestone.id].timestamp).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </p>
                      )}
                    </div>

                    {/* Action Button */}
                    <div className="flex-shrink-0">
                      {!isCompleted && (
                        <Button
                          variant={isCurrent ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => navigate(milestone.route)}
                        >
                          {isCurrent ? 'Start' : 'Go'}
                          <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Completion State */}
      {completedCount === MILESTONES.length && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              Setup Complete!
            </CardTitle>
            <CardDescription>
              You've completed all the essential setup steps. You're ready to explore the full power of IntelGraph.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Button onClick={() => navigate('/explore')}>
                Start Investigating
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => navigate('/dashboards/command-center')}>
                View Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
