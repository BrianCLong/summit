"use strict";
// @ts-nocheck
/**
 * Heatmap Layer Component
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HeatmapLayer = void 0;
const react_1 = require("react");
const leaflet_1 = __importDefault(require("leaflet"));
require("leaflet.heat");
const MapContainer_1 = require("../MapContainer");
/**
 * Heatmap layer for visualizing point density
 */
const HeatmapLayer = ({ points, radius = 25, blur = 15, maxIntensity = 1.0, minOpacity = 0.4, gradient, }) => {
    const map = (0, MapContainer_1.useMap)();
    const heatLayerRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        if (!map)
            return;
        // Default gradient (blue to red)
        const defaultGradient = {
            0.0: 'blue',
            0.25: 'cyan',
            0.5: 'lime',
            0.75: 'yellow',
            1.0: 'red',
        };
        // Convert points to heatmap format [lat, lng, intensity]
        const heatPoints = points.map((point) => [
            point.latitude,
            point.longitude,
            point.intensity || 1.0,
        ]);
        // Create heat layer
        const heatLayer = leaflet_1.default.heatLayer(heatPoints, {
            radius,
            blur,
            max: maxIntensity,
            minOpacity,
            gradient: gradient || defaultGradient,
        }).addTo(map);
        heatLayerRef.current = heatLayer;
        // Cleanup
        return () => {
            if (heatLayerRef.current) {
                heatLayerRef.current.remove();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [map]);
    // Update heatmap when points change
    (0, react_1.useEffect)(() => {
        if (!heatLayerRef.current)
            return;
        const heatPoints = points.map((point) => [
            point.latitude,
            point.longitude,
            point.intensity || 1.0,
        ]);
        heatLayerRef.current.setLatLngs(heatPoints);
    }, [points]);
    return null;
};
exports.HeatmapLayer = HeatmapLayer;
