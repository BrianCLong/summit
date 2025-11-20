/**
 * GeoJSON Layer Component
 */

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { useMap } from '../MapContainer';
import type { FeatureCollection, Feature } from 'geojson';

export interface GeoJSONLayerProps {
  data: FeatureCollection | Feature;
  style?: L.PathOptions | ((feature?: Feature) => L.PathOptions);
  onFeatureClick?: (feature: Feature) => void;
  onEachFeature?: (feature: Feature, layer: L.Layer) => void;
  pointToLayer?: (feature: Feature, latlng: L.LatLng) => L.Layer;
  filter?: (feature: Feature) => boolean;
}

/**
 * GeoJSON layer for displaying vector features
 */
export const GeoJSONLayer: React.FC<GeoJSONLayerProps> = ({
  data,
  style,
  onFeatureClick,
  onEachFeature,
  pointToLayer,
  filter,
}) => {
  const map = useMap();
  const layerRef = useRef<L.GeoJSON | null>(null);

  useEffect(() => {
    if (!map) return;

    const defaultStyle: L.PathOptions = {
      color: '#3388ff',
      weight: 2,
      opacity: 0.8,
      fillOpacity: 0.2,
    };

    // Create GeoJSON layer
    const geoJsonLayer = L.geoJSON(data, {
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
  }, [map]);

  // Update layer when data changes
  useEffect(() => {
    if (!layerRef.current || !map) return;

    // Remove old layer
    layerRef.current.remove();

    // Create new layer with updated data
    const defaultStyle: L.PathOptions = {
      color: '#3388ff',
      weight: 2,
      opacity: 0.8,
      fillOpacity: 0.2,
    };

    const geoJsonLayer = L.geoJSON(data, {
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
  }, [data, style, onFeatureClick, onEachFeature, pointToLayer, filter]);

  return null;
};

/**
 * Choropleth layer for thematic mapping
 */
export interface ChoroplethLayerProps {
  data: FeatureCollection;
  valueProperty: string;
  colorScale: (value: number) => string;
  onFeatureClick?: (feature: Feature) => void;
}

export const ChoroplethLayer: React.FC<ChoroplethLayerProps> = ({
  data,
  valueProperty,
  colorScale,
  onFeatureClick,
}) => {
  const style = (feature?: Feature): L.PathOptions => {
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

  const onEachFeature = (feature: Feature, layer: L.Layer) => {
    if (!feature.properties) return;

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

  return (
    <GeoJSONLayer
      data={data}
      style={style}
      onFeatureClick={onFeatureClick}
      onEachFeature={onEachFeature}
    />
  );
};
