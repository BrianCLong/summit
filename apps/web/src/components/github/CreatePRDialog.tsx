// apps/web/src/components/github/CreatePRDialog.tsx

import * as React from 'react'
import { useState } from 'react'
import { GitPullRequest, Loader2, ExternalLink } from 'lucide-react'

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerTrigger,
} from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import {
  useCreatePullRequest,
  useGitHubBranches,
} from '@/hooks/useGitHubIntegration'

interface CreatePRDialogProps {
  repository: string
  defaultHead?: string
  defaultBase?: string
  trigger?: React.ReactNode
  onSuccess?: (pr: { number: number; htmlUrl: string }) => void
}

export const CreatePRDialog: React.FC<CreatePRDialogProps> = ({
  repository,
  defaultHead = '',
  defaultBase = 'main',
  trigger,
  onSuccess,
}) => {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [head, setHead] = useState(defaultHead)
  const [base, setBase] = useState(defaultBase)
  const [draft, setDraft] = useState(false)
  const [createdPR, setCreatedPR] = useState<{
    number: number
    htmlUrl: string
  } | null>(null)

  const createPR = useCreatePullRequest()
  const { data: branches, isLoading: branchesLoading } =
    useGitHubBranches(repository)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const result = await createPR.mutateAsync({
        title,
        body,
        head,
        base,
        draft,
        repository,
      })

      setCreatedPR({ number: result.number, htmlUrl: result.htmlUrl })
      onSuccess?.({ number: result.number, htmlUrl: result.htmlUrl })
    } catch (error) {
      // Error handled by mutation state
    }
  }

  const handleClose = () => {
    setOpen(false)
    // Reset form after animation
    setTimeout(() => {
      setTitle('')
      setBody('')
      setHead(defaultHead)
      setBase(defaultBase)
      setDraft(false)
      setCreatedPR(null)
      createPR.reset()
    }, 300)
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      handleClose()
    } else {
      setOpen(true)
    }
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerTrigger asChild>
        {trigger || (
          <Button variant="default">
            <GitPullRequest className="mr-2 h-4 w-4" />
            Create Pull Request
          </Button>
        )}
      </DrawerTrigger>
      <DrawerContent side="right" className="sm:max-w-md">
        <DrawerHeader>
          <DrawerTitle>Create Pull Request</DrawerTitle>
          <DrawerDescription>
            Create a new pull request for {repository}
          </DrawerDescription>
        </DrawerHeader>

        {createdPR ? (
          <div className="flex flex-col items-center justify-center gap-4 py-8">
            <div className="rounded-full bg-green-100 p-3">
              <GitPullRequest className="h-8 w-8 text-green-600" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold">
                PR #{createdPR.number} Created
              </h3>
              <p className="text-sm text-muted-foreground">
                Your pull request has been created successfully.
              </p>
            </div>
            <a
              href={createdPR.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary hover:underline"
            >
              View on GitHub <ExternalLink className="h-4 w-4" />
            </a>
            <Button variant="outline" onClick={handleClose} className="mt-4">
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="feat: add new feature"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Description</Label>
              <Textarea
                id="body"
                placeholder="Describe the changes in this PR..."
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={5}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="head">Source Branch</Label>
                <select
                  id="head"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={head}
                  onChange={e => setHead(e.target.value)}
                  required
                  disabled={branchesLoading}
                >
                  <option value="">Select branch</option>
                  {branches?.map(b => (
                    <option key={b.name} value={b.name}>
                      {b.name}
                      {b.protected ? ' (protected)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="base">Target Branch</Label>
                <select
                  id="base"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={base}
                  onChange={e => setBase(e.target.value)}
                  required
                  disabled={branchesLoading}
                >
                  {branches?.map(b => (
                    <option key={b.name} value={b.name}>
                      {b.name}
                      {b.protected ? ' (protected)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="draft"
                checked={draft}
                onChange={e => setDraft(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="draft" className="cursor-pointer">
                Create as draft PR
              </Label>
            </div>

            {createPR.error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                {createPR.error.message}
              </div>
            )}

            <DrawerFooter className="px-0">
              <Button
                type="submit"
                disabled={createPR.isPending || !title || !head || !base}
              >
                {createPR.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Pull Request
              </Button>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
            </DrawerFooter>
          </form>
        )}
      </DrawerContent>
    </Drawer>
  )
}

export default CreatePRDialog
