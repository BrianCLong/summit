/**
 * Marker Layer Component
 */

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { useMap } from '../MapContainer';
import type { GeoPoint } from '@intelgraph/geospatial';

export interface MarkerProps {
  position: GeoPoint;
  title?: string;
  icon?: L.Icon;
  popup?: string | React.ReactNode;
  onClick?: () => void;
  draggable?: boolean;
  onDragEnd?: (position: GeoPoint) => void;
}

/**
 * Single marker component
 */
export const Marker: React.FC<MarkerProps> = ({
  position,
  title,
  icon,
  popup,
  onClick,
  draggable = false,
  onDragEnd,
}) => {
  const map = useMap();
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!map) return;

    // Create marker
    const marker = L.marker([position.latitude, position.longitude], {
      title,
      icon: icon || new L.Icon.Default(),
      draggable,
    }).addTo(map);

    // Add popup if provided
    if (popup) {
      if (typeof popup === 'string') {
        marker.bindPopup(popup);
      } else {
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
  }, [map, position.latitude, position.longitude]);

  // Update marker position
  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setLatLng([position.latitude, position.longitude]);
    }
  }, [position.latitude, position.longitude]);

  return null;
};

export interface MarkerClusterLayerProps {
  markers: Array<{
    position: GeoPoint;
    id: string;
    data?: any;
  }>;
  onMarkerClick?: (id: string, data?: any) => void;
}

/**
 * Marker cluster layer for displaying many markers efficiently
 */
export const MarkerClusterLayer: React.FC<MarkerClusterLayerProps> = ({
  markers,
  onMarkerClick,
}) => {
  const map = useMap();
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!map) return;

    // Create layer group
    const layerGroup = L.layerGroup().addTo(map);
    layerGroupRef.current = layerGroup;

    // Cleanup
    return () => {
      if (layerGroupRef.current) {
        layerGroupRef.current.clearLayers();
        layerGroupRef.current.remove();
      }
    };
  }, [map]);

  useEffect(() => {
    if (!layerGroupRef.current) return;

    // Clear existing markers
    layerGroupRef.current.clearLayers();

    // Add new markers
    markers.forEach((marker) => {
      const leafletMarker = L.marker([marker.position.latitude, marker.position.longitude]);

      if (onMarkerClick) {
        leafletMarker.on('click', () => onMarkerClick(marker.id, marker.data));
      }

      leafletMarker.addTo(layerGroupRef.current!);
    });
  }, [markers, onMarkerClick]);

  return null;
};
