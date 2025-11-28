import type { GraphData } from '../data/mockGraph';

export interface MapboxTestStub {
  createMap?: (container: HTMLElement) => {
    flyTo?: (options: { center: [number, number]; zoom?: number }) => void;
    __marker?: unknown;
  };
  createMarker?: () => {
    setLngLat: (coords: [number, number]) => unknown;
    addTo: (mapInstance: unknown) => unknown;
    remove?: () => void;
  };
  onNodeFocused?: (nodeId: string) => void;
}

declare global {
  interface Window {
    __E2E_GRAPH__?: GraphData;
    __MAPBOX_STUB__?: MapboxTestStub;
    __MAPBOX_STATE__?: Record<string, unknown>;
  }
}

export {};
