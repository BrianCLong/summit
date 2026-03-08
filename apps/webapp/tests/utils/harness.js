"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyTestHarness = applyTestHarness;
function applyTestHarness(graph, mapState) {
    window.__E2E_GRAPH__ = graph;
    window.__MAPBOX_STATE__ = mapState;
    window.__MAPBOX_STUB__ = {
        createMap: () => ({
            flyTo: (options) => {
                mapState.flyTo.push(options);
            },
        }),
        createMarker: () => {
            const marker = {
                coords: null,
                setLngLat(coords) {
                    marker.coords = coords;
                    return marker;
                },
                addTo(mapInstance) {
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
        onNodeFocused: (nodeId) => {
            mapState.focused = nodeId;
        },
    };
}
