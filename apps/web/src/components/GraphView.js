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
exports.GraphView = void 0;
const react_1 = __importStar(require("react"));
const d3_selection_1 = require("d3-selection");
const d3_force_1 = require("d3-force");
const d3_zoom_1 = require("d3-zoom");
const d3_drag_1 = require("d3-drag");
const utils_1 = require("@/lib/utils");
/**
 * GraphView component with full ARIA support and keyboard navigation.
 * Targets WCAG AA compliance and Lighthouse 95+.
 */
const GraphView = ({ entities, relationships, layout = { type: 'force', settings: {} }, onEntitySelect, selectedEntityId, className, }) => {
    const svgRef = (0, react_1.useRef)(null);
    const [dimensions, setDimensions] = (0, react_1.useState)({ width: 800, height: 600 });
    // Update dimensions on resize
    (0, react_1.useEffect)(() => {
        const updateDimensions = () => {
            if (svgRef.current) {
                const rect = svgRef.current.parentElement?.getBoundingClientRect();
                if (rect) {
                    setDimensions({ width: rect.width, height: rect.height });
                }
            }
        };
        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);
    (0, react_1.useEffect)(() => {
        if (!svgRef.current || entities.length === 0)
            return;
        const svg = (0, d3_selection_1.select)(svgRef.current);
        svg.selectAll('.graph-content').remove();
        const { width, height } = dimensions;
        // Data preparation
        const nodes = entities.map(entity => ({
            id: entity.id,
            entity,
        }));
        const links = relationships
            .filter(rel => {
            const sourceNode = nodes.find(n => n.id === rel.sourceId);
            const targetNode = nodes.find(n => n.id === rel.targetId);
            return sourceNode && targetNode;
        })
            .map(rel => ({
            id: rel.id,
            relationship: rel,
            source: nodes.find(n => n.id === rel.sourceId),
            target: nodes.find(n => n.id === rel.targetId),
        }));
        // Simulation setup
        const simulation = (0, d3_force_1.forceSimulation)(nodes)
            .force('link', (0, d3_force_1.forceLink)(links)
            .id(d => d.id)
            .distance(120))
            .force('charge', (0, d3_force_1.forceManyBody)().strength(-400))
            .force('center', (0, d3_force_1.forceCenter)(width / 2, height / 2))
            .force('collision', (0, d3_force_1.forceCollide)().radius(50));
        const g = svg.append('g').attr('class', 'graph-content');
        // Zoom behavior
        const zoomBehavior = (0, d3_zoom_1.zoom)()
            .scaleExtent([0.1, 4])
            .on('zoom', event => {
            g.attr('transform', event.transform);
        });
        svg.call(zoomBehavior);
        // Render Links
        const link = g
            .append('g')
            .attr('class', 'links')
            .selectAll('line')
            .data(links)
            .enter()
            .append('line')
            .attr('role', 'graphics-symbol')
            .attr('aria-label', d => `Relationship: ${d.relationship.type} from ${d.source.entity.name} to ${d.target.entity.name}`)
            .attr('stroke', '#94a3b8')
            .attr('stroke-opacity', 0.6)
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', d => d.relationship.properties?.style === 'dashed' || d.relationship.type === 'narrative' ? '5,5' : 'none');
        // Render Nodes
        const node = g
            .append('g')
            .attr('class', 'nodes')
            .selectAll('g')
            .data(nodes)
            .enter()
            .append('g')
            .attr('class', 'node')
            .attr('role', 'graphics-symbol')
            .attr('tabindex', 0) // Enable keyboard navigation
            .attr('aria-label', d => `Entity: ${d.entity.name}, Type: ${d.entity.type}${d.entity.properties?.drift ? ', State: Drift' : ''}`)
            .style('cursor', 'pointer')
            .call((0, d3_drag_1.drag)()
            .on('start', (event, d) => {
            if (!event.active)
                simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        })
            .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
        })
            .on('end', (event, d) => {
            if (!event.active)
                simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }));
        // Node circles with WCAG AA contrast colors
        node
            .append('circle')
            .attr('r', 25)
            .attr('fill', d => d.entity.properties?.drift ? '#d32f2f' : getEntityColor(d.entity.type))
            .attr('stroke', d => selectedEntityId === d.entity.id ? '#fbbf24' : '#fff')
            .attr('stroke-width', d => selectedEntityId === d.entity.id ? 4 : 2)
            .attr('class', 'transition-all duration-200');
        // Node initial/icon
        node
            .append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '.35em')
            .attr('fill', '#ffffff')
            .attr('font-size', '14px')
            .attr('font-weight', 'bold')
            .style('pointer-events', 'none')
            .text(d => d.entity.name.charAt(0));
        // Node labels
        node
            .append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '40px')
            .attr('fill', '#1e293b')
            .attr('font-size', '12px')
            .attr('font-weight', '600')
            .style('pointer-events', 'none')
            .text(d => d.entity.name);
        // Event handlers
        node.on('click', (event, d) => {
            onEntitySelect?.(d.entity);
        });
        // Keyboard navigation: Enter or Space to select
        node.on('keydown', (event, d) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onEntitySelect?.(d.entity);
            }
        });
        // Tick function
        simulation.on('tick', () => {
            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);
            node.attr('transform', d => `translate(${d.x},${d.y})`);
        });
        return () => {
            simulation.stop();
        };
    }, [entities, relationships, dimensions, selectedEntityId, onEntitySelect]);
    const getEntityColor = (type) => {
        const colors = {
            PERSON: '#2563eb', // Blue 600
            ORGANIZATION: '#7c3aed', // Violet 600
            LOCATION: '#059669', // Emerald 600
            SYSTEM: '#4b5563', // Gray 600
            default: '#64748b',
        };
        return colors[type] || colors.default;
    };
    const driftCount = (0, react_1.useMemo)(() => entities.filter(e => e.properties?.drift).length, [entities]);
    return (<div className={(0, utils_1.cn)('relative w-full h-full flex flex-col overflow-hidden', className)}>
      <svg ref={svgRef} className="w-full flex-1 bg-slate-50 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg" role="img" aria-label="Org Mesh graph: entities & drift edges" aria-describedby="graph-desc"/>

      {/* Off-screen description for Screen Readers */}
      <div id="graph-desc" className="sr-only">
        Network graph visualization containing {entities.length} nodes and {relationships.length} edges.
        {driftCount > 0 ? ` Note: ${driftCount} nodes are highlighted in red indicating a drift state.` : ''}
        Navigation: Use TAB to cycle through entities. Press ENTER or SPACE to inspect a selected entity.
        Use mouse or touch to pan and zoom.
      </div>

      {/* Visible legend/status overlay */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
          <div className="bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</div>
              <div className="flex items-center gap-4 text-xs font-medium text-slate-700">
                  <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                      <span>{entities.length} Nodes</span>
                  </div>
                  {driftCount > 0 && (<div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse"></span>
                        <span className="text-red-700">{driftCount} Drift</span>
                    </div>)}
              </div>
          </div>
      </div>

      {/* Keyboard hints */}
      <div className="absolute bottom-4 right-4 text-[10px] text-slate-400 bg-white/50 px-2 py-1 rounded border border-slate-200 pointer-events-none">
          TAB: Nav | ENTER: Inspect | DRAG: Pan | SCROLL: Zoom
      </div>
    </div>);
};
exports.GraphView = GraphView;
