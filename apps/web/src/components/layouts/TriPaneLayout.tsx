import React, { useState, useCallback, useEffect } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { Maximize2, Minimize2, Grid3X3, Layers, Map as MapIcon, Clock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setActivePane, selectActivePane } from '@/features/viewSync/viewSyncSlice'

interface TriPaneLayoutProps {
  graphPane: React.ReactNode
  timelinePane: React.ReactNode
  mapPane: React.ReactNode
  explainPanel?: React.ReactNode
  className?: string
}

export function TriPaneLayout({
  graphPane,
  timelinePane,
  mapPane,
  explainPanel,
  className,
}: TriPaneLayoutProps) {
  const dispatch = useAppDispatch()
  const activePane = useAppSelector(selectActivePane)

  const [layout, setLayout] = useState<'default' | 'graph-focus' | 'timeline-focus' | 'map-focus'>('default')
  const [showExplain, setShowExplain] = useState(false)

  // Handle pane focus changes
  const handlePaneFocus = useCallback(
    (paneId: 'graph' | 'timeline' | 'map') => {
      dispatch(setActivePane(paneId))
    },
    [dispatch]
  )

  // Keyboard shortcuts for pane switching
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + 1/2/3 to switch panes
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey) {
        switch (e.key) {
          case '1':
            e.preventDefault()
            handlePaneFocus('graph')
            setLayout('graph-focus')
            break
          case '2':
            e.preventDefault()
            handlePaneFocus('timeline')
            setLayout('timeline-focus')
            break
          case '3':
            e.preventDefault()
            handlePaneFocus('map')
            setLayout('map-focus')
            break
          case '0':
            e.preventDefault()
            setLayout('default')
            dispatch(setActivePane(null))
            break
        }
      }

      // Cmd/Ctrl + E to toggle Explain panel
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault()
        setShowExplain(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [dispatch, handlePaneFocus])

  // Render layout based on current mode
  const renderLayout = () => {
    if (layout === 'graph-focus') {
      return (
        <div className="flex-1 flex">
          <div className="flex-1 relative">
            <PaneWrapper
              id="graph"
              title="Graph"
              icon={Grid3X3}
              isActive={activePane === 'graph'}
              onFocus={() => handlePaneFocus('graph')}
              onMaximize={() => setLayout('default')}
            >
              {graphPane}
            </PaneWrapper>
          </div>
          <div className="w-80 flex flex-col border-l">
            <div className="flex-1 border-b">
              <PaneWrapper
                id="timeline"
                title="Timeline"
                icon={Clock}
                isActive={activePane === 'timeline'}
                onFocus={() => handlePaneFocus('timeline')}
                onMaximize={() => setLayout('timeline-focus')}
                compact
              >
                {timelinePane}
              </PaneWrapper>
            </div>
            <div className="flex-1">
              <PaneWrapper
                id="map"
                title="Map"
                icon={MapIcon}
                isActive={activePane === 'map'}
                onFocus={() => handlePaneFocus('map')}
                onMaximize={() => setLayout('map-focus')}
                compact
              >
                {mapPane}
              </PaneWrapper>
            </div>
          </div>
        </div>
      )
    }

    if (layout === 'timeline-focus') {
      return (
        <div className="flex-1 flex">
          <div className="flex-1 relative">
            <PaneWrapper
              id="timeline"
              title="Timeline"
              icon={Clock}
              isActive={activePane === 'timeline'}
              onFocus={() => handlePaneFocus('timeline')}
              onMaximize={() => setLayout('default')}
            >
              {timelinePane}
            </PaneWrapper>
          </div>
          <div className="w-80 flex flex-col border-l">
            <div className="flex-1 border-b">
              <PaneWrapper
                id="graph"
                title="Graph"
                icon={Grid3X3}
                isActive={activePane === 'graph'}
                onFocus={() => handlePaneFocus('graph')}
                onMaximize={() => setLayout('graph-focus')}
                compact
              >
                {graphPane}
              </PaneWrapper>
            </div>
            <div className="flex-1">
              <PaneWrapper
                id="map"
                title="Map"
                icon={MapIcon}
                isActive={activePane === 'map'}
                onFocus={() => handlePaneFocus('map')}
                onMaximize={() => setLayout('map-focus')}
                compact
              >
                {mapPane}
              </PaneWrapper>
            </div>
          </div>
        </div>
      )
    }

    if (layout === 'map-focus') {
      return (
        <div className="flex-1 flex">
          <div className="flex-1 relative">
            <PaneWrapper
              id="map"
              title="Map"
              icon={MapIcon}
              isActive={activePane === 'map'}
              onFocus={() => handlePaneFocus('map')}
              onMaximize={() => setLayout('default')}
            >
              {mapPane}
            </PaneWrapper>
          </div>
          <div className="w-80 flex flex-col border-l">
            <div className="flex-1 border-b">
              <PaneWrapper
                id="graph"
                title="Graph"
                icon={Grid3X3}
                isActive={activePane === 'graph'}
                onFocus={() => handlePaneFocus('graph')}
                onMaximize={() => setLayout('graph-focus')}
                compact
              >
                {graphPane}
              </PaneWrapper>
            </div>
            <div className="flex-1">
              <PaneWrapper
                id="timeline"
                title="Timeline"
                icon={Clock}
                isActive={activePane === 'timeline'}
                onFocus={() => handlePaneFocus('timeline')}
                onMaximize={() => setLayout('timeline-focus')}
                compact
              >
                {timelinePane}
              </PaneWrapper>
            </div>
          </div>
        </div>
      )
    }

    // Default tri-pane layout
    return (
      <PanelGroup direction="horizontal" className="flex-1">
        {/* Graph pane - left, larger */}
        <Panel defaultSize={50} minSize={30}>
          <PaneWrapper
            id="graph"
            title="Graph"
            icon={Grid3X3}
            isActive={activePane === 'graph'}
            onFocus={() => handlePaneFocus('graph')}
            onMaximize={() => setLayout('graph-focus')}
          >
            {graphPane}
          </PaneWrapper>
        </Panel>

        <PanelResizeHandle className="w-1 bg-border hover:bg-primary/50 transition-colors" />

        {/* Timeline and Map - right, stacked */}
        <Panel defaultSize={50} minSize={30}>
          <PanelGroup direction="vertical">
            <Panel defaultSize={50} minSize={20}>
              <PaneWrapper
                id="timeline"
                title="Timeline"
                icon={Clock}
                isActive={activePane === 'timeline'}
                onFocus={() => handlePaneFocus('timeline')}
                onMaximize={() => setLayout('timeline-focus')}
              >
                {timelinePane}
              </PaneWrapper>
            </Panel>

            <PanelResizeHandle className="h-1 bg-border hover:bg-primary/50 transition-colors" />

            <Panel defaultSize={50} minSize={20}>
              <PaneWrapper
                id="map"
                title="Map"
                icon={MapIcon}
                isActive={activePane === 'map'}
                onFocus={() => handlePaneFocus('map')}
                onMaximize={() => setLayout('map-focus')}
              >
                {mapPane}
              </PaneWrapper>
            </Panel>
          </PanelGroup>
        </Panel>
      </PanelGroup>
    )
  }

  return (
    <div className={cn('h-full flex flex-col', className)}>
      {/* Layout controls */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-background">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLayout('default')}
            className={cn(layout === 'default' && 'bg-muted')}
            aria-label="Default layout"
          >
            <Layers className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLayout('graph-focus')}
            className={cn(layout === 'graph-focus' && 'bg-muted')}
            aria-label="Focus on graph"
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLayout('timeline-focus')}
            className={cn(layout === 'timeline-focus' && 'bg-muted')}
            aria-label="Focus on timeline"
          >
            <Clock className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLayout('map-focus')}
            className={cn(layout === 'map-focus' && 'bg-muted')}
            aria-label="Focus on map"
          >
            <MapIcon className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowExplain(!showExplain)}
            aria-label="Toggle explain panel"
            aria-pressed={showExplain}
          >
            Explain View {showExplain ? '✓' : ''}
          </Button>
          <div className="text-xs text-muted-foreground">
            <kbd className="px-1.5 py-0.5 text-xs border rounded bg-muted">⌘</kbd> +{' '}
            <kbd className="px-1.5 py-0.5 text-xs border rounded bg-muted">1-3</kbd> to focus
            panes
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {renderLayout()}

        {/* Explain panel - slides in from right */}
        {showExplain && explainPanel && (
          <div className="w-96 border-l overflow-y-auto bg-background">
            {explainPanel}
          </div>
        )}
      </div>
    </div>
  )
}

// Individual pane wrapper with header
interface PaneWrapperProps {
  id: string
  title: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  isActive: boolean
  onFocus: () => void
  onMaximize: () => void
  compact?: boolean
}

function PaneWrapper({
  id,
  title,
  icon: Icon,
  children,
  isActive,
  onFocus,
  onMaximize,
  compact = false,
}: PaneWrapperProps) {
  return (
    <div
      className={cn(
        'h-full flex flex-col',
        isActive && 'ring-2 ring-primary ring-inset'
      )}
      onClick={onFocus}
      role="region"
      aria-label={`${title} pane`}
      tabIndex={0}
      onFocus={onFocus}
    >
      {/* Pane header */}
      {!compact && (
        <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{title}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation()
              onMaximize()
            }}
            aria-label={`Maximize ${title}`}
          >
            <Maximize2 className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Pane content */}
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  )
}
