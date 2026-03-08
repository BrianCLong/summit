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
exports.default = GraphCanvas;
const react_1 = __importStar(require("react"));
const jquery_1 = __importDefault(require("jquery"));
const cytoscape_1 = __importDefault(require("cytoscape"));
const Box_1 = __importDefault(require("@mui/material/Box"));
const Menu_1 = __importDefault(require("@mui/material/Menu"));
const MenuItem_1 = __importDefault(require("@mui/material/MenuItem"));
const Button_1 = __importDefault(require("@mui/material/Button"));
const CircularProgress_1 = __importDefault(require("@mui/material/CircularProgress"));
const Typography_1 = __importDefault(require("@mui/material/Typography"));
// import { useGwGraphDataQuery, useGwSearchEntitiesLazyQuery } from '../../generated/graphql';
function GraphCanvas() {
    const containerRef = (0, react_1.useRef)(null);
    const cyRef = (0, react_1.useRef)(null);
    const [menuAnchor, setMenuAnchor] = (0, react_1.useState)(null);
    const [menuTarget, setMenuTarget] = (0, react_1.useState)(null);
    // Mock data until GraphQL queries are available
    const data = { graphData: { nodes: [], edges: [] } };
    const loading = false;
    const error = null;
    (0, react_1.useEffect)(() => {
        if (!containerRef.current)
            return;
        // Convert GraphQL data to Cytoscape elements
        let elements = [];
        if (data?.graphData) {
            const nodes = data.graphData.nodes.map((node) => ({
                data: {
                    id: node.id,
                    label: node.label,
                    type: node.type,
                    description: node.description,
                },
            }));
            const edges = data.graphData.edges.map((edge) => ({
                data: {
                    id: edge.id,
                    source: edge.fromEntityId,
                    target: edge.toEntityId,
                    label: edge.label,
                    type: edge.type,
                },
            }));
            elements = [...nodes, ...edges];
        }
        // Fallback elements if no data
        if (elements.length === 0) {
            elements = [
                { data: { id: 'a', label: 'Entity A' } },
                { data: { id: 'b', label: 'Entity B' } },
                { data: { id: 'c', label: 'Entity C' } },
                { data: { source: 'a', target: 'b' } },
                { data: { source: 'a', target: 'c' } },
            ];
        }
        const cy = (0, cytoscape_1.default)({
            container: containerRef.current,
            style: [
                {
                    selector: 'node',
                    style: {
                        'background-color': '#1976d2',
                        label: 'data(label)',
                        color: '#fff',
                        'font-size': 10,
                    },
                },
                {
                    selector: 'edge',
                    style: {
                        width: 2,
                        'line-color': '#90caf9',
                        'target-arrow-shape': 'triangle',
                        'target-arrow-color': '#90caf9',
                        'curve-style': 'bezier',
                    },
                },
            ],
            layout: { name: 'cose' },
            elements,
        });
        cyRef.current = cy;
        // jQuery: context menu binding
        const $container = (0, jquery_1.default)('#graph-root');
        const onContext = (e) => {
            e.preventDefault();
            const node = cy
                .$('node')
                .filter((n) => n.renderedBoundingBox().x1 < e.offsetX &&
                n.renderedBoundingBox().x2 > e.offsetX &&
                n.renderedBoundingBox().y1 < e.offsetY &&
                n.renderedBoundingBox().y2 > e.offsetY);
            setMenuTarget(node ? { id: node.id() } : null);
            setMenuAnchor(e.currentTarget);
        };
        $container.on('contextmenu', onContext);
        // jQuery: simple lasso (marquee)
        let lasso = false;
        let startX = 0;
        let startY = 0;
        let $marquee = null;
        $container.on('mousedown', (e) => {
            if (e.button !== 0 || e.shiftKey !== true)
                return; // hold Shift to lasso
            lasso = true;
            startX = e.pageX;
            startY = e.pageY;
            $marquee = (0, jquery_1.default)('<div/>')
                .css({
                position: 'absolute',
                border: '1px dashed #1976d2',
                background: 'rgba(25,118,210,0.1)',
                left: startX,
                top: startY,
                width: 0,
                height: 0,
                zIndex: 10,
            })
                .appendTo('body');
        });
        $container.on('mousemove', (e) => {
            if (!lasso || !$marquee)
                return;
            const x = Math.min(e.pageX, startX);
            const y = Math.min(e.pageY, startY);
            const w = Math.abs(e.pageX - startX);
            const h = Math.abs(e.pageY - startY);
            $marquee.css({ left: x, top: y, width: w, height: h });
        });
        $container.on('mouseup', (e) => {
            if (!lasso)
                return;
            lasso = false;
            if ($marquee) {
                $marquee.remove();
                $marquee = null;
            }
            const rect = {
                x1: Math.min(e.pageX, startX),
                y1: Math.min(e.pageY, startY),
                x2: Math.max(e.pageX, startX),
                y2: Math.max(e.pageY, startY),
            };
            cy.elements('node').unselect();
            cy.nodes().forEach((n) => {
                const bb = n.renderedBoundingBox();
                const cx = (bb.x1 + bb.x2) / 2;
                const cyy = (bb.y1 + bb.y2) / 2;
                if (cx >= rect.x1 && cx <= rect.x2 && cyy >= rect.y1 && cyy <= rect.y2)
                    n.select();
            });
        });
        return () => {
            $container.off('contextmenu', onContext);
            $container.off('mousedown');
            $container.off('mousemove');
            $container.off('mouseup');
            cy.destroy();
        };
    }, [data]);
    const handleExpandNeighbors = () => {
        const cy = cyRef.current;
        if (!cy || !menuTarget?.id)
            return;
        const id = menuTarget.id;
        const newId = `${id}-${Math.floor(Math.random() * 1000)}`;
        cy.add([
            { data: { id: newId, label: `N:${newId}` } },
            { data: { source: id, target: newId } },
        ]);
        cy.layout({ name: 'cose', animate: false }).run();
        setMenuAnchor(null);
    };
    const handlePinToggle = () => {
        const cy = cyRef.current;
        if (!cy || !menuTarget?.id)
            return;
        const node = cy.$id(menuTarget.id);
        node.grabbed() ? node.ungrabify() : node.grabify();
        setMenuAnchor(null);
    };
    if (loading) {
        return (<Box_1.default sx={{
                border: '1px solid #e0e0e0',
                borderRadius: 2,
                height: 600,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
        <CircularProgress_1.default />
      </Box_1.default>);
    }
    if (error && !data) {
        return (<Box_1.default sx={{
                border: '1px solid #e0e0e0',
                borderRadius: 2,
                height: 600,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
        <Typography_1.default color="error">
          Error loading graph data: {error.message}
        </Typography_1.default>
      </Box_1.default>);
    }
    return (<Box_1.default sx={{
            border: '1px solid #e0e0e0',
            borderRadius: 2,
            height: 600,
            position: 'relative',
        }}>
      <div id="graph-root" ref={containerRef} style={{ width: '100%', height: '100%' }}/>
      <Menu_1.default anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem_1.default onClick={handleExpandNeighbors}>Expand Neighbors</MenuItem_1.default>
        <MenuItem_1.default onClick={handlePinToggle}>Pin/Unpin</MenuItem_1.default>
        <MenuItem_1.default onClick={() => {
            alert(`Open details: ${menuTarget?.id}`);
            setMenuAnchor(null);
        }}>
          Open Details
        </MenuItem_1.default>
        <MenuItem_1.default onClick={() => {
            alert('Added to investigation');
            setMenuAnchor(null);
        }}>
          Add to Investigation
        </MenuItem_1.default>
      </Menu_1.default>
      <Box_1.default sx={{
            position: 'absolute',
            left: 8,
            bottom: 8,
            display: 'flex',
            gap: 1,
        }}>
        <Button_1.default size="small" variant="outlined" onClick={() => cyRef.current?.fit()}>
          Fit
        </Button_1.default>
        <Button_1.default size="small" variant="outlined" onClick={() => cyRef.current?.layout({ name: 'cose', animate: false }).run()}>
          Layout
        </Button_1.default>
        <Button_1.default size="small" variant="outlined" onClick={() => {
            if (cyRef.current) {
                const url = cyRef.current.png();
                const a = document.createElement('a');
                a.href = url;
                a.download = 'graph.png';
                a.click();
            }
        }}>
          Export PNG
        </Button_1.default>
      </Box_1.default>
    </Box_1.default>);
}
