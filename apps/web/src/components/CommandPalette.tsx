import * as React from 'react'
import { Command } from 'cmdk'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  FileText,
  CheckSquare,
  Play,
  Receipt,
  X,
  Loader2
} from 'lucide-react'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate()
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [open, onOpenChange])

  const runCommand = (command: () => void) => {
    // onOpenChange(false) // Don't close immediately if we want to show loading/status
    command()
  }

  const handleRunRunbook = async () => {
    setLoading(true)
    // Simulate preflight check
    await new Promise(resolve => setTimeout(resolve, 800))
    setLoading(false)
    onOpenChange(false)
    alert("Runbook Execution: Allowed by Policy. Starting sequence...")
    navigate('/maestro') // Navigate to where runbooks live
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/50 backdrop-blur-sm transition-all" onClick={() => onOpenChange(false)}>
      <div
        className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <Command className="w-full">
          <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
            {loading ? <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" /> : <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />}
            <Command.Input
              placeholder="Type a command or search..."
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              autoFocus
              disabled={loading}
            />
            <button onClick={() => onOpenChange(false)} className="ml-2 opacity-50 hover:opacity-100">
               <X className="h-4 w-4" />
            </button>
          </div>
          <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2">
            <Command.Empty className="py-6 text-center text-sm">No results found.</Command.Empty>

            {!loading && (
              <>
            <Command.Group heading="Navigation">
              <Command.Item
                onSelect={() => runCommand(() => { onOpenChange(false); navigate('/explore'); })}
                className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-zinc-100 dark:aria-selected:bg-zinc-800 data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
              >
                <Search className="mr-2 h-4 w-4" />
                <span>Search Entities</span>
              </Command.Item>
              <Command.Item
                 onSelect={() => runCommand(() => { onOpenChange(false); navigate('/receipts/latest'); })}
                 className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-zinc-100 dark:aria-selected:bg-zinc-800 data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
              >
                <Receipt className="mr-2 h-4 w-4" />
                <span>View Latest Receipt</span>
              </Command.Item>
            </Command.Group>

            <Command.Group heading="Actions">
              <Command.Item
                onSelect={() => runCommand(() => { onOpenChange(false); navigate('/approvals?create=true'); })}
                className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-zinc-100 dark:aria-selected:bg-zinc-800 data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
              >
                <CheckSquare className="mr-2 h-4 w-4" />
                <span>Create Approval Request</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(handleRunRunbook)}
                className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-zinc-100 dark:aria-selected:bg-zinc-800 data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
              >
                <Play className="mr-2 h-4 w-4" />
                <span>Run Runbook Step (Policy Gated)</span>
              </Command.Item>
            </Command.Group>

            <Command.Group heading="Entities">
               <Command.Item
                  onSelect={() => runCommand(() => { onOpenChange(false); navigate('/cases/CASE-123'); })}
                  className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-zinc-100 dark:aria-selected:bg-zinc-800 data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  <span>CASE-123: Suspicious Activity</span>
               </Command.Item>
            </Command.Group>
            </>
            )}
          </Command.List>
        </Command>
      </div>
    </div>
  )
}
