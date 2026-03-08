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
exports.GraphExplorer = void 0;
const react_1 = __importStar(require("react"));
const cytoscape_1 = __importDefault(require("cytoscape"));
const cytoscape_panzoom_1 = __importDefault(require("cytoscape-panzoom"));
const cytoscape_cose_bilkent_1 = __importDefault(require("cytoscape-cose-bilkent"));
cytoscape_1.default.use(cytoscape_panzoom_1.default);
cytoscape_1.default.use(cytoscape_cose_bilkent_1.default);
const clusterPalette = [
    '#1f77b4',
    '#ff7f0e',
    '#2ca02c',
    '#d62728',
    '#9467bd',
    '#8c564b',
    '#e377c2',
    '#7f7f7f',
    '#bcbd22',
    '#17becf',
];
const typePalette = clusterPalette;
const colorFor = (value, palette) => {
    const hash = Array.from(value).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return palette[hash % palette.length];
};
const GraphExplorer = ({ nodes, edges, }) => {
    const containerRef = (0, react_1.useRef)(null);
    const cyRef = (0, react_1.useRef)(null);
    const [hoverInfo, setHoverInfo] = (0, react_1.useState)(null);
    const [selectedNode, setSelectedNode] = (0, react_1.useState)(null);
    const [edgeColors, setEdgeColors] = (0, react_1.useState)({});
    const [relationshipTypes, setRelationshipTypes] = (0, react_1.useState)([]);
    (0, react_1.useEffect)(() => {
        if (!containerRef.current)
            return;
        const relTypes = Array.from(new Set(edges.map((e) => e.type)));
        setRelationshipTypes(relTypes);
        const relColorMap = {};
        relTypes.forEach((type) => {
            relColorMap[type] = colorFor(type, typePalette);
        });
        setEdgeColors(relColorMap);
        const elements = {
            nodes: nodes.map((n) => ({
                data: { ...n, color: colorFor(n.cluster || 'default', clusterPalette) },
            })),
            edges: edges.map((e) => ({
                data: { ...e, color: relColorMap[e.type] },
            })),
        };
        const cy = (0, cytoscape_1.default)({
            container: containerRef.current,
            elements,
            style: [
                {
                    selector: 'node',
                    style: {
                        label: 'data(label)',
                        'background-color': 'data(color)',
                        color: '#fff',
                        'text-valign': 'center',
                        width: 32,
                        height: 32,
                    },
                },
                {
                    selector: 'edge',
                    style: {
                        label: 'data(type)',
                        width: 2,
                        'line-color': 'data(color)',
                        'target-arrow-color': 'data(color)',
                        'target-arrow-shape': 'triangle',
                        'curve-style': 'bezier',
                    },
                },
                {
                    selector: 'edge.dimmed',
                    style: { opacity: 0.1 },
                },
                {
                    selector: 'edge.highlight',
                    style: {
                        width: 4,
                        'line-color': '#ff4136',
                        'target-arrow-color': '#ff4136',
                    },
                },
            ],
            layout: { name: 'cose-bilkent', animate: false },
        });
        cy.panzoom();
        cy.on('mouseover', 'node', (evt) => {
            const node = evt.target;
            const position = evt.renderedPosition;
            setHoverInfo({ data: node.data(), position });
        });
        cy.on('mouseout', 'node', () => setHoverInfo(null));
        cy.on('tap', 'node', (evt) => {
            setSelectedNode(evt.target.data());
        });
        cyRef.current = cy;
        return () => {
            cy.destroy();
            cyRef.current = null;
        };
    }, [nodes, edges]);
    const highlightEdges = (type) => {
        const cy = cyRef.current;
        if (!cy)
            return;
        cy.edges().addClass('dimmed').removeClass('highlight');
        cy.edges(`[type = "${type}"]`).removeClass('dimmed').addClass('highlight');
    };
    const resetHighlight = () => {
        const cy = cyRef.current;
        if (!cy)
            return;
        cy.edges().removeClass('dimmed').removeClass('highlight');
    };
    return (<div style={{ display: 'flex' }}>
      <div ref={containerRef} style={{
            flex: 1,
            height: 600,
            position: 'relative',
            border: '1px solid #ccc',
        }}>
        {hoverInfo && (<div style={{
                position: 'absolute',
                top: hoverInfo.position.y + 8,
                left: hoverInfo.position.x + 8,
                background: '#fff',
                border: '1px solid #ddd',
                padding: 4,
                pointerEvents: 'none',
                zIndex: 10,
            }}>
            <strong>{hoverInfo.data.label}</strong>
          </div>)}
      </div>
      <aside style={{ width: 260, padding: 16, borderLeft: '1px solid #ccc' }}>
        {selectedNode ? (<div>
            <h3 style={{ marginTop: 0 }}>{selectedNode.label}</h3>
            <pre style={{ whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(selectedNode.metadata, null, 2)}
            </pre>
          </div>) : (<p>Click a node to inspect its details.</p>)}
        <div>
          <h4>Legend</h4>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {relationshipTypes.map((type) => (<li key={type} onMouseEnter={() => highlightEdges(type)} onMouseLeave={resetHighlight} style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
            }}>
                <span style={{
                width: 12,
                height: 12,
                backgroundColor: edgeColors[type],
                display: 'inline-block',
            }}/>
                {type}
              </li>))}
          </ul>
        </div>
      </aside>
    </div>);
};
exports.GraphExplorer = GraphExplorer;
exports.default = exports.GraphExplorer;
