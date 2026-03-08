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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ExplorePage;
const react_1 = __importStar(require("react"));
const lucide_react_1 = require("lucide-react");
const react_router_dom_1 = require("react-router-dom");
const Button_1 = require("@/components/ui/Button");
const SearchBar_1 = require("@/components/ui/SearchBar");
const EntityDrawer_1 = require("@/components/panels/EntityDrawer");
const FilterPanel_1 = require("@/components/panels/FilterPanel");
const TimelineRail_1 = require("@/components/panels/TimelineRail");
const EmptyState_1 = require("@/components/ui/EmptyState");
const GraphCanvas_1 = require("@/graphs/GraphCanvas");
const useGraphQL_1 = require("@/hooks/useGraphQL");
const ConnectionStatus_1 = require("@/components/ConnectionStatus");
const SnapshotManager_1 = require("@/components/features/investigation/SnapshotManager");
const metrics_1 = require("@/telemetry/metrics");
const DataIntegrityNotice_1 = require("@/components/common/DataIntegrityNotice");
const DemoIndicator_1 = require("@/components/common/DemoIndicator");
const data_json_1 = __importDefault(require("@/mock/data.json"));
function ExplorePage() {
    // GraphQL hooks
    const { data: entitiesData, loading: entitiesLoading, error: entitiesError, refetch, } = (0, useGraphQL_1.useEntities)();
    const { data: entityUpdates } = (0, useGraphQL_1.useEntityUpdates)();
    const [searchParams] = (0, react_router_dom_1.useSearchParams)();
    const investigationId = searchParams.get('investigation');
    const [entities, setEntities] = (0, react_1.useState)([]);
    const [relationships, setRelationships] = (0, react_1.useState)([]);
    const [timelineEvents, setTimelineEvents] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    // UI State
    const [selectedEntityId, setSelectedEntityId] = (0, react_1.useState)();
    const [drawerOpen, setDrawerOpen] = (0, react_1.useState)(false);
    const [filterPanelOpen, setFilterPanelOpen] = (0, react_1.useState)(true);
    const [timelineOpen, setTimelineOpen] = (0, react_1.useState)(true);
    const [snapshotsOpen, setSnapshotsOpen] = (0, react_1.useState)(false);
    const [searchQuery, setSearchQuery] = (0, react_1.useState)('');
    const [policyOverlay, setPolicyOverlay] = (0, react_1.useState)('none');
    const isDemoMode = (0, DemoIndicator_1.useDemoMode)();
    // Graph state
    const [graphLayout] = (0, react_1.useState)({
        type: 'force',
        settings: {},
    });
    // Filters
    const [filters, setFilters] = (0, react_1.useState)({
        entityTypes: [],
        relationshipTypes: [],
        dateRange: { start: '', end: '' },
        confidenceRange: { min: 0, max: 1 },
        tags: [],
        sources: [],
    });
    // Load data - prefer GraphQL over mock data in demo mode only
    (0, react_1.useEffect)(() => {
        (0, metrics_1.trackGoldenPathStep)('entities_viewed');
        if (entitiesData?.entities) {
            // Use real GraphQL data when available
            setEntities(entitiesData.entities);
            setLoading(entitiesLoading);
            setError(entitiesError);
        }
        else {
            if (!isDemoMode) {
                setEntities([]);
                setRelationships([]);
                setTimelineEvents([]);
                setLoading(false);
                setError(new Error('Live graph data is unavailable without a backend connection.'));
                return;
            }
            // Fallback to demo data
            const loadMockData = async () => {
                try {
                    setLoading(true);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    setEntities(data_json_1.default.entities);
                    setRelationships(data_json_1.default.relationships);
                    setTimelineEvents(data_json_1.default.timelineEvents);
                }
                catch (err) {
                    setError(err);
                }
                finally {
                    setLoading(false);
                }
            };
            loadMockData();
        }
    }, [entitiesData, entitiesLoading, entitiesError, isDemoMode]);
    // Handle real-time entity updates
    (0, react_1.useEffect)(() => {
        if (entityUpdates?.entityUpdated) {
            setEntities(prev => {
                const updatedEntity = entityUpdates.entityUpdated;
                const index = prev.findIndex(e => e.id === updatedEntity.id);
                if (index >= 0) {
                    const newEntities = [...prev];
                    newEntities[index] = { ...newEntities[index], ...updatedEntity };
                    return newEntities;
                }
                return [...prev, updatedEntity];
            });
        }
    }, [entityUpdates]);
    // Filter data based on current filters
    const filteredEntities = entities.filter(entity => {
        if (filters.entityTypes.length > 0 &&
            !filters.entityTypes.includes(entity.type)) {
            return false;
        }
        if (filters.confidenceRange.min > entity.confidence ||
            filters.confidenceRange.max < entity.confidence) {
            return false;
        }
        if (filters.tags.length > 0 &&
            !entity.tags?.some(tag => filters.tags.includes(tag))) {
            return false;
        }
        if (filters.sources.length > 0 &&
            entity.source &&
            !filters.sources.includes(entity.source)) {
            return false;
        }
        if (searchQuery &&
            !entity.name.toLowerCase().includes(searchQuery.toLowerCase())) {
            return false;
        }
        return true;
    });
    const filteredRelationships = relationships.filter(rel => {
        if (filters.relationshipTypes.length > 0 &&
            !filters.relationshipTypes.includes(rel.type)) {
            return false;
        }
        // Only include relationships where both entities are in filtered set
        return (filteredEntities.some(e => e.id === rel.sourceId) &&
            filteredEntities.some(e => e.id === rel.targetId));
    });
    // Get available filter options
    const availableEntityTypes = Array.from(new Set(entities.map(e => e.type)));
    const availableRelationshipTypes = Array.from(new Set(relationships.map(r => r.type)));
    const availableTags = Array.from(new Set(entities.flatMap(e => e.tags || [])));
    const availableSources = Array.from(new Set(entities.map(e => e.source).filter(Boolean)));
    const handleEntitySelect = (entity) => {
        setSelectedEntityId(entity.id);
        setDrawerOpen(true);
    };
    const handleRefresh = async () => {
        if (entitiesData) {
            // Refetch from GraphQL
            await refetch();
        }
        else {
            // Simulate refresh for mock data
            setLoading(true);
            await new Promise(resolve => setTimeout(resolve, 1000));
            setLoading(false);
        }
    };
    const handleExport = async (format) => {
        (0, metrics_1.trackGoldenPathStep)('results_viewed');
        // 1. Prepare Manifest
        const timestamp = new Date().toISOString();
        const manifestPayload = {
            tenant: 'CURRENT_TENANT', // Should come from context
            filters,
            timestamp
        };
        // 2. Sign Manifest (Simulated call to new endpoint)
        let signature = 'mock-signature';
        try {
            const res = await fetch('/api/exports/sign-manifest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(manifestPayload)
            });
            if (res.ok) {
                const json = await res.json();
                signature = json.signature;
            }
        }
        catch (e) {
            console.warn("Failed to sign export manifest", e);
        }
        if (format === 'json') {
            const data = {
                manifest: { ...manifestPayload, signature },
                data: {
                    entities: filteredEntities,
                    relationships: filteredRelationships,
                }
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], {
                type: 'application/json',
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `intelgraph-export-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
        }
        else if (format === 'csv') {
            // Simple CSV generation
            const headers = ['id', 'type', 'name', 'confidence', 'source'].join(',');
            const rows = filteredEntities.map(e => [e.id, e.type, `"${e.name}"`, e.confidence, e.source].join(','));
            const csvContent = [headers, ...rows].join('\n');
            // Append manifest as comment
            const manifestComment = `# MANIFEST: ${JSON.stringify(manifestPayload)}\n# SIGNATURE: ${signature}\n`;
            const blob = new Blob([manifestComment + csvContent], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `intelgraph-export-${Date.now()}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        }
        else if (format === 'png') {
            // Placeholder for PNG export logic
            // In a real implementation, this would use html2canvas or similar
            alert('PNG export requires canvas integration not available in this environment.');
        }
    };
    if (error) {
        return (<div className="h-full flex items-center justify-center">
        <EmptyState_1.EmptyState icon="alert" title="Failed to load graph data" description={error.message} action={{
                label: 'Retry',
                onClick: () => window.location.reload(),
            }}/>
      </div>);
    }
    return (<div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold">Graph Explorer</h1>
          <ConnectionStatus_1.ConnectionStatus />
          <SearchBar_1.SearchBar placeholder="Search entities..." value={searchQuery} onChange={setSearchQuery} className="w-80"/>
        </div>

        <div className="flex items-center gap-2">
          {/* Policy Overlays */}
          <div className="flex items-center gap-2 border-r pr-4 mr-2">
              <span className="text-xs text-muted-foreground font-medium">Overlays:</span>
              <Button_1.Button variant={policyOverlay === 'purpose' ? 'default' : 'ghost'} size="sm" onClick={() => setPolicyOverlay(policyOverlay === 'purpose' ? 'none' : 'purpose')}>
                  <lucide_react_1.Shield className="h-3 w-3 mr-1"/> Purpose
              </Button_1.Button>
              <Button_1.Button variant={policyOverlay === 'residency' ? 'default' : 'ghost'} size="sm" onClick={() => setPolicyOverlay(policyOverlay === 'residency' ? 'none' : 'residency')}>
                  <lucide_react_1.Shield className="h-3 w-3 mr-1"/> Residency
              </Button_1.Button>
          </div>

          <Button_1.Button variant="outline" size="sm" onClick={() => setFilterPanelOpen(!filterPanelOpen)}>
            <lucide_react_1.Filter className="h-4 w-4 mr-2"/>
            Filters
          </Button_1.Button>

          <Button_1.Button variant="outline" size="sm" onClick={() => setTimelineOpen(!timelineOpen)}>
            <lucide_react_1.Search className="h-4 w-4 mr-2"/>
            Timeline
          </Button_1.Button>

          <Button_1.Button variant="outline" size="sm" onClick={() => setSnapshotsOpen(!snapshotsOpen)}>
            <lucide_react_1.History className="h-4 w-4 mr-2"/>
            Snapshots
          </Button_1.Button>

          <Button_1.Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
            <lucide_react_1.RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`}/>
            Refresh
          </Button_1.Button>

          <div className="flex gap-1">
             <Button_1.Button variant="outline" size="sm" onClick={() => handleExport('json')}>
              <lucide_react_1.Download className="h-4 w-4 mr-2"/>
              JSON
            </Button_1.Button>
             <Button_1.Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
              <lucide_react_1.Download className="h-4 w-4 mr-2"/>
              CSV
            </Button_1.Button>
          </div>

          <Button_1.Button variant="outline" size="sm">
            <lucide_react_1.Settings className="h-4 w-4 mr-2"/>
            Layout
          </Button_1.Button>
        </div>
      </div>

      {!entitiesData && (<div className="px-6 pt-4">
          <DataIntegrityNotice_1.DataIntegrityNotice mode={isDemoMode ? 'demo' : 'unavailable'} context="Graph explorer"/>
        </div>)}

      {/* Main Content Grid */}
      <div className="flex-1 flex">
        {/* Left Sidebar - Filters */}
        {filterPanelOpen && (<div className="w-80 border-r overflow-y-auto">
            <FilterPanel_1.FilterPanel data={filters} onFilterChange={setFilters} availableEntityTypes={availableEntityTypes} availableRelationshipTypes={availableRelationshipTypes} availableTags={availableTags} availableSources={availableSources} loading={loading} className="m-4"/>
          </div>)}

        {/* Center - Graph Canvas */}
        <div className="flex-1 relative">
          {loading ? (<div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground">Loading graph data...</p>
              </div>
            </div>) : filteredEntities.length === 0 ? (<div className="absolute inset-0 flex items-center justify-center">
              <EmptyState_1.EmptyState icon="search" title="No entities found" description="Try adjusting your filters or search query" action={{
                label: 'Clear filters',
                onClick: () => {
                    setFilters({
                        entityTypes: [],
                        relationshipTypes: [],
                        dateRange: { start: '', end: '' },
                        confidenceRange: { min: 0, max: 1 },
                        tags: [],
                        sources: [],
                    });
                    setSearchQuery('');
                },
            }}/>
            </div>) : (<GraphCanvas_1.GraphCanvas entities={filteredEntities} relationships={filteredRelationships} layout={graphLayout} onEntitySelect={handleEntitySelect} selectedEntityId={selectedEntityId} className="h-full w-full"/>)}
          {/* Legend for Policy Overlay */}
          {policyOverlay !== 'none' && (<div className="absolute bottom-4 right-4 bg-background/90 p-4 rounded shadow border z-10">
                  <h4 className="font-semibold mb-2 capitalize">{policyOverlay} Policy</h4>
                  <div className="space-y-1 text-sm">
                      <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span> Compliant</div>
                      <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></span> Review</div>
                      <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-red-500 mr-2"></span> Violation</div>
                  </div>
              </div>)}
        </div>

        {/* Right Sidebar - Timeline */}
        {timelineOpen && (<div className="w-80 border-l overflow-y-auto">
            <TimelineRail_1.TimelineRail data={timelineEvents} loading={loading} onEventSelect={event => {
                if (event.entityId) {
                    setSelectedEntityId(event.entityId);
                    setDrawerOpen(true);
                }
            }} className="m-4"/>
          </div>)}

        {/* Far Right Sidebar - Snapshots (Overlay or separate panel) */}
        {snapshotsOpen && (<div className="w-96 border-l overflow-y-auto bg-background z-10">
            <SnapshotManager_1.SnapshotManager investigationId={investigationId || 'inv-1'} onClose={() => setSnapshotsOpen(false)}/>
          </div>)}
      </div>

      {/* Entity Details Drawer */}
      <EntityDrawer_1.EntityDrawer data={entities} relationships={relationships} open={drawerOpen} onOpenChange={setDrawerOpen} selectedEntityId={selectedEntityId} onSelect={handleEntitySelect} onAction={(action, payload) => {
            console.log('Entity action:', action, payload);
            // Handle entity actions (edit, delete, export, etc.)
        }}/>
    </div>);
}
