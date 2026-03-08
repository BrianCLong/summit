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
exports.MapView = MapView;
const react_1 = __importStar(require("react"));
const Button_1 = require("@/components/ui/Button");
const Tooltip_1 = require("@/components/ui/Tooltip");
const lucide_react_1 = require("lucide-react");
/**
 * MapView component for displaying geospatial data
 *
 * This is a placeholder implementation that can be replaced with:
 * - Leaflet (open-source, lightweight)
 * - Mapbox GL JS (powerful, requires API key)
 * - Google Maps (requires API key)
 *
 * For now, we provide a simple SVG-based map with basic pan/zoom
 */
function MapView({ geospatialEvents, entities, onLocationSelect, selectedLocationId, center = [0, 0], zoom: initialZoom = 1, className, }) {
    const containerRef = (0, react_1.useRef)(null);
    const svgRef = (0, react_1.useRef)(null);
    const [zoom, setZoom] = (0, react_1.useState)(initialZoom);
    const [pan, setPan] = (0, react_1.useState)({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = (0, react_1.useState)(false);
    const [dragStart, setDragStart] = (0, react_1.useState)({ x: 0, y: 0 });
    const [showLabels, setShowLabels] = (0, react_1.useState)(true);
    // Convert geospatial events to markers
    const markers = react_1.default.useMemo(() => {
        const locationEntities = entities.filter(e => e.type === 'LOCATION');
        const eventMarkers = geospatialEvents.map(event => ({
            id: event.id,
            lat: event.latitude,
            lng: event.longitude,
            label: event.type,
            type: 'event',
            selected: false,
        }));
        const entityMarkers = locationEntities.map(entity => ({
            id: entity.id,
            lat: parseFloat(entity.properties?.latitude || '0'),
            lng: parseFloat(entity.properties?.longitude || '0'),
            label: entity.name,
            type: 'location',
            selected: entity.id === selectedLocationId,
        }));
        return [...eventMarkers, ...entityMarkers];
    }, [geospatialEvents, entities, selectedLocationId]);
    // Convert lat/lng to SVG coordinates
    const latLngToXY = (0, react_1.useCallback)((lat, lng) => {
        if (!containerRef.current) {
            return { x: 0, y: 0 };
        }
        const { width, height } = containerRef.current.getBoundingClientRect();
        // Simple Mercator projection
        const x = ((lng + 180) / 360) * width * zoom + pan.x;
        const latRad = (lat * Math.PI) / 180;
        const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
        const y = (height / 2 - (mercN * height) / (2 * Math.PI)) * zoom + pan.y;
        return { x, y };
    }, [zoom, pan]);
    // Handle zoom
    const handleZoomIn = (0, react_1.useCallback)(() => {
        setZoom(prev => Math.min(prev * 1.5, 10));
    }, []);
    const handleZoomOut = (0, react_1.useCallback)(() => {
        setZoom(prev => Math.max(prev / 1.5, 0.5));
    }, []);
    const handleResetView = (0, react_1.useCallback)(() => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
    }, []);
    // Handle mouse drag for panning
    const handleMouseDown = (0, react_1.useCallback)((e) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }, [pan]);
    const handleMouseMove = (0, react_1.useCallback)((e) => {
        if (!isDragging) {
            return;
        }
        setPan({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y,
        });
    }, [isDragging, dragStart]);
    const handleMouseUp = (0, react_1.useCallback)(() => {
        setIsDragging(false);
    }, []);
    // Handle marker click
    const handleMarkerClick = (0, react_1.useCallback)((markerId) => {
        onLocationSelect?.(markerId);
    }, [onLocationSelect]);
    // Handle mouse wheel for zoom
    (0, react_1.useEffect)(() => {
        const handleWheel = (e) => {
            e.preventDefault();
            if (e.deltaY < 0) {
                handleZoomIn();
            }
            else {
                handleZoomOut();
            }
        };
        const container = containerRef.current;
        if (container) {
            container.addEventListener('wheel', handleWheel, { passive: false });
            return () => container.removeEventListener('wheel', handleWheel);
        }
    }, [handleZoomIn, handleZoomOut]);
    return (<div ref={containerRef} className={`relative bg-slate-100 dark:bg-slate-900 overflow-hidden ${className}`} role="img" aria-label="Geographic map view">
      {/* Map Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
        <Tooltip_1.Tooltip content="Zoom in">
          <Button_1.Button variant="secondary" size="sm" onClick={handleZoomIn} className="w-8 h-8 p-0" aria-label="Zoom in">
            <lucide_react_1.ZoomIn className="h-4 w-4"/>
          </Button_1.Button>
        </Tooltip_1.Tooltip>
        <Tooltip_1.Tooltip content="Zoom out">
          <Button_1.Button variant="secondary" size="sm" onClick={handleZoomOut} className="w-8 h-8 p-0" aria-label="Zoom out">
            <lucide_react_1.ZoomOut className="h-4 w-4"/>
          </Button_1.Button>
        </Tooltip_1.Tooltip>
        <Tooltip_1.Tooltip content="Reset view">
          <Button_1.Button variant="secondary" size="sm" onClick={handleResetView} className="w-8 h-8 p-0" aria-label="Reset view">
            <lucide_react_1.Locate className="h-4 w-4"/>
          </Button_1.Button>
        </Tooltip_1.Tooltip>
        <Tooltip_1.Tooltip content="Toggle labels">
          <Button_1.Button variant="secondary" size="sm" onClick={() => setShowLabels(!showLabels)} className="w-8 h-8 p-0" aria-label="Toggle labels" aria-pressed={showLabels}>
            <lucide_react_1.Layers className="h-4 w-4"/>
          </Button_1.Button>
        </Tooltip_1.Tooltip>
      </div>

      {/* Map Stats */}
      <div className="absolute top-4 left-4 bg-background/95 backdrop-blur-sm border rounded-lg p-2 shadow-lg z-10">
        <div className="flex items-center gap-2 text-xs">
          <lucide_react_1.MapPin className="h-3 w-3"/>
          <span className="font-medium">{markers.length} locations</span>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          Zoom: {zoom.toFixed(1)}x
        </div>
      </div>

      {/* SVG Map */}
      <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
        {/* Background Grid */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-slate-300 dark:text-slate-700"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)"/>

        {/* World Map Outline (Simplified) */}
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Continents (simplified outlines) */}
          <path d="M 300,200 Q 350,180 400,200 L 450,250 L 400,300 L 300,280 Z" fill="currentColor" className="text-slate-300 dark:text-slate-700" opacity="0.3"/>
          <path d="M 150,150 Q 200,130 250,150 L 280,200 L 250,250 L 150,230 Z" fill="currentColor" className="text-slate-300 dark:text-slate-700" opacity="0.3"/>
          <path d="M 500,300 Q 550,280 600,300 L 650,350 L 600,400 L 500,380 Z" fill="currentColor" className="text-slate-300 dark:text-slate-700" opacity="0.3"/>
        </g>

        {/* Markers */}
        {markers.map(marker => {
            const { x, y } = latLngToXY(marker.lat, marker.lng);
            const isSelected = marker.selected;
            return (<g key={marker.id} transform={`translate(${x}, ${y})`} className="cursor-pointer transition-all hover:scale-110" onClick={() => handleMarkerClick(marker.id)} role="button" tabIndex={0} aria-label={`Location: ${marker.label}`}>
              {/* Marker Pin */}
              <circle cx="0" cy="0" r={isSelected ? 8 : 6} fill={isSelected ? '#3b82f6' : '#10b981'} stroke="white" strokeWidth="2" className="drop-shadow-lg"/>

              {/* Pulse animation for selected */}
              {isSelected && (<circle cx="0" cy="0" r="8" fill="none" stroke="#3b82f6" strokeWidth="2" opacity="0">
                  <animate attributeName="r" from="8" to="20" dur="1.5s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" from="0.8" to="0" dur="1.5s" repeatCount="indefinite"/>
                </circle>)}

              {/* Label */}
              {showLabels && (<text x="0" y="-12" fontSize="10" fontWeight={isSelected ? 'bold' : 'normal'} textAnchor="middle" fill="currentColor" className="text-foreground pointer-events-none select-none drop-shadow">
                  {marker.label}
                </text>)}

              {/* Connection Lines (if selected) */}
              {isSelected && (<circle cx="0" cy="0" r="12" fill="none" stroke="#3b82f6" strokeWidth="1" strokeDasharray="2,2" opacity="0.5"/>)}
            </g>);
        })}
      </svg>

      {/* Empty State */}
      {markers.length === 0 && (<div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-2">
            <lucide_react_1.MapPin className="h-12 w-12 mx-auto text-muted-foreground"/>
            <p className="text-sm text-muted-foreground">
              No geospatial data available
            </p>
            <p className="text-xs text-muted-foreground">
              Add location entities or geospatial events to see them on the map
            </p>
          </div>
        </div>)}

      {/* Legend */}
      {markers.length > 0 && (<div className="absolute bottom-4 left-4 bg-background/95 backdrop-blur-sm border rounded-lg p-3 shadow-lg space-y-2 text-xs">
          <div className="font-semibold mb-2">Legend</div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-white"/>
            <span>Events</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white"/>
            <span>Selected</span>
          </div>
        </div>)}

      {/* Instructions */}
      <div className="absolute bottom-4 right-4 bg-background/95 backdrop-blur-sm border rounded-lg p-2 shadow-lg text-xs text-muted-foreground max-w-[200px]">
        <div>• Drag to pan</div>
        <div>• Scroll to zoom</div>
        <div>• Click marker to select</div>
      </div>
    </div>);
}
