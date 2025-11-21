import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X, GitPullRequest, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import {
  useCreatePullRequest,
  useGitHubBranches,
  type CreatePullRequestParams,
} from '@/hooks/useGitHubIntegration'

interface CreatePullRequestModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  repository?: string
  defaultHead?: string
  defaultBase?: string
  onSuccess?: (pr: { number: number; html_url: string }) => void
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
    body: '',
    head: defaultHead,
    base: defaultBase,
    draft: false,
  })
  const [error, setError] = React.useState<string | null>(null)

  const createPR = useCreatePullRequest()
  const { data: branches, isLoading: branchesLoading } =
    useGitHubBranches(repository)

  React.useEffect(() => {
    if (defaultHead) {
      setFormData(prev => ({ ...prev, head: defaultHead }))
    }
  }, [defaultHead])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

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

      onSuccess?.({ number: result.number, html_url: result.html_url })
      onOpenChange(false)

      // Reset form
      setFormData({
        title: '',
        body: '',
        head: defaultHead,
        base: defaultBase,
        draft: false,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create PR')
    }
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
                  onChange={e =>
                    setFormData(prev => ({ ...prev, head: e.target.value }))
                  }
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
              <label
                htmlFor="body"
                className="text-sm font-medium leading-none"
              >
                Description
              </label>
              <textarea
                id="body"
                value={formData.body}
                onChange={e =>
                  setFormData(prev => ({ ...prev, body: e.target.value }))
                }
                placeholder="Describe your changes..."
                rows={4}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
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
                onClick={() => onOpenChange(false)}
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
