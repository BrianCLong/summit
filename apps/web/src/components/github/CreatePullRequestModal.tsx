import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import {
  X,
  GitPullRequest,
  AlertCircle,
  Loader2,
  CheckCircle2,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import {
  useCreatePullRequest,
  useGitHubBranches,
  type CreatePullRequestParams,
} from '@/hooks/useGitHubIntegration'

// Default PR template
const PR_TEMPLATE = `## Summary
<!-- Brief description of changes -->

## Changes
-

## Test Plan
- [ ] Unit tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project conventions
- [ ] Documentation updated if needed
- [ ] No sensitive data exposed
`

interface CreatePullRequestModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  repository?: string
  defaultHead?: string
  defaultBase?: string
  onSuccess?: (pr: { number: number; html_url: string }) => void
}

// Generate title from branch name
const generateTitleFromBranch = (branch: string): string => {
  if (!branch) return ''
  // Remove common prefixes
  const cleaned = branch
    .replace(/^(feature|fix|bugfix|hotfix|chore|docs|refactor|test)\//, '')
    .replace(/^claude\//, '')
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
  // Capitalize first letter
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
}

export const CreatePullRequestModal: React.FC<CreatePullRequestModalProps> = ({
  open,
  onOpenChange,
  repository = process.env.NEXT_PUBLIC_GITHUB_REPO || '',
  defaultHead = '',
  defaultBase = 'main',
  onSuccess,
}) => {
  const [formData, setFormData] = React.useState<
    Omit<CreatePullRequestParams, 'repository'>
  >({
    title: '',
    body: PR_TEMPLATE,
    head: defaultHead,
    base: defaultBase,
    draft: false,
  })
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<{
    number: number
    url: string
  } | null>(null)

  const createPR = useCreatePullRequest()
  const { data: branches, isLoading: branchesLoading } =
    useGitHubBranches(repository)

  // Auto-generate title when branch changes
  React.useEffect(() => {
    if (defaultHead) {
      setFormData(prev => ({
        ...prev,
        head: defaultHead,
        title: prev.title || generateTitleFromBranch(defaultHead),
      }))
    }
  }, [defaultHead])

  // Generate title when head branch is selected
  const handleBranchChange = (branch: string) => {
    setFormData(prev => ({
      ...prev,
      head: branch,
      title: prev.title || generateTitleFromBranch(branch),
    }))
  }

  // Apply template
  const applyTemplate = () => {
    setFormData(prev => ({ ...prev, body: PR_TEMPLATE }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!formData.title.trim()) {
      setError('Title is required')
      return
    }

    if (!formData.head) {
      setError('Source branch is required')
      return
    }

    if (formData.head === formData.base) {
      setError('Source and target branches must be different')
      return
    }

    try {
      const result = await createPR.mutateAsync({
        repository,
        ...formData,
      })

      setSuccess({ number: result.number, url: result.html_url })
      onSuccess?.({ number: result.number, html_url: result.html_url })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create PR')
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    // Reset form after close animation
    setTimeout(() => {
      setFormData({
        title: '',
        body: PR_TEMPLATE,
        head: defaultHead,
        base: defaultBase,
        draft: false,
      })
      setError(null)
      setSuccess(null)
    }, 200)
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-background/80 backdrop-blur-sm',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%]',
            'gap-4 border bg-background p-6 shadow-lg duration-200',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
            'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
            'sm:rounded-lg'
          )}
        >
          <div className="flex flex-col space-y-1.5 text-center sm:text-left">
            <DialogPrimitive.Title className="flex items-center gap-2 text-lg font-semibold leading-none tracking-tight">
              <GitPullRequest className="h-5 w-5" />
              Create Pull Request
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="text-sm text-muted-foreground">
              Open a new pull request to merge changes
            </DialogPrimitive.Description>
          </div>

          {success ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 py-6">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
                <div className="text-center">
                  <p className="text-lg font-semibold">
                    Pull Request #{success.number} Created
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Your pull request has been created successfully
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button
                  onClick={() => window.open(success.url, '_blank')}
                  className="bg-green-600 hover:bg-green-700"
                >
                  View Pull Request
                </Button>
                <Button variant="outline" onClick={handleClose}>
                  Close
                </Button>
              </div>
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label
                  htmlFor="head"
                  className="text-sm font-medium leading-none"
                >
                  Source branch
                </label>
                <select
                  id="head"
                  value={formData.head}
                  onChange={e => handleBranchChange(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  disabled={branchesLoading}
                >
                  <option value="">Select branch...</option>
                  {branches?.map(branch => (
                    <option key={branch.name} value={branch.name}>
                      {branch.name}
                      {branch.protected ? ' (protected)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="base"
                  className="text-sm font-medium leading-none"
                >
                  Target branch
                </label>
                <select
                  id="base"
                  value={formData.base}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, base: e.target.value }))
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  disabled={branchesLoading}
                >
                  <option value="">Select branch...</option>
                  {branches?.map(branch => (
                    <option key={branch.name} value={branch.name}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="title"
                className="text-sm font-medium leading-none"
              >
                Title
              </label>
              <input
                id="title"
                type="text"
                value={formData.title}
                onChange={e =>
                  setFormData(prev => ({ ...prev, title: e.target.value }))
                }
                placeholder="Enter pull request title..."
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="body"
                  className="text-sm font-medium leading-none"
                >
                  Description
                </label>
                <button
                  type="button"
                  onClick={applyTemplate}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                >
                  <FileText className="h-3 w-3" />
                  Use template
                </button>
              </div>
              <textarea
                id="body"
                value={formData.body}
                onChange={e =>
                  setFormData(prev => ({ ...prev, body: e.target.value }))
                }
                placeholder="Describe your changes..."
                rows={6}
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="draft"
                checked={formData.draft}
                onChange={e =>
                  setFormData(prev => ({ ...prev, draft: e.target.checked }))
                }
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label htmlFor="draft" className="text-sm text-muted-foreground">
                Create as draft pull request
              </label>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createPR.isPending}>
                {createPR.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Pull Request
              </Button>
            </div>
          </form>
          )}

          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export default CreatePullRequestModal
