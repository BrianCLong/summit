// apps/web/src/components/github/GitHubPanel.tsx

import React, { useState } from 'react'
import {
  GitPullRequest,
  GitBranch,
  Plus,
  ExternalLink,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useGitHubIntegration } from '@/hooks/useGitHubIntegration'
import { CreatePullRequestModal } from './CreatePullRequestModal'

interface GitHubPanelProps {
  repository?: string
  currentBranch?: string
  className?: string
}

export const GitHubPanel: React.FC<GitHubPanelProps> = ({
  repository = process.env.NEXT_PUBLIC_GITHUB_REPO || '',
  currentBranch,
  className,
}) => {
  const [createPROpen, setCreatePROpen] = useState(false)
  const { data, loading, error } = useGitHubIntegration({ repository })

  const handlePRCreated = (pr: { number: number; html_url: string }) => {
    // Open the PR in a new tab
    window.open(pr.html_url, '_blank')
  }

  const getStatusIcon = (status: 'success' | 'failure' | 'pending' | 'none') => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failure':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return null
    }
  }

  const getReviewStatusBadge = (
    status: 'approved' | 'changes_requested' | 'pending' | 'none'
  ) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      approved: 'default',
      changes_requested: 'destructive',
      pending: 'secondary',
      none: 'outline',
    }
    const labels: Record<string, string> = {
      approved: 'Approved',
      changes_requested: 'Changes Requested',
      pending: 'Review Pending',
      none: 'No Review',
    }
    return <Badge variant={variants[status] || 'outline'}>{labels[status]}</Badge>
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <GitBranch className="h-4 w-4" />
          GitHub
        </CardTitle>
        <Button size="sm" onClick={() => setCreatePROpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Create PR
        </Button>
      </CardHeader>
      <CardContent>
        {loading && <div className="text-sm text-muted-foreground">Loading...</div>}

        {error && (
          <div className="text-sm text-red-500">
            Failed to load GitHub data
          </div>
        )}

        {data && (
          <div className="space-y-4">
            {/* PR Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {data.pullRequests?.open || 0}
                </div>
                <div className="text-xs text-muted-foreground">Open PRs</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {data.pullRequests?.merged || 0}
                </div>
                <div className="text-xs text-muted-foreground">Merged</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-muted-foreground">
                  {data.pullRequests?.closed || 0}
                </div>
                <div className="text-xs text-muted-foreground">Closed</div>
              </div>
            </div>

            {/* Recent PRs */}
            {data.pullRequests?.recentPRs && data.pullRequests.recentPRs.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Recent Pull Requests
                </div>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {data.pullRequests.recentPRs.slice(0, 5).map(pr => (
                    <div
                      key={pr.number}
                      className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <GitPullRequest
                        className={`h-4 w-4 ${
                          pr.state === 'merged'
                            ? 'text-purple-500'
                            : pr.state === 'open'
                              ? 'text-green-500'
                              : 'text-red-500'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          #{pr.number} {pr.title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          by {pr.author}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(pr.ciStatus)}
                        {getReviewStatusBadge(pr.reviewStatus)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Repository Link */}
            {data.repository && (
              <div className="pt-2 border-t">
                <a
                  href={`https://github.com/${data.repository.fullName}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                >
                  {data.repository.fullName}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>
        )}
      </CardContent>

      <CreatePullRequestModal
        open={createPROpen}
        onOpenChange={setCreatePROpen}
        repository={repository}
        defaultHead={currentBranch}
        onSuccess={handlePRCreated}
      />
    </Card>
  )
}

export default GitHubPanel
