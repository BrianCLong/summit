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
exports.TriPaneAnalysisView = TriPaneAnalysisView;
const react_1 = __importStar(require("react"));
const Card_1 = require("@/components/ui/Card");
const Badge_1 = require("@/components/ui/Badge");
const Button_1 = require("@/components/ui/Button");
const Tooltip_1 = require("@/components/ui/Tooltip");
const TimelineRail_1 = require("@/components/panels/TimelineRail");
const GraphCanvas_1 = require("@/graphs/GraphCanvas");
const lucide_react_1 = require("lucide-react");
function TriPaneAnalysisView({ entities, relationships, timelineEvents, geospatialEvents, onEntitySelect, onTimeRangeChange, onExport, className, }) {
    const [viewportSync, setViewportSync] = (0, react_1.useState)({
        timeline: {},
        map: {},
        graph: {},
    });
    const [timeFilter, setTimeFilter] = (0, react_1.useState)(null);
    const [showProvenance, setShowProvenance] = (0, react_1.useState)(true);
    const [graphLayout] = (0, react_1.useState)({ type: 'force', settings: {} });
    const [provenanceData, setProvenanceData] = (0, react_1.useState)(new Map());
    // Mock provenance data - in real app this would come from the prov-ledger service
    (0, react_1.useEffect)(() => {
        const mockProvenance = new Map();
        entities.forEach(entity => {
            mockProvenance.set(entity.id, {
                sourceId: `src-${entity.id}`,
                sourceName: `Data Source ${entity.id.slice(0, 8)}`,
                transforms: [
                    {
                        id: `transform-${entity.id}`,
                        operation: 'Entity Resolution',
                        timestamp: new Date(Date.now() - Math.random() * 86400000),
                        confidence: 0.85 + Math.random() * 0.15,
                    },
                ],
                license: ['MIT', 'Apache-2.0', 'GPL-3.0'][Math.floor(Math.random() * 3)],
                lastSeen: new Date(Date.now() - Math.random() * 3600000),
                confidence: entity.confidence,
            });
        });
        setProvenanceData(mockProvenance);
    }, [entities]);
    // Calculate full time range of all events
    const fullTimeRange = (0, react_1.useMemo)(() => {
        if (timelineEvents.length === 0)
            return null;
        const timestamps = timelineEvents.map(e => new Date(e.timestamp).getTime());
        return {
            start: new Date(Math.min(...timestamps)),
            end: new Date(Math.max(...timestamps)),
        };
    }, [timelineEvents]);
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
        // Filter entities that appear in the filtered events
        const relevantEntityIds = new Set([
            ...filteredTimelineEvents.map(e => e.entityId).filter(Boolean),
            // GeospatialEvent doesn't have entityId, so we skip it
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
    // Handle time brushing - synchronize all panes when time range changes
    const handleTimeRangeChange = (0, react_1.useCallback)((range) => {
        const timeRange = {
            start: new Date(range.start),
            end: new Date(range.end),
        };
        setTimeFilter(timeRange);
        setViewportSync(prev => ({
            ...prev,
            timeline: { ...prev.timeline, timeRange },
        }));
        onTimeRangeChange?.(timeRange);
    }, [onTimeRangeChange]);
    const handleCurrentTimeChange = (0, react_1.useCallback)((time) => {
        if (!fullTimeRange)
            return;
        const newRange = {
            start: fullTimeRange.start,
            end: time,
        };
        setTimeFilter(newRange);
        setViewportSync(prev => ({
            ...prev,
            timeline: { ...prev.timeline, timeRange: newRange },
        }));
        onTimeRangeChange?.(newRange);
    }, [fullTimeRange, onTimeRangeChange]);
    // Handle entity selection - synchronize across all panes
    const handleEntitySelect = (0, react_1.useCallback)((entity) => {
        setViewportSync(prev => ({
            ...prev,
            graph: {
                ...prev.graph,
                selectedEntityId: entity.id,
                focusedEntityIds: [
                    entity.id,
                    ...relationships
                        .filter(r => r.sourceId === entity.id || r.targetId === entity.id)
                        .map(r => (r.sourceId === entity.id ? r.targetId : r.sourceId)),
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
    // Generate provenance tooltip content
    const getProvenanceTooltip = (0, react_1.useCallback)((entityId) => {
        const provenance = provenanceData.get(entityId);
        if (!provenance)
            return null;
        return (<div className="space-y-2 text-xs">
          <div>
            <strong>Source:</strong> {provenance.sourceName}
          </div>
          <div>
            <strong>License:</strong>
            <Badge_1.Badge variant="outline" className="ml-1 text-xs">
              {provenance.license}
            </Badge_1.Badge>
          </div>
          <div>
            <strong>Confidence:</strong>{' '}
            {Math.round(provenance.confidence * 100)}%
          </div>
          <div>
            <strong>Last Seen:</strong> {provenance.lastSeen.toLocaleString()}
          </div>
          <div>
            <strong>Transforms:</strong>
            {provenance.transforms.map(transform => (<div key={transform.id} className="ml-2 text-muted-foreground">
                • {transform.operation} (
                {Math.round(transform.confidence * 100)}%)
              </div>))}
          </div>
        </div>);
    }, [provenanceData]);
    // Performance optimization: debounced sync updates
    const [syncDebounceTimeout, setSyncDebounceTimeout] = (0, react_1.useState)(null);
    const debouncedSync = (0, react_1.useCallback)((syncUpdate) => {
        if (syncDebounceTimeout) {
            clearTimeout(syncDebounceTimeout);
        }
        const timeout = setTimeout(() => {
            setViewportSync(prev => ({
                timeline: { ...prev.timeline, ...syncUpdate.timeline },
                map: { ...prev.map, ...syncUpdate.map },
                graph: { ...prev.graph, ...syncUpdate.graph },
            }));
        }, 120); // 120ms debounce for smooth interaction
        setSyncDebounceTimeout(timeout);
    }, [syncDebounceTimeout]);
    return (<div className={`grid grid-cols-12 grid-rows-12 gap-4 h-full ${className}`}>
      {/* Header Controls */}
      <div className="col-span-12 row-span-1 flex items-center justify-between bg-background border rounded-lg p-3">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <lucide_react_1.Layers className="h-5 w-5"/>
            Tri-Pane Analysis
          </h1>

          <div className="flex items-center gap-2">
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
          <Button_1.Button variant="outline" size="sm" onClick={() => setShowProvenance(!showProvenance)}>
            {showProvenance ? (<lucide_react_1.Eye className="h-4 w-4"/>) : (<lucide_react_1.EyeOff className="h-4 w-4"/>)}
            Provenance
          </Button_1.Button>

          <Button_1.Button variant="outline" size="sm" onClick={() => setTimeFilter(null)} disabled={!timeFilter}>
            <lucide_react_1.RefreshCw className="h-4 w-4"/>
            Reset Filter
          </Button_1.Button>

          <Button_1.Button variant="outline" size="sm" onClick={onExport}>
            <lucide_react_1.Download className="h-4 w-4"/>
            Export
          </Button_1.Button>
        </div>
      </div>

      {/* Timeline Panel */}
      <div className="col-span-4 row-span-11">
        <Card_1.Card className="h-full">
          <Card_1.CardHeader className="pb-3">
            <Card_1.CardTitle className="flex items-center gap-2 text-sm">
              <lucide_react_1.Clock className="h-4 w-4"/>
              Timeline
              {timeFilter && (<Badge_1.Badge variant="secondary" className="text-xs">
                  Filtered
                </Badge_1.Badge>)}
            </Card_1.CardTitle>
          </Card_1.CardHeader>
          <Card_1.CardContent className="p-0 h-[calc(100%-4rem)]">
            <TimelineRail_1.TimelineRail data={timelineEvents} onTimeRangeChange={handleTimeRangeChange} onEventSelect={handleTimelineEventSelect} selectedEventId={viewportSync.timeline.selectedEventId} className="border-0" totalTimeRange={fullTimeRange || undefined} currentTime={timeFilter?.end || fullTimeRange?.end} onCurrentTimeChange={handleCurrentTimeChange}/>
          </Card_1.CardContent>
        </Card_1.Card>
      </div>

      {/* Graph Panel */}
      <div className="col-span-5 row-span-11">
        <Card_1.Card className="h-full">
          <Card_1.CardHeader className="pb-3">
            <Card_1.CardTitle className="flex items-center gap-2 text-sm">
              <lucide_react_1.Network className="h-4 w-4"/>
              Entity Graph
              {showProvenance && (<Badge_1.Badge variant="secondary" className="text-xs">
                  Provenance On
                </Badge_1.Badge>)}
            </Card_1.CardTitle>
          </Card_1.CardHeader>
          <Card_1.CardContent className="p-0 h-[calc(100%-4rem)]">
            <div className="relative h-full">
              <GraphCanvas_1.GraphCanvas entities={filteredData.entities.map(entity => ({
            ...entity,
            // Apply confidence-based opacity when provenance is shown
            confidence: showProvenance ? entity.confidence : 1.0,
        }))} relationships={filteredData.relationships} layout={graphLayout} onEntitySelect={handleEntitySelect} selectedEntityId={viewportSync.graph.selectedEntityId} className="h-full"/>

              {/* Provenance Tooltips Overlay */}
              {showProvenance &&
            filteredData.entities.map(entity => {
                const provenance = provenanceData.get(entity.id);
                if (!provenance)
                    return null;
                return (<Tooltip_1.Tooltip key={entity.id} content={getProvenanceTooltip(entity.id)}>
                      <div className="absolute w-2 h-2 bg-blue-500 rounded-full opacity-75 pointer-events-none" style={{
                        // Position would be calculated from graph coordinates
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                    }}/>
                    </Tooltip_1.Tooltip>);
            })}
            </div>
          </Card_1.CardContent>
        </Card_1.Card>
      </div>

      {/* Map Panel */}
      <div className="col-span-3 row-span-11">
        <Card_1.Card className="h-full">
          <Card_1.CardHeader className="pb-3">
            <Card_1.CardTitle className="flex items-center gap-2 text-sm">
              <lucide_react_1.MapPin className="h-4 w-4"/>
              Geographic View
            </Card_1.CardTitle>
          </Card_1.CardHeader>
          <Card_1.CardContent className="p-0 h-[calc(100%-4rem)]">
            <div className="h-full bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
              {/* Placeholder for map component */}
              <div className="text-center space-y-2">
                <lucide_react_1.Map className="h-12 w-12 mx-auto text-muted-foreground"/>
                <p className="text-sm text-muted-foreground">Map component</p>
                <p className="text-xs text-muted-foreground">
                  {filteredData.geospatialEvents.length} location events
                </p>
                {viewportSync.map.selectedLocationId && (<Badge_1.Badge variant="secondary" className="text-xs">
                    Selected: {viewportSync.map.selectedLocationId.slice(0, 8)}
                  </Badge_1.Badge>)}
              </div>
            </div>
          </Card_1.CardContent>
        </Card_1.Card>
      </div>

      {/* Sync Status Indicator */}
      {timeFilter && (<div className="fixed bottom-4 right-4 bg-primary text-primary-foreground px-3 py-2 rounded-lg shadow-lg text-sm flex items-center gap-2">
          <lucide_react_1.Filter className="h-4 w-4"/>
          Time filter active: {timeFilter.start.toLocaleString()} -{' '}
          {timeFilter.end.toLocaleString()}
        </div>)}
    </div>);
}
