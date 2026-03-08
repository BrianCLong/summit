"use strict";
/**
 * Map Pane Component for Analyst Console
 *
 * Displays geographic locations with synchronized selection.
 * Clicking markers updates selection across all panes.
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
exports.AnalystMapPane = AnalystMapPane;
const react_1 = __importStar(require("react"));
const lucide_react_1 = require("lucide-react");
const utils_1 = require("@/lib/utils");
const Badge_1 = require("@/components/ui/Badge");
const Button_1 = require("@/components/ui/Button");
const AnalystViewContext_1 = require("./AnalystViewContext");
/**
 * AnalystMapPane component with synchronized selection
 */
function AnalystMapPane({ locations, events, className, }) {
    const { state } = (0, AnalystViewContext_1.useAnalystView)();
    const { selection, setSelection } = (0, AnalystViewContext_1.useSelection)();
    const { timeWindow } = (0, AnalystViewContext_1.useGlobalTimeBrush)();
    const [zoom, setZoom] = (0, react_1.useState)(2);
    const [hoveredLocationId, setHoveredLocationId] = (0, react_1.useState)(null);
    // Parse time window
    const { startMs: fromTime, endMs: toTime } = timeWindow;
    // Filter locations within time window
    const filteredLocations = (0, react_1.useMemo)(() => {
        return locations.filter(loc => {
            // If location has time bounds, check if they overlap with time window
            if (loc.firstSeenAt && loc.lastSeenAt) {
                const firstSeen = new Date(loc.firstSeenAt).getTime();
                const lastSeen = new Date(loc.lastSeenAt).getTime();
                return firstSeen <= toTime && lastSeen >= fromTime;
            }
            // If no time bounds, include the location
            return true;
        });
    }, [locations, fromTime, toTime]);
    // Group locations by approximate coordinates to handle overlapping markers
    const groupedLocations = (0, react_1.useMemo)(() => {
        const groups = {};
        filteredLocations.forEach(loc => {
            // Round coordinates to group nearby locations
            const key = `${Math.round(loc.lat * 10)},${Math.round(loc.lon * 10)}`;
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(loc);
        });
        return groups;
    }, [filteredLocations]);
    // Calculate position on the viewport (simple Mercator-like projection)
    const getMarkerPosition = (lat, lon) => {
        // Normalize longitude to 0-100% range
        const x = ((lon + 180) / 360) * 100;
        // Normalize latitude to 0-100% range (inverted for screen coords)
        const y = ((90 - lat) / 180) * 100;
        return { x, y };
    };
    // Handle location click
    const handleLocationClick = (0, react_1.useCallback)((location) => {
        setSelection({
            selectedLocationIds: [location.id],
            // Also select the associated entity if there is one
            selectedEntityIds: location.entityId ? [location.entityId] : [],
        });
    }, [setSelection]);
    // Get color based on selection/hover state
    const getMarkerColor = (locationId, isHovered) => {
        const isSelected = selection.selectedLocationIds.includes(locationId);
        if (isSelected)
            return 'text-yellow-400';
        if (isHovered)
            return 'text-yellow-200';
        return 'text-blue-500';
    };
    // Zoom controls
    const handleZoomIn = () => setZoom(prev => Math.min(prev + 1, 10));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 1, 1));
    const handleRecenter = () => setZoom(2);
    return (<div className={(0, utils_1.cn)('relative w-full h-full overflow-hidden bg-slate-900', className)} role="region" aria-label="Geographic map view">
      {/* Map background with grid */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900">
        {/* Grid overlay */}
        <svg className="w-full h-full opacity-20">
          <defs>
            <pattern id="analyst-map-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#analyst-map-grid)"/>
        </svg>

        {/* Reference lines */}
        <div className="absolute inset-0">
          {/* Equator */}
          <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-600/30"/>
          {/* Prime Meridian */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-600/30"/>
        </div>
      </div>

      {/* Location markers */}
      <div className="absolute inset-0" style={{
            transform: `scale(${zoom / 2})`,
            transformOrigin: 'center',
        }}>
        {Object.entries(groupedLocations).map(([coordKey, locs]) => {
            const firstLoc = locs[0];
            const position = getMarkerPosition(firstLoc.lat, firstLoc.lon);
            const isAnySelected = locs.some(loc => selection.selectedLocationIds.includes(loc.id));
            const isHovered = locs.some(loc => loc.id === hoveredLocationId);
            return (<div key={coordKey} className="absolute transform -translate-x-1/2 -translate-y-full cursor-pointer transition-all duration-200" style={{
                    left: `${position.x}%`,
                    top: `${position.y}%`,
                    zIndex: isAnySelected || isHovered ? 50 : 10,
                }} onClick={() => handleLocationClick(firstLoc)} onMouseEnter={() => setHoveredLocationId(firstLoc.id)} onMouseLeave={() => setHoveredLocationId(null)} role="button" tabIndex={0} aria-label={`Location: ${firstLoc.label || 'Unknown'}, ${locs.length} markers`} onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleLocationClick(firstLoc);
                    }
                }}>
              {/* Marker */}
              <div className="relative">
                <lucide_react_1.MapPin className={(0, utils_1.cn)('w-8 h-8 drop-shadow-lg transition-all', getMarkerColor(firstLoc.id, isHovered), isAnySelected && 'scale-125', isHovered && !isAnySelected && 'scale-110')} fill="currentColor"/>

                {/* Count badge for grouped locations */}
                {locs.length > 1 && (<Badge_1.Badge variant="secondary" className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {locs.length}
                  </Badge_1.Badge>)}

                {/* Selection ring */}
                {isAnySelected && (<div className="absolute inset-0 -m-1 rounded-full ring-2 ring-yellow-400 animate-pulse"/>)}
              </div>

              {/* Tooltip on hover */}
              {(isHovered || isAnySelected) && (<div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-background border rounded-lg shadow-lg p-3 min-w-48 z-50">
                  <div className="text-sm font-semibold mb-1">
                    {firstLoc.label || 'Unknown Location'}
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>
                      Coordinates: {firstLoc.lat.toFixed(4)}, {firstLoc.lon.toFixed(4)}
                    </div>
                    {firstLoc.firstSeenAt && (<div>
                        First seen: {new Date(firstLoc.firstSeenAt).toLocaleDateString()}
                      </div>)}
                    {locs.length > 1 && (<div>{locs.length} locations at this point</div>)}
                  </div>
                </div>)}
            </div>);
        })}
      </div>

      {/* Map controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <Button_1.Button variant="secondary" size="icon" onClick={handleZoomIn} aria-label="Zoom in" className="h-8 w-8 shadow-md">
          <lucide_react_1.ZoomIn className="h-4 w-4"/>
        </Button_1.Button>
        <Button_1.Button variant="secondary" size="icon" onClick={handleZoomOut} aria-label="Zoom out" className="h-8 w-8 shadow-md">
          <lucide_react_1.ZoomOut className="h-4 w-4"/>
        </Button_1.Button>
        <Button_1.Button variant="secondary" size="icon" onClick={handleRecenter} aria-label="Reset view" className="h-8 w-8 shadow-md">
          <lucide_react_1.Crosshair className="h-4 w-4"/>
        </Button_1.Button>
      </div>

      {/* Info panel */}
      <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm border rounded-lg shadow-lg p-3">
        <div className="flex items-center gap-2 text-xs font-semibold mb-1">
          <lucide_react_1.Layers className="h-4 w-4"/>
          Map View
        </div>
        <div className="text-xs text-muted-foreground space-y-1">
          <div>Locations: {filteredLocations.length}</div>
          <div>Zoom: {zoom}x</div>
        </div>
      </div>

      {/* Selection indicator */}
      {selection.selectedLocationIds.length > 0 && (<div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm border rounded-lg shadow-lg p-3">
          <Badge_1.Badge variant="secondary" className="text-xs">
            {selection.selectedLocationIds.length} location(s) selected
          </Badge_1.Badge>
        </div>)}

      {/* Empty state */}
      {filteredLocations.length === 0 && (<div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-2">
            <lucide_react_1.MapPin className="h-12 w-12 mx-auto text-muted-foreground opacity-50"/>
            <p className="text-sm text-muted-foreground">
              No locations to display
            </p>
            <p className="text-xs text-muted-foreground">
              Locations will appear when data is available
            </p>
          </div>
        </div>)}
    </div>);
}
