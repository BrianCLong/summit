"use strict";
/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck
/**
 * GeoJSON Layer Component
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
exports.ChoroplethLayer = exports.GeoJSONLayer = void 0;
const react_1 = __importStar(require("react"));
const leaflet_1 = __importDefault(require("leaflet"));
const MapContainer_1 = require("../MapContainer");
/**
 * GeoJSON layer for displaying vector features
 */
const GeoJSONLayer = ({ data, style, onFeatureClick, onEachFeature, pointToLayer, filter, }) => {
    const map = (0, MapContainer_1.useMap)();
    const layerRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        if (!map)
            return;
        const defaultStyle = {
            color: '#3388ff',
            weight: 2,
            opacity: 0.8,
            fillOpacity: 0.2,
        };
        // Create GeoJSON layer
        const geoJsonLayer = leaflet_1.default.geoJSON(data, {
            style: typeof style === 'function' ? style : style || defaultStyle,
            onEachFeature: (feature, layer) => {
                // Add click handler
                if (onFeatureClick) {
                    layer.on('click', () => onFeatureClick(feature));
                }
                // Custom feature handler
                if (onEachFeature) {
                    onEachFeature(feature, layer);
                }
                // Add popup if feature has properties
                if (feature.properties) {
                    const popupContent = Object.entries(feature.properties)
                        .map(([key, value]) => `<strong>${key}:</strong> ${value}`)
                        .join('<br>');
                    layer.bindPopup(popupContent);
                }
            },
            pointToLayer,
            filter,
        }).addTo(map);
        layerRef.current = geoJsonLayer;
        // Cleanup
        return () => {
            if (layerRef.current) {
                layerRef.current.remove();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [map]);
    // Update layer when data changes
    (0, react_1.useEffect)(() => {
        if (!layerRef.current || !map)
            return;
        // Remove old layer
        layerRef.current.remove();
        // Create new layer with updated data
        const defaultStyle = {
            color: '#3388ff',
            weight: 2,
            opacity: 0.8,
            fillOpacity: 0.2,
        };
        const geoJsonLayer = leaflet_1.default.geoJSON(data, {
            style: typeof style === 'function' ? style : style || defaultStyle,
            onEachFeature: (feature, layer) => {
                if (onFeatureClick) {
                    layer.on('click', () => onFeatureClick(feature));
                }
                if (onEachFeature) {
                    onEachFeature(feature, layer);
                }
                if (feature.properties) {
                    const popupContent = Object.entries(feature.properties)
                        .map(([key, value]) => `<strong>${key}:</strong> ${value}`)
                        .join('<br>');
                    layer.bindPopup(popupContent);
                }
            },
            pointToLayer,
            filter,
        }).addTo(map);
        layerRef.current = geoJsonLayer;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, style, onFeatureClick, onEachFeature, pointToLayer, filter]);
    return null;
};
exports.GeoJSONLayer = GeoJSONLayer;
const ChoroplethLayer = ({ data, valueProperty, colorScale, onFeatureClick, }) => {
    const style = (feature) => {
        if (!feature || !feature.properties) {
            return { fillColor: '#cccccc', weight: 1, opacity: 1, fillOpacity: 0.7 };
        }
        const value = feature.properties[valueProperty];
        const fillColor = typeof value === 'number' ? colorScale(value) : '#cccccc';
        return {
            fillColor,
            weight: 1,
            opacity: 1,
            color: 'white',
            fillOpacity: 0.7,
        };
    };
    const onEachFeature = (feature, layer) => {
        if (!feature.properties)
            return;
        layer.on({
            mouseover: (e) => {
                const layer = e.target;
                layer.setStyle({
                    weight: 3,
                    color: '#666',
                    fillOpacity: 0.9,
                });
            },
            mouseout: (e) => {
                const layer = e.target;
                layer.setStyle(style(feature));
            },
        });
    };
    return (<exports.GeoJSONLayer data={data} style={style} onFeatureClick={onFeatureClick} onEachFeature={onEachFeature}/>);
};
exports.ChoroplethLayer = ChoroplethLayer;
