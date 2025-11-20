/**
 * Heatmap Layer Component
 */

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet.heat';
import { useMap } from '../MapContainer';
import type { GeoPoint } from '@intelgraph/geospatial';

declare module 'leaflet' {
  function heatLayer(
    latlngs: Array<[number, number, number?]>,
    options?: HeatMapOptions
  ): HeatLayer;

  interface HeatLayer extends Layer {
    setLatLngs(latlngs: Array<[number, number, number?]>): this;
    addLatLng(latlng: [number, number, number?]): this;
  }

  interface HeatMapOptions {
    minOpacity?: number;
    maxZoom?: number;
    max?: number;
    radius?: number;
    blur?: number;
    gradient?: { [key: number]: string };
  }
}

export interface HeatmapPoint extends GeoPoint {
  intensity?: number; // 0-1, defaults to 1
}

export interface HeatmapLayerProps {
  points: HeatmapPoint[];
  radius?: number;
  blur?: number;
  maxIntensity?: number;
  minOpacity?: number;
  gradient?: { [key: number]: string };
}

/**
 * Heatmap layer for visualizing point density
 */
export const HeatmapLayer: React.FC<HeatmapLayerProps> = ({
  points,
  radius = 25,
  blur = 15,
  maxIntensity = 1.0,
  minOpacity = 0.4,
  gradient,
}) => {
  const map = useMap();
  const heatLayerRef = useRef<L.HeatLayer | null>(null);

  useEffect(() => {
    if (!map) return;

    // Default gradient (blue to red)
    const defaultGradient = {
      0.0: 'blue',
      0.25: 'cyan',
      0.5: 'lime',
      0.75: 'yellow',
      1.0: 'red',
    };

    // Convert points to heatmap format [lat, lng, intensity]
    const heatPoints: Array<[number, number, number]> = points.map((point) => [
      point.latitude,
      point.longitude,
      point.intensity || 1.0,
    ]);

    // Create heat layer
    const heatLayer = L.heatLayer(heatPoints, {
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
  }, [map]);

  // Update heatmap when points change
  useEffect(() => {
    if (!heatLayerRef.current) return;

    const heatPoints: Array<[number, number, number]> = points.map((point) => [
      point.latitude,
      point.longitude,
      point.intensity || 1.0,
    ]);

    heatLayerRef.current.setLatLngs(heatPoints);
  }, [points]);

  return null;
};
