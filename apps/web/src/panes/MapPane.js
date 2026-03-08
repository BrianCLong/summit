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
exports.MapPane = void 0;
const react_1 = __importStar(require("react"));
const react_leaflet_1 = require("react-leaflet");
require("leaflet/dist/leaflet.css");
const workspaceStore_1 = require("../store/workspaceStore");
const config_1 = require("../config");
const isPositiveInteger = (value) => {
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : undefined;
};
const CLUSTERING_FEATURE_ENABLED = (0, config_1.isFeatureEnabled)('ui.mapClustering');
const MAP_PAGE_SIZE = isPositiveInteger(typeof import.meta !== 'undefined' ? import.meta.env?.VITE_MAP_MARKER_PAGE_SIZE : undefined) ||
    isPositiveInteger(typeof process !== 'undefined' ? process.env?.VITE_MAP_MARKER_PAGE_SIZE : undefined) ||
    50;
const getZoomPrecision = (zoom) => {
    if (zoom >= 13)
        return 3;
    if (zoom >= 10)
        return 2;
    if (zoom >= 6)
        return 1;
    return 0;
};
const NO_CLUSTERING_ZOOM = 13;
const clusterMarkers = (entities, zoom) => {
    if (zoom >= NO_CLUSTERING_ZOOM) {
        return [...entities];
    }
    const precision = getZoomPrecision(zoom);
    const clusterMap = new Map();
    for (const entity of entities) {
        if (entity.lat === undefined || entity.lng === undefined)
            continue;
        const key = `${entity.lat.toFixed(precision)}:${entity.lng.toFixed(precision)}`;
        const existing = clusterMap.get(key);
        if (!existing) {
            clusterMap.set(key, {
                latSum: entity.lat,
                lngSum: entity.lng,
                count: 1,
                members: [entity],
            });
        }
        else {
            existing.latSum += entity.lat;
            existing.lngSum += entity.lng;
            existing.count += 1;
            existing.members.push(entity);
        }
    }
    const clusters = [];
    for (const [key, aggregate] of clusterMap.entries()) {
        if (aggregate.count === 1) {
            clusters.push({ ...aggregate.members[0] });
            continue;
        }
        clusters.push({
            id: `cluster-${key}`,
            lat: aggregate.latSum / aggregate.count,
            lng: aggregate.lngSum / aggregate.count,
            count: aggregate.count,
            memberIds: aggregate.members.map((member) => member.id),
            label: `${aggregate.count} entities`,
            isCluster: true,
        });
    }
    return clusters.sort((a, b) => {
        const countA = 'isCluster' in a && a.isCluster ? a.count : 1;
        const countB = 'isCluster' in b && b.isCluster ? b.count : 1;
        if (countA !== countB) {
            return countB - countA;
        }
        return a.id.localeCompare(b.id);
    });
};
// Component to handle map centering based on selection
const MapUpdater = ({ selectedIds, entities }) => {
    const map = (0, react_leaflet_1.useMap)();
    (0, react_1.useEffect)(() => {
        if (selectedIds.length > 0) {
            const selectedEntities = entities.filter(e => selectedIds.includes(e.id) && e.lat && e.lng);
            if (selectedEntities.length > 0) {
                const bounds = selectedEntities.map(e => [e.lat, e.lng]);
                map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
            }
        }
    }, [selectedIds, entities, map]);
    return null;
};
const ZoomWatcher = ({ onZoomChange }) => {
    const map = (0, react_leaflet_1.useMapEvents)({
        zoomend: () => onZoomChange(map.getZoom()),
    });
    (0, react_1.useEffect)(() => {
        onZoomChange(map.getZoom());
    }, [map, onZoomChange]);
    return null;
};
const MarkerLayer = ({ markers, selectedIds, onSelect, }) => {
    const map = (0, react_leaflet_1.useMap)();
    return (<>
      {markers.map((marker) => {
            const isCluster = 'isCluster' in marker && marker.isCluster;
            const isSelected = selectedIds.includes(marker.id);
            const radius = isCluster
                ? Math.min(18, 6 + Math.log2(marker.count + 1) * 3)
                : isSelected
                    ? 8
                    : 5;
            const center = [marker.lat, marker.lng];
            return (<react_leaflet_1.CircleMarker key={marker.id} center={center} radius={radius} pathOptions={{
                    color: isCluster ? '#f59e0b' : isSelected ? '#22d3ee' : '#94a3b8',
                    fillColor: isCluster ? '#facc15' : isSelected ? '#06b6d4' : '#475569',
                    fillOpacity: 0.8,
                    weight: isCluster ? 2 : isSelected ? 2 : 1,
                }} data-cluster={isCluster ? 'true' : 'false'} eventHandlers={{
                    click: () => {
                        if (isCluster) {
                            const nextZoom = Math.min(map.getZoom() + 2, 16);
                            map.setView(center, nextZoom);
                        }
                        else {
                            onSelect(marker.id);
                        }
                    },
                }}>
            <react_leaflet_1.Popup className="map-popup">
              <div className="text-slate-900">
                {isCluster ? (<>
                    <strong className="block border-b border-slate-200 pb-1 mb-1">
                      {marker.label}
                    </strong>
                    <span className="text-xs">
                      Includes {marker.memberIds.length} nearby points.
                      Zoom in to expand.
                    </span>
                  </>) : (<>
                    <strong className="block border-b border-slate-200 pb-1 mb-1">{marker.label}</strong>
                    <span className="text-xs">{marker.type}</span>
                    <p className="text-xs mt-1 text-slate-600">{marker.description}</p>
                  </>)}
              </div>
            </react_leaflet_1.Popup>
          </react_leaflet_1.CircleMarker>);
        })}
    </>);
};
const MapPane = () => {
    const { entities, selectedEntityIds, selectEntity, isSyncing, syncError, retrySync } = (0, workspaceStore_1.useWorkspaceStore)();
    const [clusteringEnabled, setClusteringEnabled] = (0, react_1.useState)(CLUSTERING_FEATURE_ENABLED);
    const [zoomLevel, setZoomLevel] = (0, react_1.useState)(2);
    const [page, setPage] = (0, react_1.useState)(1);
    const pageSize = MAP_PAGE_SIZE;
    // Syncing indicator logic
    const [showSyncing, setShowSyncing] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        let timer;
        if (isSyncing) {
            timer = setTimeout(() => setShowSyncing(true), 250);
        }
        else {
            setShowSyncing(false);
        }
        return () => clearTimeout(timer);
    }, [isSyncing]);
    const markers = (0, react_1.useMemo)(() => {
        return entities.filter(e => e.lat && e.lng);
    }, [entities]);
    const renderableMarkers = (0, react_1.useMemo)(() => {
        if (!CLUSTERING_FEATURE_ENABLED || !clusteringEnabled) {
            return markers;
        }
        return clusterMarkers(markers, zoomLevel);
    }, [clusteringEnabled, markers, zoomLevel]);
    const totalPages = (0, react_1.useMemo)(() => {
        if (!CLUSTERING_FEATURE_ENABLED) {
            return 1;
        }
        return Math.max(1, Math.ceil(renderableMarkers.length / pageSize));
    }, [pageSize, renderableMarkers.length]);
    (0, react_1.useEffect)(() => {
        setPage(1);
    }, [renderableMarkers]);
    const pagedMarkers = (0, react_1.useMemo)(() => {
        if (!CLUSTERING_FEATURE_ENABLED) {
            return renderableMarkers;
        }
        const start = (page - 1) * pageSize;
        return renderableMarkers.slice(start, start + pageSize);
    }, [page, pageSize, renderableMarkers]);
    const handleToggleClustering = (0, react_1.useCallback)(() => {
        setClusteringEnabled((prev) => !prev);
    }, []);
    const handleZoomChange = (0, react_1.useCallback)((nextZoom) => {
        setZoomLevel(Math.max(0, nextZoom));
    }, []);
    return (<div className="w-full h-full relative bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex flex-col">
      <div className="absolute top-2 left-2 z-[1000] bg-slate-900/80 backdrop-blur px-3 py-1 rounded text-xs font-mono text-cyan-400 border border-cyan-900/50">
        GEOSPATIAL INTELLIGENCE
      </div>

      {/* Syncing Indicator */}
      {showSyncing && (<div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-[2000] bg-yellow-500/80 text-black px-2 py-1 rounded text-xs font-bold animate-pulse">
                Syncing...
            </div>)}

      {/* Error Banner */}
      {syncError && (<div className="absolute top-12 left-1/2 transform -translate-x-1/2 z-[3000] bg-red-900/90 border border-red-500 text-white px-4 py-3 rounded shadow-lg flex flex-col items-center gap-2">
                 <div className="font-bold text-sm">Couldn’t refresh results</div>
                 <div className="text-xs">Your selected time range is unchanged.</div>
                 <button onClick={retrySync} className="bg-red-700 hover:bg-red-600 px-3 py-1 rounded text-xs font-semibold transition-colors">
                     Retry
                 </button>
             </div>)}

      <react_leaflet_1.MapContainer center={[20, 0]} zoom={2} style={{ height: '100%', width: '100%', background: '#0f172a' }} className="z-0">
        <react_leaflet_1.TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>' url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"/>
        <MarkerLayer markers={pagedMarkers} selectedIds={selectedEntityIds} onSelect={selectEntity}/>
        <ZoomWatcher onZoomChange={handleZoomChange}/>
        <MapUpdater selectedIds={selectedEntityIds} entities={entities}/>
      </react_leaflet_1.MapContainer>

      {CLUSTERING_FEATURE_ENABLED && (<div className="absolute top-2 right-2 z-[1000] bg-slate-900/80 backdrop-blur px-3 py-2 rounded text-xs text-slate-100 border border-slate-700 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="font-semibold">Clustering</div>
            <label className="inline-flex items-center gap-2 cursor-pointer" aria-label="Clustering toggle">
              <span className="text-[11px] text-slate-300">Off</span>
              <input type="checkbox" checked={clusteringEnabled} onChange={handleToggleClustering} data-testid="clustering-toggle"/>
              <span className="text-[11px] text-slate-300">On</span>
            </label>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="text-[11px] text-slate-300">
              Showing {pagedMarkers.length} of {renderableMarkers.length} markers
            </div>
            <div className="flex items-center gap-1">
              <button className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-[11px] disabled:opacity-50" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page === 1} data-testid="page-previous">
                Prev
              </button>
              <div className="px-2 text-[11px]" data-testid="page-indicator">
                Page {page} / {totalPages}
              </div>
              <button className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-[11px] disabled:opacity-50" onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} disabled={page === totalPages} data-testid="page-next">
                Next
              </button>
            </div>
          </div>
        </div>)}
    </div>);
};
exports.MapPane = MapPane;
