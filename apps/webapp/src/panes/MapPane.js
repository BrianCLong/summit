"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MapPane = MapPane;
const react_1 = require("react");
const mapbox_gl_1 = __importDefault(require("mapbox-gl"));
const react_redux_1 = require("react-redux");
const mockGraph_1 = require("../data/mockGraph");
const telemetry_1 = require("../telemetry");
mapbox_gl_1.default.accessToken = 'no-token';
function getTestStub() {
    if (typeof window === 'undefined')
        return undefined;
    return window.__MAPBOX_STUB__;
}
function MapPane() {
    const mapContainer = (0, react_1.useRef)(null);
    const mapRef = (0, react_1.useRef)(null);
    const markerFactoryRef = (0, react_1.useRef)(null);
    const selectedNode = (0, react_redux_1.useSelector)((s) => s.selection.selectedNodeId);
    const [graphData, setGraphData] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        const stub = getTestStub();
        const map = stub?.createMap?.(mapContainer.current) ||
            new mapbox_gl_1.default.Map({
                container: mapContainer.current,
                style: 'https://demotiles.maplibre.org/style.json',
                center: [0, 0],
                zoom: 1,
            });
        mapRef.current = map;
        markerFactoryRef.current =
            stub?.createMarker || (() => new mapbox_gl_1.default.Marker());
        (0, mockGraph_1.fetchGraph)().then((data) => {
            setGraphData(data);
            (0, telemetry_1.trackGoldenPathStep)('map_pane_loaded', 'success');
        });
        return () => {
            map.__marker?.remove?.();
            map.remove?.();
        };
    }, []);
    (0, react_1.useEffect)(() => {
        if (!mapRef.current || !graphData || !markerFactoryRef.current)
            return;
        const map = mapRef.current;
        const stub = getTestStub();
        map.__marker?.remove?.();
        if (selectedNode) {
            const node = graphData.nodes.find((n) => n.id === selectedNode);
            if (node) {
                const marker = markerFactoryRef.current();
                marker.setLngLat(node.coords).addTo(map);
                map.__marker = marker;
                map.flyTo?.({ center: node.coords, zoom: 3 });
                stub?.onNodeFocused?.(selectedNode);
            }
        }
    }, [selectedNode, graphData]);
    return <div ref={mapContainer} style={{ width: '100%', height: '100%' }}/>;
}
