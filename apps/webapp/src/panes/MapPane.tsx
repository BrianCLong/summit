import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { useSelector } from 'react-redux';
import { fetchGraph, GraphData } from '../data/mockGraph';
import type { RootState } from '../store';
import type { MapboxTestStub } from '../types/testing';

mapboxgl.accessToken = 'no-token';

function getTestStub(): MapboxTestStub | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.__MAPBOX_STUB__;
}

export function MapPane() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerFactoryRef = useRef<(() => any) | null>(null);
  const selectedNode = useSelector(
    (s: RootState) => s.selection.selectedNodeId,
  );
  const [graphData, setGraphData] = useState<GraphData | null>(null);

  useEffect(() => {
    const stub = getTestStub();
    const map =
      stub?.createMap?.(mapContainer.current!) ||
      new mapboxgl.Map({
        container: mapContainer.current!,
        style: 'https://demotiles.maplibre.org/style.json',
        center: [0, 0],
        zoom: 1,
      });
    mapRef.current = map;
    markerFactoryRef.current =
      stub?.createMarker || (() => new mapboxgl.Marker());
    fetchGraph().then((data) => {
      setGraphData(data);
    });

    return () => {
      (map as any).__marker?.remove?.();
      map.remove?.();
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !graphData || !markerFactoryRef.current) return;
    const map = mapRef.current;
    const stub = getTestStub();
    (map as any).__marker?.remove?.();
    if (selectedNode) {
      const node = graphData.nodes.find((n) => n.id === selectedNode);
      if (node) {
        const marker = markerFactoryRef.current();
        marker.setLngLat(node.coords).addTo(map);
        (map as any).__marker = marker;
        map.flyTo?.({ center: node.coords, zoom: 3 });
        stub?.onNodeFocused?.(selectedNode);
      }
    }
  }, [selectedNode, graphData]);

  return <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />;
}
