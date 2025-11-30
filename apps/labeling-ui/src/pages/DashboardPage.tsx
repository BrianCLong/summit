/**
 * Dashboard Page
 *
 * Overview of labeling tasks and performance metrics.
 */

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useMyJobs, useMyProfile, useAnnotatorLeaderboard } from '../hooks/useApi';
import { CheckCircle, Clock, AlertCircle, Trophy, Target, Zap } from 'lucide-react';
import { cn } from '../utils/cn';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export function DashboardPage() {
  const { data: jobs, isLoading: jobsLoading } = useMyJobs();
  const { data: profile, isLoading: profileLoading } = useMyProfile();
  const { data: leaderboard } = useAnnotatorLeaderboard();

  const jobStats = React.useMemo(() => {
    if (!jobs) return { queued: 0, inProgress: 0, completed: 0, total: 0 };
    return {
      queued: jobs.filter((j) => j.status === 'queued' || j.status === 'assigned').length,
      inProgress: jobs.filter((j) => j.status === 'in_progress').length,
      completed: jobs.filter((j) => ['submitted', 'approved'].includes(j.status)).length,
      total: jobs.length,
    };
  }, [jobs]);

  const taskTypeData = React.useMemo(() => {
    if (!jobs) return [];
    const counts: Record<string, number> = {};
    jobs.forEach((job) => {
      counts[job.taskType] = (counts[job.taskType] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name: name.replace(/_/g, ' '),
      value,
    }));
  }, [jobs]);

  if (jobsLoading || profileLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-8">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          title="Queued Tasks"
          value={jobStats.queued}
          icon={Clock}
          color="text-blue-500"
        />
        <StatCard
          title="In Progress"
          value={jobStats.inProgress}
          icon={AlertCircle}
          color="text-yellow-500"
        />
        <StatCard
          title="Completed"
          value={jobStats.completed}
          icon={CheckCircle}
          color="text-green-500"
        />
        <StatCard
          title="Total Tasks"
          value={jobStats.total}
          icon={Target}
          color="text-purple-500"
        />
      </div>

      {/* Performance Metrics */}
      {profile && (
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <MetricCard
            title="Accuracy"
            value={`${(profile.performanceMetrics.accuracy * 100).toFixed(1)}%`}
            subtitle="Golden question accuracy"
            icon={Target}
          />
          <MetricCard
            title="Avg. Time"
            value={`${profile.performanceMetrics.averageTimePerTask.toFixed(0)}s`}
            subtitle="Per task"
            icon={Zap}
          />
          <MetricCard
            title="Total Labeled"
            value={profile.performanceMetrics.totalLabeled.toLocaleString()}
            subtitle="All time"
            icon={CheckCircle}
          />
        </div>
      )}

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        {/* Task Types Distribution */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">Tasks by Type</h3>
          {taskTypeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={taskTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} (${(percent * 100).toFixed(0)}%)`
                  }
                >
                  {taskTypeData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-muted-foreground">
              No tasks assigned yet
            </div>
          )}
        </div>

        {/* Leaderboard */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Trophy className="h-5 w-5 mr-2 text-yellow-500" />
            Leaderboard
          </h3>
          {leaderboard && leaderboard.length > 0 ? (
            <div className="space-y-3">
              {leaderboard.slice(0, 5).map((annotator: { rank: number; displayName: string; performanceMetrics: { totalLabeled: number } }, index: number) => (
                <div
                  key={annotator.rank}
                  className={cn(
                    'flex items-center justify-between rounded-lg p-3',
                    index === 0 ? 'bg-yellow-500/10' : 'bg-muted/50'
                  )}
                >
                  <div className="flex items-center">
                    <span
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full font-bold',
                        index === 0
                          ? 'bg-yellow-500 text-white'
                          : index === 1
                          ? 'bg-gray-400 text-white'
                          : index === 2
                          ? 'bg-amber-600 text-white'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {annotator.rank}
                    </span>
                    <span className="ml-3 font-medium">
                      {annotator.displayName}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {annotator.performanceMetrics.totalLabeled.toLocaleString()} labels
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-[200px] items-center justify-center text-muted-foreground">
              No leaderboard data yet
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-4">
          <a
            href="/labeling"
            className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Start Labeling
          </a>
          <a
            href="/review"
            className="inline-flex items-center rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/90"
          >
            Review Queue
          </a>
          <a
            href="/quality"
            className="inline-flex items-center rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/90"
          >
            Quality Reports
          </a>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
        </div>
        <Icon className={cn('h-8 w-8', color)} />
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center mb-2">
        <Icon className="h-5 w-5 text-primary mr-2" />
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
}
