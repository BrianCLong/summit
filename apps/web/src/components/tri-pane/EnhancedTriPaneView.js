"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnhancedTriPaneView = EnhancedTriPaneView;
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
const react_1 = __importStar(require("react"));
const Card_1 = require("@/components/ui/Card");
const Badge_1 = require("@/components/ui/Badge");
const Button_1 = require("@/components/ui/Button");
const Tooltip_1 = require("@/components/ui/Tooltip");
const Kbd_1 = require("@/components/ui/Kbd");
const TimelineRail_1 = require("@/components/panels/TimelineRail");
const GraphCanvas_1 = require("@/graphs/GraphCanvas");
const ExplainViewSidebar_1 = require("@/features/explain/ExplainViewSidebar");
const MapView_1 = require("@/features/geospatial/MapView");
const hooks_1 = require("@/store/hooks");
const explainSlice_1 = require("@/features/explain/explainSlice");
const lucide_react_1 = require("lucide-react");
function EnhancedTriPaneView({ entities, relationships, timelineEvents, geospatialEvents, onEntitySelect, onTimeRangeChange, onExport, className, }) {
    const explainState = (0, hooks_1.useAppSelector)(explainSlice_1.selectExplain);
    const [viewportSync, setViewportSync] = (0, react_1.useState)({
        timeline: {},
        map: {},
        graph: {},
    });
    const [timeFilter, setTimeFilter] = (0, react_1.useState)(null);
    const [timeBrush, setTimeBrush] = (0, react_1.useState)(null);
    const [showProvenance, setShowProvenance] = (0, react_1.useState)(true);
    const [showXAI, setShowXAI] = (0, react_1.useState)(true);
    const [graphLayout] = (0, react_1.useState)({ type: 'force', options: {} });
    const [focusedPane, setFocusedPane] = (0, react_1.useState)(null);
    // Calculate active filters for Explain sidebar
    const activeFilters = (0, react_1.useMemo)(() => {
        return {
            entityTypes: Array.from(new Set(entities.map(e => e.type))),
            timeRange: timeFilter || undefined,
            confidenceThreshold: 0.5, // This could come from filter state
        };
    }, [entities, timeFilter]);
    // Filter data based on time range
    const filteredData = (0, react_1.useMemo)(() => {
        if (!timeFilter) {
            return {
                entities,
                relationships,
                timelineEvents,
                geospatialEvents,
            };
        }
        const filteredTimelineEvents = timelineEvents.filter(event => {
            const eventTime = new Date(event.timestamp);
            return eventTime >= timeFilter.start && eventTime <= timeFilter.end;
        });
        const filteredGeospatialEvents = geospatialEvents.filter(event => {
            const eventTime = new Date(event.timestamp);
            return eventTime >= timeFilter.start && eventTime <= timeFilter.end;
        });
        const relevantEntityIds = new Set([
            ...filteredTimelineEvents.map(e => e.entityId).filter(Boolean),
        ]);
        const filteredEntities = entities.filter(entity => relevantEntityIds.has(entity.id) ||
            (entity.updatedAt &&
                new Date(entity.updatedAt) >= timeFilter.start &&
                new Date(entity.updatedAt) <= timeFilter.end));
        const filteredEntityIds = new Set(filteredEntities.map(e => e.id));
        const filteredRelationships = relationships.filter(rel => filteredEntityIds.has(rel.sourceId) &&
            filteredEntityIds.has(rel.targetId));
        return {
            entities: filteredEntities,
            relationships: filteredRelationships,
            timelineEvents: filteredTimelineEvents,
            geospatialEvents: filteredGeospatialEvents,
        };
    }, [entities, relationships, timelineEvents, geospatialEvents, timeFilter]);
    // Calculate time histogram for brushing
    const timeHistogram = (0, react_1.useMemo)(() => {
        const buckets = new Map();
        timelineEvents.forEach(event => {
            const date = new Date(event.timestamp).toDateString();
            buckets.set(date, (buckets.get(date) || 0) + 1);
        });
        return buckets;
    }, [timelineEvents]);
    // Handle time range change from timeline
    const handleTimeRangeChange = (0, react_1.useCallback)((range) => {
        const timeRange = {
            start: new Date(range.start),
            end: new Date(range.end),
        };
        setTimeFilter(timeRange);
        setTimeBrush({ ...timeRange, active: true });
        setViewportSync(prev => ({
            ...prev,
            timeline: { ...prev.timeline, timeRange },
        }));
        onTimeRangeChange?.(timeRange);
    }, [onTimeRangeChange]);
    // Handle entity selection with XAI context
    const handleEntitySelect = (0, react_1.useCallback)((entity) => {
        // Calculate why this entity is important (XAI)
        const connections = relationships.filter(r => r.sourceId === entity.id || r.targetId === entity.id);
        setViewportSync(prev => ({
            ...prev,
            graph: {
                ...prev.graph,
                selectedEntityId: entity.id,
                focusedEntityIds: [
                    entity.id,
                    ...connections.map(r => r.sourceId === entity.id ? r.targetId : r.sourceId),
                ],
            },
            timeline: { ...prev.timeline, selectedEventId: undefined },
            map: {
                ...prev.map,
                selectedLocationId: entity.type === 'LOCATION' ? entity.id : undefined,
            },
        }));
        onEntitySelect?.(entity);
    }, [relationships, onEntitySelect]);
    // Handle timeline event selection
    const handleTimelineEventSelect = (0, react_1.useCallback)((event) => {
        if (event.entityId) {
            const entity = entities.find(e => e.id === event.entityId);
            if (entity) {
                handleEntitySelect(entity);
            }
        }
        setViewportSync(prev => ({
            ...prev,
            timeline: { ...prev.timeline, selectedEventId: event.id },
        }));
    }, [entities, handleEntitySelect]);
    // Handle map location selection
    const handleMapLocationSelect = (0, react_1.useCallback)((locationId) => {
        const entity = entities.find(e => e.id === locationId && e.type === 'LOCATION');
        if (entity) {
            handleEntitySelect(entity);
        }
    }, [entities, handleEntitySelect]);
    // Keyboard navigation
    (0, react_1.useEffect)(() => {
        const handleKeyDown = (e) => {
            // Cmd/Ctrl + 1/2/3 to focus panes
            if ((e.metaKey || e.ctrlKey) && e.key >= '1' && e.key <= '3') {
                e.preventDefault();
                const panes = ['timeline', 'graph', 'map'];
                setFocusedPane(panes[parseInt(e.key) - 1]);
            }
            // Escape to clear focus
            if (e.key === 'Escape') {
                setFocusedPane(null);
            }
            // P to toggle provenance
            if (e.key === 'p' || e.key === 'P') {
                setShowProvenance(prev => !prev);
            }
            // X to toggle XAI overlays
            if (e.key === 'x' || e.key === 'X') {
                setShowXAI(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);
    const sidebarWidth = explainState.open ? 'calc(100% - 24rem)' : '100%';
    return (<div className={`relative h-full transition-all duration-300 ${className}`} style={{ width: sidebarWidth }}>
      <div className="grid grid-cols-12 grid-rows-12 gap-4 h-full">
        {/* Header Controls */}
        <div className="col-span-12 row-span-1 flex items-center justify-between bg-background border rounded-lg p-3">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold flex items-center gap-2" id="tri-pane-title">
              <lucide_react_1.Layers className="h-5 w-5"/>
              Enhanced Tri-Pane Analysis
            </h1>

            <div className="flex items-center gap-2" role="status" aria-live="polite">
              <Badge_1.Badge variant="outline" className="flex items-center gap-1">
                <lucide_react_1.Network className="h-3 w-3"/>
                {filteredData.entities.length} entities
              </Badge_1.Badge>
              <Badge_1.Badge variant="outline" className="flex items-center gap-1">
                <lucide_react_1.Clock className="h-3 w-3"/>
                {filteredData.timelineEvents.length} events
              </Badge_1.Badge>
              <Badge_1.Badge variant="outline" className="flex items-center gap-1">
                <lucide_react_1.MapPin className="h-3 w-3"/>
                {filteredData.geospatialEvents.length} locations
              </Badge_1.Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Tooltip_1.Tooltip content="Toggle provenance overlays (P)">
              <Button_1.Button variant="outline" size="sm" onClick={() => setShowProvenance(!showProvenance)} aria-label="Toggle provenance" aria-pressed={showProvenance}>
                {showProvenance ? (<lucide_react_1.Eye className="h-4 w-4"/>) : (<lucide_react_1.EyeOff className="h-4 w-4"/>)}
                Provenance
              </Button_1.Button>
            </Tooltip_1.Tooltip>

            <Tooltip_1.Tooltip content="Toggle XAI overlays (X)">
              <Button_1.Button variant="outline" size="sm" onClick={() => setShowXAI(!showXAI)} aria-label="Toggle XAI overlays" aria-pressed={showXAI}>
                {showXAI ? (<lucide_react_1.Eye className="h-4 w-4"/>) : (<lucide_react_1.EyeOff className="h-4 w-4"/>)}
                XAI
              </Button_1.Button>
            </Tooltip_1.Tooltip>

            <Tooltip_1.Tooltip content="Clear time filter">
              <Button_1.Button variant="outline" size="sm" onClick={() => {
            setTimeFilter(null);
            setTimeBrush(null);
        }} disabled={!timeFilter} aria-label="Reset time filter">
                <lucide_react_1.RefreshCw className="h-4 w-4"/>
                Reset
              </Button_1.Button>
            </Tooltip_1.Tooltip>

            <Tooltip_1.Tooltip content="Export current view">
              <Button_1.Button variant="outline" size="sm" onClick={onExport} aria-label="Export view">
                <lucide_react_1.Download className="h-4 w-4"/>
                Export
              </Button_1.Button>
            </Tooltip_1.Tooltip>
          </div>
        </div>

        {/* Timeline Panel (⌘1) */}
        <div className={`col-span-4 row-span-11 transition-all ${focusedPane === 'timeline'
            ? 'ring-2 ring-primary shadow-lg z-10'
            : ''}`}>
          <Card_1.Card className="h-full" tabIndex={0} role="region" aria-labelledby="timeline-title">
            <Card_1.CardHeader className="pb-3">
              <Card_1.CardTitle className="flex items-center gap-2 text-sm" id="timeline-title">
                <lucide_react_1.Clock className="h-4 w-4"/>
                Timeline
                <Kbd_1.Kbd keys={['mod', '1']} className="ml-auto"/>
                {timeFilter && (<Badge_1.Badge variant="secondary" className="text-xs">
                    Filtered
                  </Badge_1.Badge>)}
              </Card_1.CardTitle>
            </Card_1.CardHeader>
            <Card_1.CardContent className="p-0 h-[calc(100%-4rem)]">
              {/* Time Histogram for Brushing */}
              {timeBrush && (<div className="px-4 py-2 bg-accent border-b">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Time Brush Active</span>
                    <span className="font-medium">
                      {timeBrush.start.toLocaleDateString()} -{' '}
                      {timeBrush.end.toLocaleDateString()}
                    </span>
                  </div>
                  <div className="mt-2 flex gap-1 h-8">
                    {Array.from(timeHistogram.entries()).map(([date, count]) => {
                const maxCount = Math.max(...timeHistogram.values());
                const height = (count / maxCount) * 100;
                return (<div key={date} className="flex-1 bg-primary/20 hover:bg-primary/40 cursor-pointer transition-colors" style={{ height: `${height}%`, alignSelf: 'flex-end' }} title={`${date}: ${count} events`}/>);
            })}
                  </div>
                </div>)}

              <TimelineRail_1.TimelineRail data={filteredData.timelineEvents} onTimeRangeChange={handleTimeRangeChange} onEventSelect={handleTimelineEventSelect} selectedEventId={viewportSync.timeline.selectedEventId} className="border-0"/>
            </Card_1.CardContent>
          </Card_1.Card>
        </div>

        {/* Graph Panel (⌘2) */}
        <div className={`col-span-5 row-span-11 transition-all ${focusedPane === 'graph' ? 'ring-2 ring-primary shadow-lg z-10' : ''}`}>
          <Card_1.Card className="h-full" tabIndex={0} role="region" aria-labelledby="graph-title">
            <Card_1.CardHeader className="pb-3">
              <Card_1.CardTitle className="flex items-center gap-2 text-sm" id="graph-title">
                <lucide_react_1.Network className="h-4 w-4"/>
                Entity Graph
                <Kbd_1.Kbd keys={['mod', '2']} className="ml-auto"/>
                {showProvenance && (<Badge_1.Badge variant="secondary" className="text-xs">
                    Provenance
                  </Badge_1.Badge>)}
                {showXAI && (<Badge_1.Badge variant="secondary" className="text-xs">
                    XAI
                  </Badge_1.Badge>)}
              </Card_1.CardTitle>
            </Card_1.CardHeader>
            <Card_1.CardContent className="p-0 h-[calc(100%-4rem)]">
              <div className="relative h-full">
                <GraphCanvas_1.GraphCanvas entities={filteredData.entities.map(entity => ({
            ...entity,
            confidence: showProvenance ? entity.confidence : 1.0,
        }))} relationships={filteredData.relationships} layout={graphLayout} onEntitySelect={handleEntitySelect} selectedEntityId={viewportSync.graph.selectedEntityId} className="h-full"/>

                {/* XAI Overlays */}
                {showXAI && viewportSync.graph.selectedEntityId && (<div className="absolute top-4 right-4 bg-background/95 backdrop-blur-sm border rounded-lg p-3 shadow-lg max-w-xs">
                    <div className="text-xs font-semibold mb-2">
                      Why is this entity important?
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      {(() => {
                const entity = filteredData.entities.find(e => e.id === viewportSync.graph.selectedEntityId);
                if (!entity)
                    return null;
                const connections = filteredData.relationships.filter(r => r.sourceId === entity.id || r.targetId === entity.id);
                return (<>
                            <div>• {connections.length} connections</div>
                            <div>
                              • {Math.round(entity.confidence * 100)}% confidence
                            </div>
                            <div>• Type: {entity.type}</div>
                            {connections.length > 5 && (<div>• High centrality in network</div>)}
                          </>);
            })()}
                    </div>
                  </div>)}
              </div>
            </Card_1.CardContent>
          </Card_1.Card>
        </div>

        {/* Map Panel (⌘3) */}
        <div className={`col-span-3 row-span-11 transition-all ${focusedPane === 'map' ? 'ring-2 ring-primary shadow-lg z-10' : ''}`}>
          <Card_1.Card className="h-full" tabIndex={0} role="region" aria-labelledby="map-title">
            <Card_1.CardHeader className="pb-3">
              <Card_1.CardTitle className="flex items-center gap-2 text-sm" id="map-title">
                <lucide_react_1.MapPin className="h-4 w-4"/>
                Geographic View
                <Kbd_1.Kbd keys={['mod', '3']} className="ml-auto"/>
              </Card_1.CardTitle>
            </Card_1.CardHeader>
            <Card_1.CardContent className="p-0 h-[calc(100%-4rem)]">
              <MapView_1.MapView geospatialEvents={filteredData.geospatialEvents} entities={filteredData.entities} onLocationSelect={handleMapLocationSelect} selectedLocationId={viewportSync.map.selectedLocationId} center={viewportSync.map.center} zoom={viewportSync.map.zoom} className="h-full rounded-lg"/>
            </Card_1.CardContent>
          </Card_1.Card>
        </div>

        {/* Sync Status Indicator */}
        {timeFilter && (<div className="fixed bottom-4 left-4 bg-primary text-primary-foreground px-3 py-2 rounded-lg shadow-lg text-sm flex items-center gap-2 z-30" role="status" aria-live="polite">
            <lucide_react_1.Filter className="h-4 w-4"/>
            Time filter: {timeFilter.start.toLocaleDateString()} -{' '}
            {timeFilter.end.toLocaleDateString()}
          </div>)}

        {/* Keyboard Shortcuts Help */}
        <div className="fixed bottom-4 right-4 bg-background border rounded-lg shadow-lg text-xs p-3 max-w-xs opacity-75 hover:opacity-100 transition-opacity" role="complementary" aria-label="Keyboard shortcuts">
          <div className="font-semibold mb-2">Keyboard Shortcuts</div>
          <div className="space-y-1 text-muted-foreground">
            <div className="flex items-center justify-between gap-4">
              <span>Focus pane</span>
              <Kbd_1.Kbd keys={['mod', '1-3']}/>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Provenance</span>
              <Kbd_1.Kbd keys="P"/>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>XAI</span>
              <Kbd_1.Kbd keys="X"/>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Clear focus</span>
              <Kbd_1.Kbd keys="Esc"/>
            </div>
          </div>
        </div>
      </div>

      {/* Explain View Sidebar */}
      <ExplainViewSidebar_1.ExplainViewSidebar entities={filteredData.entities} relationships={filteredData.relationships} activeFilters={activeFilters}/>
    </div>);
}
