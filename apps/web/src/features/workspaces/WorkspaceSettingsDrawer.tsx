import React, { useMemo } from 'react'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Switch } from '@/components/ui/Switch'
import { Slider } from '@/components/ui/Slider'
import { workspacePanelOrder } from './presets'
import { useWorkspaceLayout } from './WorkspaceProvider'
import type { WorkspacePanelKey } from './types'

export function WorkspaceSettingsDrawer() {
  const {
    activeWorkspace,
    updatePanel,
    resetWorkspace,
    switchWorkspace,
    settingsOpen,
    setSettingsOpen,
    isEnabled,
  } = useWorkspaceLayout()

  const panelEntries = useMemo(() => {
    if (!activeWorkspace) return []
    return workspacePanelOrder
      .filter(panelKey => activeWorkspace.panels[panelKey as WorkspacePanelKey])
      .map(panelKey => ({
        key: panelKey as WorkspacePanelKey,
        config: activeWorkspace.panels[panelKey as WorkspacePanelKey],
      }))
  }, [activeWorkspace])

  if (!isEnabled || !activeWorkspace) {
    return null
  }

  return (
    <Drawer open={settingsOpen} onOpenChange={setSettingsOpen}>
      <DrawerContent side="right" className="sm:max-w-lg">
        <DrawerHeader className="space-y-2">
          <DrawerTitle className="flex items-center justify-between">
            Workspace layout
            <Badge variant="secondary" className="text-[11px]">
              {activeWorkspace.label}
            </Badge>
          </DrawerTitle>
          <div className="text-sm text-muted-foreground">
            Preset layouts are stored locally per user. Toggle visibility or
            resize panes without losing in-progress edits.
          </div>
        </DrawerHeader>

        <div className="px-6 pb-6 space-y-6">
          <div className="space-y-4">
            {panelEntries.map(({ key, config }) => (
              <div
                key={key}
                className="flex items-center gap-4 justify-between border rounded-lg p-3"
                data-panel-config={key}
              >
                <div className="space-y-1">
                  <div className="font-medium capitalize">{key}</div>
                  <div className="text-xs text-muted-foreground">
                    {config.visible ? 'Visible' : 'Hidden'} · Weight {config.size}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">Size</span>
                    <Slider
                      min={1}
                      max={8}
                      step={1}
                      value={[config.size]}
                      onValueChange={([value]) =>
                        updatePanel(key, { size: value })
                      }
                    />
                  </div>
                </div>
                <Switch
                  checked={config.visible}
                  aria-label={`Toggle ${key} panel`}
                  onCheckedChange={checked =>
                    updatePanel(key, { visible: checked })
                  }
                />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              onClick={() => resetWorkspace()}
              data-testid="workspace-reset"
            >
              Reset workspace
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Default route:
              </span>
              <Badge variant="outline">{activeWorkspace.defaultRoute}</Badge>
            </div>
            <Button
              variant="outline"
              onClick={() =>
                switchWorkspace(activeWorkspace.id, {
                  applyRoute: true,
                  useDefaultRoute: true,
                })
              }
            >
              Go
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
