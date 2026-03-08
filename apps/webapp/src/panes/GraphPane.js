"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphPane = GraphPane;
const react_1 = require("react");
const cytoscape_1 = __importDefault(require("cytoscape"));
const react_redux_1 = require("react-redux");
const mockGraph_1 = require("../data/mockGraph");
const store_1 = require("../store");
const telemetry_1 = require("../telemetry");
function GraphPane() {
    const containerRef = (0, react_1.useRef)(null);
    const dispatch = (0, react_redux_1.useDispatch)();
    (0, react_1.useEffect)(() => {
        (0, mockGraph_1.fetchGraph)().then((data) => {
            if (!containerRef.current)
                return;
            const cy = (0, cytoscape_1.default)({
                container: containerRef.current,
                elements: [
                    ...data.nodes.map((n) => ({ data: { id: n.id, label: n.label } })),
                    ...data.edges.map((e) => ({
                        data: { id: e.id, source: e.source, target: e.target },
                    })),
                ],
                style: [{ selector: 'node', style: { label: 'data(label)' } }],
                layout: { name: 'grid' },
            });
            cy.on('select', (evt) => dispatch((0, store_1.selectNode)(evt.target.id())));
            cy.on('unselect', () => dispatch((0, store_1.selectNode)(null)));
            const container = cy.container();
            // Native drag stub
            const onMouseUp = () => {
                document.removeEventListener('mouseup', onMouseUp);
            };
            const onMouseDown = () => {
                document.addEventListener('mouseup', onMouseUp);
            };
            container.addEventListener('mousedown', onMouseDown);
            // Native context menu stub
            const onContextMenu = (e) => {
                e.preventDefault();
            };
            container.addEventListener('contextmenu', onContextMenu);
            (0, telemetry_1.trackGoldenPathStep)('graph_pane_loaded', 'success');
        });
    }, [dispatch]);
    return <div ref={containerRef} style={{ width: '100%', height: '100%' }}/>;
}
