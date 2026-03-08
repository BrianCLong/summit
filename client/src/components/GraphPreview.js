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
const react_1 = __importStar(require("react"));
const react_redux_1 = require("react-redux");
function GraphPreview({ width = 400, height = 300, maxNodes = 20, interactive = true, showLabels = true, onNodeClick, title = 'Graph Preview', }) {
    const canvasRef = (0, react_1.useRef)(null);
    const [hoveredNode, setHoveredNode] = (0, react_1.useState)(null);
    const [simulationNodes, setSimulationNodes] = (0, react_1.useState)([]);
    // Get graph data from Redux store
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const graphData = (0, react_redux_1.useSelector)((state) => state.graph);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const nodes = graphData?.nodes?.slice(0, maxNodes) || [];
    const edges = graphData?.edges || [];
    const nodeTypeColors = {
        person: '#FF5733',
        organization: '#33FF57',
        location: '#3357FF',
        event: '#FF33FF',
        document: '#FFB533',
        IP: '#33FFB5',
        email: '#B533FF',
        phone: '#FF3333',
        generic: '#888888',
    };
    // Simple physics simulation for node positioning
    (0, react_1.useEffect)(() => {
        if (!nodes.length)
            return;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        let animationId;
        const simulate = () => {
            setSimulationNodes((currentNodes) => {
                return currentNodes.map((node) => {
                    // Simple circular layout with some randomness
                    const angle = 
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (nodes.findIndex((n) => n.id === node.id) / nodes.length) *
                        Math.PI *
                        2;
                    const radius = Math.min(width, height) * 0.3;
                    const centerX = width / 2;
                    const centerY = height / 2;
                    const targetX = centerX + Math.cos(angle) * radius + (Math.random() - 0.5) * 20;
                    const targetY = centerY + Math.sin(angle) * radius + (Math.random() - 0.5) * 20;
                    // Smooth movement towards target position
                    const currentX = node.x || centerX;
                    const currentY = node.y || centerY;
                    return {
                        ...node,
                        x: currentX + (targetX - currentX) * 0.1,
                        y: currentY + (targetY - currentY) * 0.1,
                    };
                });
            });
        };
        // Initialize nodes with positions
        setSimulationNodes(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        nodes.map((node) => ({
            ...node,
            x: width / 2 + (Math.random() - 0.5) * 100,
            y: height / 2 + (Math.random() - 0.5) * 100,
        })));
        // Run simulation
        const interval = setInterval(simulate, 50);
        return () => clearInterval(interval);
    }, [nodes, width, height]);
    // Canvas drawing
    (0, react_1.useEffect)(() => {
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        // Set canvas size
        canvas.width = width;
        canvas.height = height;
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        // Draw background
        ctx.fillStyle = '#fafafa';
        ctx.fillRect(0, 0, width, height);
        // Draw edges
        if (simulationNodes.length > 0) {
            ctx.strokeStyle = '#e5e7eb';
            ctx.lineWidth = 1;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            edges.forEach((edge) => {
                const sourceNode = simulationNodes.find((n) => n.id === edge.source);
                const targetNode = simulationNodes.find((n) => n.id === edge.target);
                if (sourceNode &&
                    targetNode &&
                    sourceNode.x &&
                    sourceNode.y &&
                    targetNode.x &&
                    targetNode.y) {
                    ctx.beginPath();
                    ctx.moveTo(sourceNode.x, sourceNode.y);
                    ctx.lineTo(targetNode.x, targetNode.y);
                    ctx.stroke();
                }
            });
        }
        // Draw nodes
        simulationNodes.forEach((node) => {
            if (!node.x || !node.y)
                return;
            const radius = hoveredNode === node.id ? 8 : 6;
            const color = nodeTypeColors[node.type] ||
                nodeTypeColors.generic;
            // Node circle
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
            ctx.fill();
            // Node border
            ctx.strokeStyle = hoveredNode === node.id ? '#333' : '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
            // Label
            if (showLabels && node.label) {
                ctx.fillStyle = '#333';
                ctx.font = '11px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(node.label.substring(0, 15), node.x, node.y - radius - 5);
            }
        });
        // Draw stats
        ctx.fillStyle = '#666';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`Nodes: ${simulationNodes.length}`, 10, height - 30);
        ctx.fillText(`Edges: ${edges.length}`, 10, height - 15);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [simulationNodes, hoveredNode, showLabels, width, height, edges]);
    // Handle mouse interactions
    const handleMouseMove = (event) => {
        if (!interactive)
            return;
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        // Find hovered node
        const hoveredNodeId = simulationNodes.find((node) => {
            if (!node.x || !node.y)
                return false;
            const distance = Math.sqrt(Math.pow(mouseX - node.x, 2) + Math.pow(mouseY - node.y, 2));
            return distance <= 8;
        })?.id || null;
        setHoveredNode(hoveredNodeId);
    };
    const handleClick = (event) => {
        if (!interactive || !onNodeClick)
            return;
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        // Find clicked node
        const clickedNode = simulationNodes.find((node) => {
            if (!node.x || !node.y)
                return false;
            const distance = Math.sqrt(Math.pow(mouseX - node.x, 2) + Math.pow(mouseY - node.y, 2));
            return distance <= 8;
        });
        if (clickedNode) {
            onNodeClick(clickedNode);
        }
    };
    return (<div className="panel" style={{ padding: '16px' }}>
      <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
        }}>
        <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>
          {title}
        </h3>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Legend */}
          <div style={{ display: 'flex', gap: '8px', fontSize: '11px' }}>
            {Object.entries(nodeTypeColors)
            .slice(0, 4)
            .map(([type, color]) => (<div key={type} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: color,
            }}></div>
                  <span style={{ textTransform: 'capitalize' }}>{type}</span>
                </div>))}
          </div>
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        <canvas ref={canvasRef} width={width} height={height} onMouseMove={handleMouseMove} onClick={handleClick} style={{
            border: '1px solid var(--hairline)',
            borderRadius: '4px',
            cursor: interactive ? 'pointer' : 'default',
            backgroundColor: '#fafafa',
        }}/>

        {hoveredNode && (<div style={{
                position: 'absolute',
                top: '10px',
                left: '10px',
                backgroundColor: 'rgba(0,0,0,0.8)',
                color: 'white',
                padding: '6px 10px',
                borderRadius: '4px',
                fontSize: '12px',
                pointerEvents: 'none',
                maxWidth: '200px',
            }}>
            {(() => {
                const node = simulationNodes.find((n) => n.id === hoveredNode);
                return node ? (<div>
                  <div style={{ fontWeight: 'bold' }}>{node.label}</div>
                  <div>Type: {node.type}</div>
                  <div>ID: {node.id}</div>
                  {node.confidence && <div>Confidence: {node.confidence}%</div>}
                </div>) : null;
            })()}
          </div>)}
      </div>

      {simulationNodes.length === 0 && (<div style={{
                textAlign: 'center',
                color: '#666',
                padding: '40px 20px',
                fontSize: '14px',
            }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📊</div>
          <div>No graph data available</div>
          <div style={{ fontSize: '12px', marginTop: '4px' }}>
            Load an investigation to see the graph visualization
          </div>
        </div>)}
    </div>);
}
exports.default = GraphPreview;
