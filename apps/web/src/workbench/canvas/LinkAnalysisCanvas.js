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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LinkAnalysisCanvas = LinkAnalysisCanvas;
const react_1 = __importStar(require("react"));
const d3 = __importStar(require("d3"));
const viewStore_1 = require("../store/viewStore");
function LinkAnalysisCanvas({ nodes: initialNodes, edges: initialEdges }) {
    const svgRef = (0, react_1.useRef)(null);
    const wrapperRef = (0, react_1.useRef)(null);
    const { selectedEntityIds, selectEntity } = (0, viewStore_1.useWorkbenchStore)();
    // D3 State
    const simulationRef = (0, react_1.useRef)(null);
    // Transform state for zoom/pan
    const transformRef = (0, react_1.useRef)(d3.zoomIdentity);
    (0, react_1.useEffect)(() => {
        if (!svgRef.current || !wrapperRef.current)
            return;
        const width = wrapperRef.current.clientWidth;
        const height = wrapperRef.current.clientHeight;
        const svg = d3.select(svgRef.current)
            .attr('width', width)
            .attr('height', height)
            .attr('viewBox', [0, 0, width, height]);
        // Clear previous
        svg.selectAll('*').remove();
        const g = svg.append('g');
        // Zoom behavior
        const zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
            g.attr('transform', event.transform);
            transformRef.current = event.transform;
        });
        svg.call(zoom);
        // Data preparation
        const nodes = initialNodes.map(n => ({ ...n, entity: n }));
        const links = initialEdges.map(e => ({ ...e, relationship: e, source: e.sourceId, target: e.targetId }));
        // Simulation
        const simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id((d) => d.id).distance(100))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collide', d3.forceCollide(30));
        simulationRef.current = simulation;
        // Render Links
        const link = g.append('g')
            .selectAll('line')
            .data(links)
            .join('line')
            .attr('stroke', '#999')
            .attr('stroke-opacity', 0.6)
            .attr('stroke-width', 2);
        // Render Nodes
        const node = g.append('g')
            .selectAll('g')
            .data(nodes)
            .join('g')
            .attr('class', 'node')
            .call(d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended));
        // Node circles
        node.append('circle')
            .attr('r', 20)
            .attr('fill', d => getTypeColor(d.entity.type))
            .attr('stroke', '#fff')
            .attr('stroke-width', 1.5);
        // Node labels
        node.append('text')
            .text(d => d.entity.name.substring(0, 10))
            .attr('x', 22)
            .attr('y', 5)
            .style('font-size', '10px')
            .style('pointer-events', 'none');
        // Click handler
        node.on('click', (event, d) => {
            if (event.defaultPrevented)
                return; // Dragged
            const multi = event.shiftKey || event.metaKey;
            selectEntity(d.id, multi);
        });
        // Selection styling update
        simulation.on('tick', () => {
            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);
            node
                .attr('transform', d => `translate(${d.x},${d.y})`);
        });
        function dragstarted(event, d) {
            if (!event.active)
                simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }
        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }
        function dragended(event, d) {
            if (!event.active)
                simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }
        return () => {
            simulation.stop();
        };
    }, [initialNodes, initialEdges, selectEntity]);
    // Effect to update selection visuals without re-running simulation
    (0, react_1.useEffect)(() => {
        if (!svgRef.current)
            return;
        const svg = d3.select(svgRef.current);
        svg.selectAll('.node circle')
            .attr('stroke', (d) => selectedEntityIds.includes(d.id) ? '#fbbf24' : '#fff') // Yellow selection
            .attr('stroke-width', (d) => selectedEntityIds.includes(d.id) ? 3 : 1.5);
    }, [selectedEntityIds]);
    function getTypeColor(type) {
        const colors = {
            PERSON: '#3b82f6',
            ORGANIZATION: '#8b5cf6',
            LOCATION: '#10b981',
            default: '#6b7280'
        };
        return colors[type] || colors.default;
    }
    return (<div ref={wrapperRef} className="w-full h-full bg-slate-50 relative overflow-hidden">
      <svg ref={svgRef} className="w-full h-full block"/>
      {/* Context Menu implementation would go here using Radix Primitives wrapping the SVG or specific nodes */}
    </div>);
}
