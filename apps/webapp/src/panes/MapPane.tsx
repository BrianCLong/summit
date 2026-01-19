import { useEffect, useRef, useState, useMemo } from 'react';
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

  // ⚡ Bolt: Optimize node lookup from O(N) to O(1) using a map.
  // This prevents expensive array searches when selecting nodes in large graphs.
  const nodeMap = useMemo(() => {
    if (!graphData) return null;
    return new Map(graphData.nodes.map((n) => [n.id, n]));
  }, [graphData]);

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
      (map as any).remove?.();
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !graphData || !markerFactoryRef.current) return;
    const map = mapRef.current;
    const stub = getTestStub();
    (map as any).__marker?.remove?.();
    if (selectedNode && nodeMap) {
      const node = nodeMap.get(selectedNode);
      if (node) {
        const marker = markerFactoryRef.current();
        marker.setLngLat(node.coords).addTo(map);
        (map as any).__marker = marker;
        map.flyTo?.({ center: node.coords, zoom: 3 });
        stub?.onNodeFocused?.(selectedNode);
      }
    }
  }, [selectedNode, nodeMap]);

  return <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />;
}
