import type { GraphData } from '../../src/data/mockGraph';
import type { MapboxStubState } from './mapboxStub';

export function applyTestHarness(
  graph: GraphData,
  mapState: MapboxStubState,
) {
  (window as any).__E2E_GRAPH__ = graph;
  (window as any).__MAPBOX_STATE__ = mapState;
  (window as any).__MAPBOX_STUB__ = {
    createMap: () => ({
      flyTo: (options: { center: [number, number]; zoom?: number }) => {
        mapState.flyTo.push(options);
      },
    }),
    createMarker: () => {
      const marker = {
        coords: null as [number, number] | null,
        setLngLat(coords: [number, number]) {
          marker.coords = coords;
          return marker;
        },
        addTo(mapInstance: unknown) {
          if (marker.coords) {
            mapState.markers.push(marker.coords);
          }
          return mapInstance;
        },
        remove() {
          mapState.removals += 1;
        },
      };
      return marker;
    },
    onNodeFocused: (nodeId: string) => {
      mapState.focused = nodeId;
    },
  };
}
