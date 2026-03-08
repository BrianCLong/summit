"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const cytoscape_1 = __importDefault(require("cytoscape"));
const jquery_1 = __importDefault(require("jquery"));
const react_redux_1 = require("react-redux");
const graphSlice_1 = require("../store/graphSlice");
const socket_io_client_1 = require("socket.io-client");
/**
 * GraphCanvas mounts a Cytoscape instance and wires up
 * jQuery interactions plus live updates via Socket.IO.
 * It manages basic drag events and listens for backend
 * node/edge additions, dispatching them into Redux.
 */
const GraphCanvas = () => {
    const containerRef = (0, react_1.useRef)(null);
    const dispatch = (0, react_redux_1.useDispatch)();
    const graph = (0, react_redux_1.useSelector)((s) => s.graphData);
    const socketRef = (0, react_1.useRef)(null);
    const cyRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        if (!containerRef.current)
            return;
        // BOLT: Persistent Cytoscape instance prevents full re-initialization on every graph update.
        // This avoids expensive destroy/recreate cycles and redundant Socket.IO connections.
        const cy = (cyRef.current = (0, cytoscape_1.default)({
            container: containerRef.current,
            style: [{ selector: 'node', style: { label: 'data(id)' } }],
            layout: { name: 'grid' },
        }));
        // jQuery wrapper for simple drag feedback
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (0, jquery_1.default)(cy.container()).on('mouseup', 'node', (evt) => {
            const n = evt.target;
            dispatch((0, graphSlice_1.addNode)({
                data: { id: n.id() },
                position: n.position(),
            }));
        });
        socketRef.current = (0, socket_io_client_1.io)();
        socketRef.current.on('graph:add-node', (n) => dispatch((0, graphSlice_1.addNode)(n)));
        socketRef.current.on('graph:add-edge', (e) => dispatch((0, graphSlice_1.addEdge)(e)));
        return () => {
            cy.destroy();
            socketRef.current?.disconnect();
        };
    }, [dispatch]);
    (0, react_1.useEffect)(() => {
        // BOLT: Use incremental updates via cy.json() and re-running the layout.
        // This is significantly more efficient than recreating the entire Cytoscape instance.
        if (cyRef.current) {
            cyRef.current.json({
                elements: [...graph.nodes, ...graph.edges],
            });
            cyRef.current.layout({ name: 'grid' }).run();
        }
    }, [graph.nodes, graph.edges]);
    return <div ref={containerRef} style={{ width: '100%', height: '100%' }}/>;
};
exports.default = GraphCanvas;
