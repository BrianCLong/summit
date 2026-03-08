"use strict";
/**
 * Tri-Pane Analysis Page
 *
 * This page component provides the route-level integration for the
 * tri-pane analysis shell. It handles data loading and provides
 * the shell with mock data (or real data from a provider).
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TriPanePage;
const react_1 = __importStar(require("react"));
const triPane_1 = require("@/features/triPane");
const triPane_2 = require("@/features/triPane");
const lucide_react_1 = require("lucide-react");
const DataIntegrityNotice_1 = require("@/components/common/DataIntegrityNotice");
const DemoIndicator_1 = require("@/components/common/DemoIndicator");
/**
 * TriPanePage component
 *
 * This page loads mock data and renders the TriPaneShell.
 * Future teams can replace the mock data loading with real API calls.
 */
function TriPanePage() {
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    // Data state
    const [entities, setEntities] = (0, react_1.useState)([]);
    const [relationships, setRelationships] = (0, react_1.useState)([]);
    const [timelineEvents, setTimelineEvents] = (0, react_1.useState)([]);
    const [geospatialEvents, setGeospatialEvents] = (0, react_1.useState)([]);
    const isDemoMode = (0, DemoIndicator_1.useDemoMode)();
    // Load mock data on mount (demo only)
    (0, react_1.useEffect)(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                if (!isDemoMode) {
                    setEntities([]);
                    setRelationships([]);
                    setTimelineEvents([]);
                    setGeospatialEvents([]);
                    return;
                }
                // Simulate API delay
                await new Promise(resolve => setTimeout(resolve, 500));
                // Generate mock data
                const mockEntities = (0, triPane_2.generateMockEntities)(25);
                const mockRelationships = (0, triPane_2.generateMockRelationships)(mockEntities, 40);
                const mockTimelineEvents = (0, triPane_2.generateMockTimelineEvents)(mockEntities, 60);
                const mockGeospatialEvents = (0, triPane_2.generateMockGeospatialEvents)(30);
                setEntities(mockEntities);
                setRelationships(mockRelationships);
                setTimelineEvents(mockTimelineEvents);
                setGeospatialEvents(mockGeospatialEvents);
            }
            catch (err) {
                setError(err instanceof Error ? err : new Error('Failed to load data'));
            }
            finally {
                setLoading(false);
            }
        };
        loadData();
    }, [isDemoMode]);
    // Handle entity selection
    const handleEntitySelect = (entity) => {
        console.log('Entity selected:', entity);
        // Future: Navigate to entity detail page or show drawer
    };
    // Handle timeline event selection
    const handleEventSelect = (event) => {
        console.log('Event selected:', event);
        // Future: Show event details or navigate to related page
    };
    // Handle location selection
    const handleLocationSelect = (locationId) => {
        console.log('Location selected:', locationId);
        // Future: Show location details or filter by location
    };
    // Handle sync state changes (for debugging or persistence)
    const handleSyncStateChange = (state) => {
        console.log('Sync state changed:', state);
        // Future: Persist state to URL or localStorage
    };
    // Handle export
    const handleExport = () => {
        if (!isDemoMode) {
            alert('Export is unavailable until live data is connected.');
            return;
        }
        console.log('Exporting data...');
        // Create export data
        const exportData = {
            entities,
            relationships,
            timelineEvents,
            geospatialEvents,
            exportedAt: new Date().toISOString(),
        };
        // Download as JSON
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tri-pane-export-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };
    // Loading state
    if (loading) {
        return (<div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <lucide_react_1.Loader2 className="h-12 w-12 animate-spin mx-auto text-primary"/>
          <p className="text-lg font-medium">Loading tri-pane analysis...</p>
          <p className="text-sm text-muted-foreground">
            Preparing graph, timeline, and map data
          </p>
        </div>
      </div>);
    }
    // Error state
    if (error) {
        return (<div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-6xl">⚠️</div>
          <h1 className="text-2xl font-bold text-destructive">
            Failed to Load Data
          </h1>
          <p className="text-muted-foreground">{error.message}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
            Retry
          </button>
        </div>
      </div>);
    }
    // Main render
    return (<div className="h-full p-6">
      {!isDemoMode && (<div className="mb-4">
          <DataIntegrityNotice_1.DataIntegrityNotice mode="unavailable" context="Tri-pane analysis"/>
        </div>)}
      <triPane_1.TriPaneShell entities={entities} relationships={relationships} timelineEvents={timelineEvents} geospatialEvents={geospatialEvents} onEntitySelect={handleEntitySelect} onEventSelect={handleEventSelect} onLocationSelect={handleLocationSelect} onSyncStateChange={handleSyncStateChange} onExport={handleExport} showProvenanceOverlay={true} className="h-full"/>
    </div>);
}
