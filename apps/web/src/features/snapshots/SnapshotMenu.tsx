import React, { useState } from 'react'
import { useSnapshotStore } from './store'
import { useSnapshotContext } from './SnapshotContext'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/DropdownMenu'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Camera, Save, Trash2, RotateCcw } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog'

export function SnapshotMenu() {
  const { snapshots, addSnapshot, removeSnapshot, renameSnapshot } = useSnapshotStore()
  const { captureAll, restoreAll } = useSnapshotContext()
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false)
  const [newSnapshotName, setNewSnapshotName] = useState('')

  const handleSave = () => {
    const data = captureAll()
    // Check if we captured anything useful (optional validation)
    if (Object.keys(data).length === 0) {
      console.warn('Snapshot captured empty state.')
    }
    addSnapshot(newSnapshotName || `Snapshot ${new Date().toLocaleString()}`, data)
    setNewSnapshotName('')
    setIsSaveDialogOpen(false)
  }

  const handleRestore = (snapshot: any) => {
    restoreAll(snapshot.data)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 px-0">
            <Camera className="h-4 w-4" />
            <span className="sr-only">Snapshots</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Workspace Snapshots</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setIsSaveDialogOpen(true)}>
            <Save className="mr-2 h-4 w-4" />
            <span>Save Current View...</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {snapshots.length === 0 && (
            <div className="p-2 text-xs text-muted-foreground text-center">
              No saved snapshots
            </div>
          )}
          {snapshots.map((s) => (
            <div key={s.id} className="flex items-center justify-between px-2 py-1 hover:bg-accent rounded-sm group">
              <button
                className="flex-1 text-left text-sm truncate mr-2"
                onClick={() => handleRestore(s)}
              >
                {s.name}
              </button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation()
                  removeSnapshot(s.id)
                }}
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Workspace Snapshot</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Snapshot Name (e.g. Investigation A)"
              value={newSnapshotName}
              onChange={(e) => setNewSnapshotName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
