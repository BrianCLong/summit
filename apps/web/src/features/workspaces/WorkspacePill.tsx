import React from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useWorkspaceLayout } from './WorkspaceProvider'

export function WorkspacePill() {
  const {
    activeWorkspace,
    workspaces,
    switchWorkspace,
    setSettingsOpen,
    isEnabled,
  } = useWorkspaceLayout()

  if (!isEnabled || !activeWorkspace) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full gap-2"
          data-testid="workspace-pill"
          aria-label="Workspace switcher"
        >
          <Badge variant="secondary" className="rounded-full">
            Workspace
          </Badge>
          <span className="text-sm font-medium">{activeWorkspace.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[220px]">
        <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wide">
          Modes
        </DropdownMenuLabel>
        {workspaces.map(workspace => (
          <DropdownMenuItem
            key={workspace.id}
            className="flex-col items-start gap-0.5 py-2"
            data-workspace-option={workspace.id}
            onSelect={() => switchWorkspace(workspace.id)}
          >
            <div className="flex w-full items-center justify-between">
              <span className="font-medium text-sm">{workspace.label}</span>
              {workspace.id === activeWorkspace.id && (
                <Badge variant="outline" className="text-[10px]">
                  Active
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {workspace.description}
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => setSettingsOpen(true)}
          className="justify-between"
          data-testid="workspace-settings-entry"
        >
          Settings
          <Badge variant="secondary" className="text-[10px]">
            Layout
          </Badge>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
