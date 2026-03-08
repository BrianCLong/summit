"use strict";
// @ts-nocheck
/**
 * Marker Layer Component
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarkerClusterLayer = exports.Marker = void 0;
const react_1 = require("react");
const leaflet_1 = __importDefault(require("leaflet"));
const MapContainer_1 = require("../MapContainer");
/**
 * Single marker component
 */
const Marker = ({ position, title, icon, popup, onClick, draggable = false, onDragEnd, }) => {
    const map = (0, MapContainer_1.useMap)();
    const markerRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        if (!map)
            return;
        // Create marker
        const marker = leaflet_1.default.marker([position.latitude, position.longitude], {
            title,
            icon: icon || new leaflet_1.default.Icon.Default(),
            draggable,
        }).addTo(map);
        // Add popup if provided
        if (popup) {
            if (typeof popup === 'string') {
                marker.bindPopup(popup);
            }
            else {
                const popupDiv = document.createElement('div');
                marker.bindPopup(popupDiv);
                // For React components, you'd need to render using ReactDOM
            }
        }
        // Click handler
        if (onClick) {
            marker.on('click', onClick);
        }
        // Drag end handler
        if (onDragEnd) {
            marker.on('dragend', (e) => {
                const newPos = e.target.getLatLng();
                onDragEnd({ latitude: newPos.lat, longitude: newPos.lng });
            });
        }
        markerRef.current = marker;
        // Cleanup
        return () => {
            if (markerRef.current) {
                markerRef.current.remove();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [map, position.latitude, position.longitude]);
    // Update marker position
    (0, react_1.useEffect)(() => {
        if (markerRef.current) {
            markerRef.current.setLatLng([position.latitude, position.longitude]);
        }
    }, [position.latitude, position.longitude]);
    return null;
};
exports.Marker = Marker;
/**
 * Marker cluster layer for displaying many markers efficiently
 */
const MarkerClusterLayer = ({ markers, onMarkerClick, }) => {
    const map = (0, MapContainer_1.useMap)();
    const layerGroupRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        if (!map)
            return;
        // Create layer group
        const layerGroup = leaflet_1.default.layerGroup().addTo(map);
        layerGroupRef.current = layerGroup;
        // Cleanup
        return () => {
            if (layerGroupRef.current) {
                layerGroupRef.current.clearLayers();
                layerGroupRef.current.remove();
            }
        };
    }, [map]);
    (0, react_1.useEffect)(() => {
        if (!layerGroupRef.current)
            return;
        // Clear existing markers
        layerGroupRef.current.clearLayers();
        // Add new markers
        markers.forEach((marker) => {
            const leafletMarker = leaflet_1.default.marker([marker.position.latitude, marker.position.longitude]);
            if (onMarkerClick) {
                leafletMarker.on('click', () => onMarkerClick(marker.id, marker.data));
            }
            leafletMarker.addTo(layerGroupRef.current);
        });
    }, [markers, onMarkerClick]);
    return null;
};
exports.MarkerClusterLayer = MarkerClusterLayer;
