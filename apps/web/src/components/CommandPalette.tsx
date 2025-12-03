import React, { useEffect, useState } from 'react'
import { Command } from 'cmdk'
import { useNavigate } from 'react-router-dom'
import {
  Calculator,
  Calendar,
  CreditCard,
  Settings,
  Smile,
  User,
  Search,
  LayoutDashboard,
  FileText,
  Network,
  Activity,
  Map as MapIcon,
  Shield,
  HelpCircle
} from 'lucide-react'
import { useHotkeys } from 'react-hotkeys-hook'
import { useAuth } from '@/contexts/AuthContext'

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { user } = useAuth()

  // Toggle the menu when ⌘K is pressed
  useHotkeys(['meta+k', 'ctrl+k'], (e) => {
    e.preventDefault()
    setOpen((open) => !open)
  })

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false)
    command()
  }, [])

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Global Command Menu"
      className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-popover text-popover-foreground rounded-xl shadow-2xl border w-[640px] max-w-[90vw] overflow-hidden z-50 p-0"
    >
      <div className="flex items-center border-b px-3">
        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
        <Command.Input
          placeholder="Type a command or search..."
          className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-none focus:ring-0"
        />
      </div>

      <Command.List className="max-h-[300px] overflow-y-auto p-2">
        <Command.Empty className="py-6 text-center text-sm">No results found.</Command.Empty>

        <Command.Group heading="Navigation" className="text-xs font-medium text-muted-foreground px-2 py-1.5">
          <Command.Item
            onSelect={() => runCommand(() => navigate('/'))}
            className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
          >
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Home</span>
          </Command.Item>

          <Command.Item
            onSelect={() => runCommand(() => navigate('/explore'))}
            className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground"
          >
            <Search className="mr-2 h-4 w-4" />
            <span>Explore</span>
          </Command.Item>

          <Command.Item
            onSelect={() => runCommand(() => navigate('/analysis/tri-pane'))}
            className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground"
          >
            <Activity className="mr-2 h-4 w-4" />
            <span>Investigation (Tri-Pane)</span>
          </Command.Item>

          <Command.Item
            onSelect={() => runCommand(() => navigate('/cases'))}
            className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground"
          >
            <FileText className="mr-2 h-4 w-4" />
            <span>Cases</span>
          </Command.Item>

          <Command.Item
            onSelect={() => runCommand(() => navigate('/alerts'))}
            className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground"
          >
            <Shield className="mr-2 h-4 w-4" />
            <span>Alerts</span>
          </Command.Item>
        </Command.Group>

        <Command.Group heading="Investigation" className="text-xs font-medium text-muted-foreground px-2 py-1.5">
           <Command.Item
            onSelect={() => runCommand(() => navigate('/analysis/tri-pane'))}
            className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground"
          >
            <Network className="mr-2 h-4 w-4" />
            <span>Open Graph View</span>
          </Command.Item>
           <Command.Item
            onSelect={() => runCommand(() => navigate('/analysis/tri-pane'))}
            className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground"
          >
            <MapIcon className="mr-2 h-4 w-4" />
            <span>Open Map View</span>
          </Command.Item>
        </Command.Group>

        <Command.Group heading="System" className="text-xs font-medium text-muted-foreground px-2 py-1.5">
          <Command.Item
             onSelect={() => runCommand(() => navigate('/help'))}
             className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground"
          >
            <HelpCircle className="mr-2 h-4 w-4" />
            <span>Help</span>
          </Command.Item>

          <Command.Item
             onSelect={() => runCommand(() => navigate('/admin/settings'))}
             className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground"
          >
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </Command.Item>
        </Command.Group>
      </Command.List>

      <div className="border-t p-2 text-xs text-muted-foreground flex items-center justify-between px-4">
        <span>Use arrow keys to navigate</span>
        <div className="flex gap-1">
          <span className="bg-muted px-1 rounded">esc</span> to close
        </div>
      </div>
    </Command.Dialog>
  )
}
