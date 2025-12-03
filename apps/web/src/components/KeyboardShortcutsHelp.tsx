import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { useKeyboardShortcuts, Shortcut } from '@/contexts/KeyboardShortcutsContext'
import { Badge } from '@/components/ui/Badge'
import { Command } from 'lucide-react'

export function KeyboardShortcutsHelp() {
  const { isHelpOpen, closeHelp, shortcuts } = useKeyboardShortcuts()

  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = []
    }
    acc[shortcut.category].push(shortcut)
    return acc
  }, {} as Record<string, Shortcut[]>)

  // Sort categories
  const categories = Object.keys(groupedShortcuts).sort()

  return (
    <Dialog open={isHelpOpen} onOpenChange={(open) => !open && closeHelp()}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Command className="w-5 h-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
          {categories.map((category) => (
            <div key={category} className="space-y-3">
              <h3 className="font-medium text-muted-foreground border-b pb-1">
                {category}
              </h3>
              <div className="space-y-2">
                {groupedShortcuts[category].map((shortcut) => (
                  <div
                    key={shortcut.id}
                    className="flex items-center justify-between gap-4"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((keyGroup, idx) => (
                        <div key={idx} className="flex gap-1">
                          {idx > 0 && <span className="text-muted-foreground text-xs mx-1">or</span>}
                          {keyGroup.split('+').map((key) => (
                            <Badge
                              key={key}
                              variant="secondary"
                              className="font-mono text-xs px-1.5 min-w-[20px] justify-center capitalize"
                            >
                              {key === 'mod' ? '⌘' : key === 'shift' ? '⇧' : key}
                            </Badge>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="space-y-3">
            <h3 className="font-medium text-muted-foreground border-b pb-1">
              General
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm">Show this help</span>
                <Badge variant="secondary" className="font-mono text-xs px-1.5 min-w-[20px] justify-center">
                  ?
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm">Command Palette</span>
                <div className="flex gap-1">
                  <Badge variant="secondary" className="font-mono text-xs px-1.5 min-w-[20px] justify-center">
                    ⌘
                  </Badge>
                  <Badge variant="secondary" className="font-mono text-xs px-1.5 min-w-[20px] justify-center">
                    K
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
