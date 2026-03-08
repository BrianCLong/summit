"use strict";
// @ts-nocheck
/**
 * Main Map Container Component with Leaflet integration
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
exports.useMap = exports.MapContext = exports.MapContainer = void 0;
const react_1 = __importStar(require("react"));
const leaflet_1 = __importDefault(require("leaflet"));
require("leaflet/dist/leaflet.css");
const material_1 = require("@mui/material");
/**
 * Base map container component
 */
const MapContainer = ({ center = { latitude: 38.9072, longitude: -77.0369 }, // Washington DC default
zoom = 10, height = '600px', width = '100%', minZoom = 2, maxZoom = 18, onMapReady, onClick, children, }) => {
    const mapRef = (0, react_1.useRef)(null);
    const mapInstanceRef = (0, react_1.useRef)(null);
    const [isReady, setIsReady] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        if (!mapRef.current || mapInstanceRef.current) {
            return;
        }
        // Initialize map
        const map = leaflet_1.default.map(mapRef.current, {
            center: [center.latitude, center.longitude],
            zoom,
            minZoom,
            maxZoom,
            zoomControl: true,
            attributionControl: true,
        });
        // Add base layer (OpenStreetMap)
        leaflet_1.default.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19,
        }).addTo(map);
        // Click handler
        if (onClick) {
            map.on('click', onClick);
        }
        mapInstanceRef.current = map;
        setIsReady(true);
        if (onMapReady) {
            onMapReady(map);
        }
        // Cleanup
        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    // Update center when prop changes
    (0, react_1.useEffect)(() => {
        if (mapInstanceRef.current && isReady) {
            mapInstanceRef.current.setView([center.latitude, center.longitude], zoom);
        }
    }, [center.latitude, center.longitude, zoom, isReady]);
    return (<material_1.Box sx={{ position: 'relative', width, height }}>
      <div ref={mapRef} style={{
            width: '100%',
            height: '100%',
            position: 'relative',
            zIndex: 0,
        }}/>
      {isReady && children && (<exports.MapContext.Provider value={mapInstanceRef.current}>
          {children}
        </exports.MapContext.Provider>)}
    </material_1.Box>);
};
exports.MapContainer = MapContainer;
/**
 * Context for accessing map instance in child components
 */
// eslint-disable-next-line react-refresh/only-export-components
exports.MapContext = react_1.default.createContext(null);
/**
 * Hook to access map instance
 */
// eslint-disable-next-line react-refresh/only-export-components
const useMap = () => {
    const map = react_1.default.useContext(exports.MapContext);
    if (!map) {
        throw new Error('useMap must be used within a MapContainer');
    }
    return map;
};
exports.useMap = useMap;
