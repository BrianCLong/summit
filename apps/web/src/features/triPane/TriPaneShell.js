"use strict";
/**
 * Tri-Pane Analysis Shell
 *
 * Main component that orchestrates the three synchronized panes:
 * - Graph: Entity relationship visualization
 * - Timeline: Temporal event tracking
 * - Map: Geographic event visualization
 *
 * This shell provides synchronized brushing and filtering across all panes,
 * with clear contracts for future teams to integrate real data sources.
 */
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TriPaneShell = TriPaneShell;
const react_1 = __importStar(require("react"));
const jquery_1 = __importDefault(require("jquery"));
const lucide_react_1 = require("lucide-react");
const utils_1 = require("@/lib/utils");
const Card_1 = require("@/components/ui/Card");
const Badge_1 = require("@/components/ui/Badge");
const Button_1 = require("@/components/ui/Button");
const GraphCanvas_1 = require("@/graphs/GraphCanvas");
const TimelineRail_1 = require("@/components/panels/TimelineRail");
const MapPane_1 = require("./MapPane");
const AnnotationPanel_1 = __importDefault(require("@/features/annotations/AnnotationPanel"));
const useCollaboration_1 = require("@/lib/yjs/useCollaboration");
const useGraphSync_1 = require("@/lib/yjs/useGraphSync");
const CollaborationPanel_1 = require("@/components/CollaborationPanel");
const CollaborativeCursors_1 = require("@/components/collaboration/CollaborativeCursors");
const AuthContext_1 = require("@/contexts/AuthContext");
const snapshots_1 = require("@/features/snapshots");
const config_1 = require("@/config");
const usePresenceChannel_1 = require("./usePresenceChannel");
const colors_1 = require("@/lib/utils/colors");
/**
 * Main TriPaneShell component
 */
function TriPaneShell({ entities, relationships, timelineEvents, geospatialEvents, initialSyncState, onEntitySelect, onEventSelect, onLocationSelect, onTimeWindowChange, onSyncStateChange, showProvenanceOverlay = false, className, onExport, }) {
    // Synchronized state across all panes
    const [syncState, setSyncState] = (0, react_1.useState)({
        graph: {
            layout: { type: 'force', settings: {} },
            ...initialSyncState?.graph,
        },
        timeline: {
            autoScroll: false,
            ...initialSyncState?.timeline,
        },
        map: {
            center: [0, 0],
            zoom: 2,
            ...initialSyncState?.map,
        },
        globalTimeWindow: initialSyncState?.globalTimeWindow,
    });
    const [showProvenance, setShowProvenance] = (0, react_1.useState)(showProvenanceOverlay);
    const [activePane, setActivePane] = (0, react_1.useState)('graph');
    const [pinnedTools, setPinnedTools] = (0, react_1.useState)([]);
    const [densityMode, setDensityMode] = (0, react_1.useState)('comfortable');
    const [annotationContext, setAnnotationContext] = (0, react_1.useState)({});
    const { user } = (0, AuthContext_1.useAuth)();
    const triPaneRef = (0, react_1.useRef)(null);
    const localUserId = user?.id || 'anon';
    const parsePresenceSelection = (0, react_1.useCallback)((selection) => {
        if (!selection)
            return null;
        try {
            const parsed = JSON.parse(selection);
            if (!parsed?.pane || !parsed?.id)
                return null;
            return parsed;
        }
        catch (error) {
            return null;
        }
    }, []);
    const hexToRgba = (0, react_1.useCallback)((hex, alpha) => {
        const normalized = hex.replace('#', '');
        const full = normalized.length === 3
            ? normalized
                .split('')
                .map((char) => `${char}${char}`)
                .join('')
            : normalized;
        const int = Number.parseInt(full, 16);
        if (Number.isNaN(int)) {
            return `rgba(59, 130, 246, ${alpha})`;
        }
        const r = (int >> 16) & 255;
        const g = (int >> 8) & 255;
        const b = int & 255;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }, []);
    // Snapshot integration
    (0, snapshots_1.useSnapshotHandler)('triPane', () => ({
        syncState,
        activePane,
        showProvenance,
        pinnedTools,
        densityMode
    }), (data) => {
        if (data.syncState)
            setSyncState(data.syncState);
        if (data.activePane)
            setActivePane(data.activePane);
        if (typeof data.showProvenance === 'boolean')
            setShowProvenance(data.showProvenance);
        if (data.pinnedTools)
            setPinnedTools(data.pinnedTools);
        if (data.densityMode)
            setDensityMode(data.densityMode);
    });
    // Auth context
    const token = localStorage.getItem('auth_token') || undefined;
    // Initialize collaboration
    const { doc, users, isConnected, isSynced } = (0, useCollaboration_1.useCollaboration)('main-graph', // TODO: Make dynamic based on workspace/investigation ID
    user ? { id: user.id, name: user.name || user.email } : { id: 'anon', name: 'Anonymous' }, token);
    const { cursors: presenceCursors, members: presenceMembers, emitPresenceUpdate } = (0, usePresenceChannel_1.usePresenceChannel)({
        workspaceId: 'tri-pane',
        channel: 'tri-pane',
        userId: localUserId,
        userName: user?.name || user?.email || 'Anonymous',
        token,
    });
    const remoteSelections = (0, react_1.useMemo)(() => {
        return Array.from(presenceMembers.values())
            .filter((member) => member.userId !== localUserId && member.selection)
            .map((member) => {
            const selection = parsePresenceSelection(member.selection);
            if (!selection)
                return null;
            return {
                userId: member.userId,
                userName: member.userName,
                selection,
            };
        })
            .filter((entry) => Boolean(entry));
    }, [localUserId, parsePresenceSelection, presenceMembers]);
    // Sync graph data
    const { entities: graphEntities, relationships: graphRelationships, updateEntityPosition } = (0, useGraphSync_1.useGraphSync)(doc, entities, relationships);
    // Filter data based on global time window
    const filteredData = (0, react_1.useMemo)(() => {
        const currentEntities = graphEntities;
        const currentRelationships = graphRelationships;
        if (!syncState.globalTimeWindow) {
            return {
                entities: currentEntities,
                relationships: currentRelationships,
                timelineEvents,
                geospatialEvents,
            };
        }
        const { start, end } = syncState.globalTimeWindow;
        // Filter timeline events
        const filteredTimelineEvents = timelineEvents.filter((event) => {
            const eventTime = new Date(event.timestamp);
            return eventTime >= start && eventTime <= end;
        });
        // Filter geospatial events
        const filteredGeospatialEvents = geospatialEvents.filter((event) => {
            const eventTime = new Date(event.timestamp);
            return eventTime >= start && eventTime <= end;
        });
        // Filter entities that appear in the filtered events
        const relevantEntityIds = new Set(filteredTimelineEvents.map((e) => e.entityId).filter(Boolean));
        const filteredEntities = currentEntities.filter((entity) => {
            if (relevantEntityIds.has(entity.id))
                return true;
            // Also include entities updated within the time window
            if (entity.updatedAt) {
                const updateTime = new Date(entity.updatedAt);
                return updateTime >= start && updateTime <= end;
            }
            return false;
        });
        // Filter relationships to only include those between filtered entities
        const filteredEntityIds = new Set(filteredEntities.map((e) => e.id));
        const filteredRelationships = currentRelationships.filter((rel) => filteredEntityIds.has(rel.sourceId) &&
            filteredEntityIds.has(rel.targetId));
        return {
            entities: filteredEntities,
            relationships: filteredRelationships,
            timelineEvents: filteredTimelineEvents,
            geospatialEvents: filteredGeospatialEvents,
        };
    }, [
        graphEntities,
        graphRelationships,
        timelineEvents,
        geospatialEvents,
        syncState.globalTimeWindow,
    ]);
    (0, react_1.useEffect)(() => {
        if (!triPaneRef.current)
            return;
        const selectionDetails = [
            {
                pane: 'graph',
                id: syncState.graph.selectedEntityId,
                label: filteredData.entities.find((entity) => entity.id === syncState.graph.selectedEntityId)?.name ||
                    syncState.graph.selectedEntityId,
            },
            {
                pane: 'timeline',
                id: syncState.timeline.selectedEventId,
                label: filteredData.timelineEvents.find((event) => event.id === syncState.timeline.selectedEventId)?.title ||
                    syncState.timeline.selectedEventId,
            },
            {
                pane: 'map',
                id: syncState.map.selectedLocationId,
                label: syncState.map.selectedLocationId,
            },
        ];
        const $root = (0, jquery_1.default)(triPaneRef.current);
        selectionDetails.forEach(({ pane, id, label }) => {
            const $pane = $root.find(`[data-pane="${pane}"]`);
            if ($pane.length === 0)
                return;
            let $overlay = $pane.find('.tri-pane-selection-overlay');
            if ($overlay.length === 0) {
                $overlay = (0, jquery_1.default)('<div/>', { class: 'tri-pane-selection-overlay' })
                    .css({
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(59, 130, 246, 0.12)',
                    border: '2px solid rgba(59, 130, 246, 0.45)',
                    borderRadius: '0.5rem',
                    pointerEvents: 'none',
                    display: 'none',
                    zIndex: 10,
                });
                const $label = (0, jquery_1.default)('<div/>', {
                    class: 'tri-pane-selection-overlay__label',
                }).css({
                    position: 'absolute',
                    top: '0.5rem',
                    right: '0.5rem',
                    background: 'rgba(37, 99, 235, 0.9)',
                    color: '#fff',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    maxWidth: '70%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                });
                $overlay.append($label);
                $pane.append($overlay);
            }
            const $label = $overlay.find('.tri-pane-selection-overlay__label');
            if (id) {
                $label.text(label || id);
                $overlay.show();
            }
            else {
                $overlay.hide();
            }
        });
    }, [
        filteredData.entities,
        filteredData.timelineEvents,
        syncState.graph.selectedEntityId,
        syncState.timeline.selectedEventId,
        syncState.map.selectedLocationId,
    ]);
    (0, react_1.useEffect)(() => {
        if (!triPaneRef.current)
            return;
        const $root = (0, jquery_1.default)(triPaneRef.current);
        const panes = [
            'graph',
            'timeline',
            'map',
        ];
        const selectionsByPane = new Map();
        remoteSelections.forEach((entry) => {
            const pane = entry.selection.pane;
            const list = selectionsByPane.get(pane) ?? [];
            list.push(entry);
            selectionsByPane.set(pane, list);
        });
        panes.forEach((pane) => {
            const $pane = $root.find(`[data-pane="${pane}"]`);
            if ($pane.length === 0)
                return;
            let $layer = $pane.find('.tri-pane-remote-selection-layer');
            const paneSelections = selectionsByPane.get(pane) ?? [];
            if (paneSelections.length === 0) {
                $layer.remove();
                return;
            }
            if ($layer.length === 0) {
                $layer = (0, jquery_1.default)('<div/>', { class: 'tri-pane-remote-selection-layer' }).css({
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                    zIndex: 9,
                });
                $pane.append($layer);
            }
            const activeUserIds = new Set(paneSelections.map((entry) => entry.userId));
            paneSelections.forEach((entry, index) => {
                const { userId, userName, selection } = entry;
                let $overlay = $layer.find(`[data-user="${userId}"]`);
                const baseColor = (0, colors_1.getStringColor)(userId);
                const borderColor = hexToRgba(baseColor, 0.55);
                const fillColor = hexToRgba(baseColor, 0.12);
                const labelText = `${userName}: ${selection.label || selection.id}`;
                if ($overlay.length === 0) {
                    $overlay = (0, jquery_1.default)('<div/>', {
                        class: 'tri-pane-remote-selection-overlay',
                        'data-user': userId,
                    }).css({
                        position: 'absolute',
                        inset: 0,
                        borderRadius: '0.5rem',
                        borderStyle: 'dashed',
                        borderWidth: '2px',
                        pointerEvents: 'none',
                        display: 'none',
                    });
                    const $label = (0, jquery_1.default)('<div/>', {
                        class: 'tri-pane-remote-selection-overlay__label',
                    }).css({
                        position: 'absolute',
                        left: '0.5rem',
                        background: baseColor,
                        color: '#fff',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '9999px',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        maxWidth: '70%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    });
                    $overlay.append($label);
                    $layer.append($overlay);
                }
                $overlay.css({
                    borderColor,
                    background: fillColor,
                    display: selection.id ? 'block' : 'none',
                });
                $overlay
                    .find('.tri-pane-remote-selection-overlay__label')
                    .css({ top: `calc(0.5rem + ${index * 1.5}rem)` })
                    .text(labelText);
            });
            $layer.find('.tri-pane-remote-selection-overlay').each((_, element) => {
                const $element = (0, jquery_1.default)(element);
                const userId = $element.data('user');
                if (!activeUserIds.has(userId)) {
                    $element.remove();
                }
            });
        });
    }, [remoteSelections, hexToRgba]);
    (0, react_1.useEffect)(() => {
        if (!triPaneRef.current)
            return;
        const container = triPaneRef.current;
        const handleMouseMove = (event) => {
            const rect = container.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            emitPresenceUpdate({ cursor: { x, y } });
        };
        container.addEventListener('mousemove', handleMouseMove);
        return () => container.removeEventListener('mousemove', handleMouseMove);
    }, [emitPresenceUpdate]);
    (0, react_1.useEffect)(() => {
        const selection = syncState.graph.selectedEntityId
            ? {
                pane: 'graph',
                id: syncState.graph.selectedEntityId,
                label: filteredData.entities.find((entity) => entity.id === syncState.graph.selectedEntityId)?.name ||
                    syncState.graph.selectedEntityId,
            }
            : syncState.timeline.selectedEventId
                ? {
                    pane: 'timeline',
                    id: syncState.timeline.selectedEventId,
                    label: filteredData.timelineEvents.find((event) => event.id === syncState.timeline.selectedEventId)?.title ||
                        syncState.timeline.selectedEventId,
                }
                : syncState.map.selectedLocationId
                    ? {
                        pane: 'map',
                        id: syncState.map.selectedLocationId,
                    }
                    : undefined;
        emitPresenceUpdate({ selection });
    }, [
        emitPresenceUpdate,
        filteredData.entities,
        filteredData.timelineEvents,
        syncState.graph.selectedEntityId,
        syncState.timeline.selectedEventId,
        syncState.map.selectedLocationId,
    ]);
    // Handle entity selection from graph
    const handleEntitySelect = (0, react_1.useCallback)((entity) => {
        setAnnotationContext((prev) => ({ ...prev, entity }));
        setSyncState((prev) => ({
            ...prev,
            graph: {
                ...prev.graph,
                selectedEntityId: entity.id,
                focusedEntityIds: [
                    entity.id,
                    ...relationships
                        .filter((r) => r.sourceId === entity.id || r.targetId === entity.id)
                        .map((r) => (r.sourceId === entity.id ? r.targetId : r.sourceId)),
                ],
            },
            timeline: {
                ...prev.timeline,
                selectedEventId: undefined,
            },
            map: {
                ...prev.map,
                selectedLocationId: entity.type === 'LOCATION' ? entity.id : undefined,
            },
        }));
        onEntitySelect?.(entity);
        onSyncStateChange?.(syncState);
    }, [relationships, onEntitySelect, onSyncStateChange, syncState]);
    // Handle timeline event selection
    const handleTimelineEventSelect = (0, react_1.useCallback)((event) => {
        if (event.entityId) {
            const entity = entities.find((e) => e.id === event.entityId);
            if (entity) {
                handleEntitySelect(entity);
            }
        }
        setAnnotationContext((prev) => ({ ...prev, timelineEvent: event }));
        setSyncState((prev) => ({
            ...prev,
            timeline: {
                ...prev.timeline,
                selectedEventId: event.id,
            },
        }));
        onEventSelect?.(event);
        onSyncStateChange?.(syncState);
    }, [entities, handleEntitySelect, onEventSelect, onSyncStateChange, syncState]);
    // Handle map location selection
    const handleLocationSelect = (0, react_1.useCallback)((locationId) => {
        setAnnotationContext((prev) => ({ ...prev, locationId }));
        setSyncState((prev) => ({
            ...prev,
            map: {
                ...prev.map,
                selectedLocationId: locationId,
            },
        }));
        onLocationSelect?.(locationId);
        onSyncStateChange?.(syncState);
    }, [onLocationSelect, onSyncStateChange, syncState]);
    // Handle time window change from timeline
    const handleTimeWindowChange = (0, react_1.useCallback)((range) => {
        const timeWindow = {
            start: new Date(range.start),
            end: new Date(range.end),
        };
        setSyncState((prev) => ({
            ...prev,
            globalTimeWindow: timeWindow,
            timeline: {
                ...prev.timeline,
                timeWindow,
            },
        }));
        onTimeWindowChange?.(timeWindow);
        onSyncStateChange?.(syncState);
    }, [onTimeWindowChange, onSyncStateChange, syncState]);
    // Handle reset filters
    const handleResetFilters = (0, react_1.useCallback)(() => {
        setSyncState(prev => ({
            ...prev,
            globalTimeWindow: undefined,
            graph: {
                ...prev.graph,
                selectedEntityId: undefined,
                focusedEntityIds: undefined,
            },
            timeline: {
                ...prev.timeline,
                selectedEventId: undefined,
                timeWindow: undefined,
            },
            map: {
                ...prev.map,
                selectedLocationId: undefined,
            },
        }));
    }, []);
    // Keyboard shortcuts
    (0, react_1.useEffect)(() => {
        const handleKeyPress = (e) => {
            // Only handle shortcuts when not in an input
            if (e.target instanceof HTMLInputElement ||
                e.target instanceof HTMLTextAreaElement) {
                return;
            }
            if (e.key === 'g' && !e.ctrlKey && !e.metaKey) {
                setActivePane('graph');
            }
            else if (e.key === 't' && !e.ctrlKey && !e.metaKey) {
                setActivePane('timeline');
            }
            else if (e.key === 'm' && !e.ctrlKey && !e.metaKey) {
                setActivePane('map');
            }
            else if (e.key === 'r' && !e.ctrlKey && !e.metaKey) {
                handleResetFilters();
            }
            else if (e.key === 'e' && !e.ctrlKey && !e.metaKey) {
                onExport?.();
            }
            else if (e.key === 'p' && !e.ctrlKey && !e.metaKey) {
                setShowProvenance((prev) => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [handleResetFilters, onExport]);
    return (<div className={(0, utils_1.cn)('flex flex-col h-full gap-4', className)} role="main" aria-label="Tri-pane analysis shell">
      {/* Header Controls */}
      <div className="flex items-center justify-between bg-background border rounded-lg p-3 shadow-sm">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <lucide_react_1.Layers className="h-5 w-5"/>
            Tri-Pane Analysis
          </h1>

          <div className="flex items-center gap-2" role="status" aria-live="polite">
            <Badge_1.Badge variant="outline" className="flex items-center gap-1" title="Total entities">
              <lucide_react_1.Network className="h-3 w-3"/>
              {filteredData.entities.length}
            </Badge_1.Badge>
            <Badge_1.Badge variant="outline" className="flex items-center gap-1" title="Total events">
              <lucide_react_1.Clock className="h-3 w-3"/>
              {filteredData.timelineEvents.length}
            </Badge_1.Badge>
            <Badge_1.Badge variant="outline" className="flex items-center gap-1" title="Total locations">
              <lucide_react_1.MapPin className="h-3 w-3"/>
              {filteredData.geospatialEvents.length}
            </Badge_1.Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button_1.Button variant="outline" size="sm" onClick={() => { setShowProvenance(!showProvenance); }} aria-label={`${showProvenance ? 'Hide' : 'Show'} provenance overlay`} title="Toggle provenance overlay (P)">
            {showProvenance ? (<lucide_react_1.Eye className="h-4 w-4"/>) : (<lucide_react_1.EyeOff className="h-4 w-4"/>)}
            <span className="ml-1">Provenance</span>
          </Button_1.Button>

          <Button_1.Button variant="outline" size="sm" onClick={handleResetFilters} disabled={!syncState.globalTimeWindow} aria-label="Reset all filters" title="Reset filters (R)">
            <lucide_react_1.RefreshCw className="h-4 w-4"/>
            <span className="ml-1">Reset</span>
          </Button_1.Button>

          {onExport && (<Button_1.Button variant="outline" size="sm" onClick={onExport} aria-label="Export data" title="Export data (E)">
              <lucide_react_1.Download className="h-4 w-4"/>
              <span className="ml-1">Export</span>
            </Button_1.Button>)}
        </div>
      </div>

      {/* Three-pane layout */}
      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0 relative" ref={triPaneRef}>
        <CollaborativeCursors_1.CollaborativeCursors cursors={presenceCursors}/>
        {/* Timeline Pane */}
        <div className="col-span-3 flex flex-col min-h-0">
          <Card_1.Card className="flex-1 flex flex-col min-h-0 relative overflow-hidden" data-pane="timeline">
            <Card_1.CardHeader className="pb-3 flex-shrink-0">
              <Card_1.CardTitle className="flex items-center gap-2 text-sm" role="heading" aria-level={2}>
                <lucide_react_1.Clock className="h-4 w-4" aria-hidden="true"/>
                Timeline
                {syncState.globalTimeWindow && (<Badge_1.Badge variant="secondary" className="text-xs">
                    Filtered
                  </Badge_1.Badge>)}
                {activePane === 'timeline' && (<Badge_1.Badge variant="default" className="text-xs">
                    Active (T)
                  </Badge_1.Badge>)}
              </Card_1.CardTitle>
            </Card_1.CardHeader>
            <Card_1.CardContent className="p-0 flex-1 min-h-0">
              <TimelineRail_1.TimelineRail data={filteredData.timelineEvents} onTimeRangeChange={handleTimeWindowChange} onEventSelect={handleTimelineEventSelect} selectedEventId={syncState.timeline.selectedEventId} autoScroll={syncState.timeline.autoScroll} className="border-0 h-full"/>
            </Card_1.CardContent>
          </Card_1.Card>
        </div>

        {/* Graph Pane */}
        <div className="col-span-6 flex flex-col min-h-0">
          <Card_1.Card className="flex-1 flex flex-col min-h-0 relative overflow-hidden" data-pane="graph">
            <Card_1.CardHeader className="pb-3 flex-shrink-0">
              <Card_1.CardTitle className="flex items-center gap-2 text-sm">
                <lucide_react_1.Network className="h-4 w-4"/>
                Entity Graph
                {showProvenance && (<Badge_1.Badge variant="secondary" className="text-xs">
                    Provenance
                  </Badge_1.Badge>)}
                {activePane === 'graph' && (<Badge_1.Badge variant="default" className="text-xs">
                    Active (G)
                  </Badge_1.Badge>)}
              </Card_1.CardTitle>
            </Card_1.CardHeader>
            <Card_1.CardContent className="p-0 flex-1 min-h-0">
              <GraphCanvas_1.GraphCanvas entities={filteredData.entities.map((entity) => ({
            ...entity,
            confidence: showProvenance ? entity.confidence : 1.0,
        }))} relationships={filteredData.relationships} layout={syncState.graph.layout} onEntitySelect={handleEntitySelect} onNodeDragEnd={(node, pos) => updateEntityPosition(node.id, pos.x, pos.y)} selectedEntityId={syncState.graph.selectedEntityId} className="h-full"/>
            </Card_1.CardContent>
          </Card_1.Card>
        </div>

        {/* Map Pane */}
        <div className="col-span-3 flex flex-col min-h-0">
          <Card_1.Card className="flex-1 flex flex-col min-h-0 relative overflow-hidden" data-pane="map">
            <Card_1.CardHeader className="pb-3 flex-shrink-0">
              <Card_1.CardTitle className="flex items-center gap-2 text-sm">
                <lucide_react_1.MapPin className="h-4 w-4"/>
                Geographic View
                {activePane === 'map' && (<Badge_1.Badge variant="default" className="text-xs">
                    Active (M)
                  </Badge_1.Badge>)}
              </Card_1.CardTitle>
            </Card_1.CardHeader>
            <Card_1.CardContent className="p-0 flex-1 min-h-0">
              <MapPane_1.MapPane locations={filteredData.geospatialEvents} center={syncState.map.center} zoom={syncState.map.zoom} selectedLocationId={syncState.map.selectedLocationId} onLocationSelect={handleLocationSelect} className="h-full"/>
            </Card_1.CardContent>
          </Card_1.Card>
        </div>
      </div>

      {(0, config_1.isFeatureEnabled)('ui.annotationsV1') && (<div className="grid grid-cols-12 gap-4 min-h-[260px]">
          <div className="col-span-12 lg:col-span-5">
            <AnnotationPanel_1.default context={{
                entity: annotationContext.entity,
                timelineEvent: annotationContext.timelineEvent,
                location: filteredData.geospatialEvents.find((loc) => loc.id === annotationContext.locationId),
            }}/>
          </div>
        </div>)}

      <CollaborationPanel_1.CollaborationPanel users={users} isConnected={isConnected} isSynced={isSynced}/>

      {/* Status indicator for active filter */}
      {syncState.globalTimeWindow && (<div className="fixed bottom-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg text-sm flex items-center gap-2" role="status" aria-live="polite">
          <lucide_react_1.Filter className="h-4 w-4"/>
          Time filter: {syncState.globalTimeWindow.start.toLocaleString()} -{' '}
          {syncState.globalTimeWindow.end.toLocaleString()}
        </div>)}

      {/* Keyboard shortcuts helper (hidden, for screen readers) */}
      <div className="sr-only" role="complementary" aria-label="Keyboard shortcuts">
        <h2>Keyboard Shortcuts</h2>
        <ul>
          <li>G: Focus graph pane</li>
          <li>T: Focus timeline pane</li>
          <li>M: Focus map pane</li>
          <li>R: Reset all filters</li>
          <li>E: Export data</li>
          <li>P: Toggle provenance overlay</li>
        </ul>
      </div>
    </div>);
}
