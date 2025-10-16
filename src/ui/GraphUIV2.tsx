import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, Html } from '@react-three/drei';
import * as THREE from 'three';

interface Incident {
  id: string;
  title: string;
  severity: 'critical' | 'major' | 'minor';
  status: 'active' | 'investigating' | 'resolved';
  startTime: Date;
  endTime?: Date;
  affectedNodes: string[];
  description: string;
  timeline: IncidentEvent[];
  metrics: IncidentMetrics;
}

interface IncidentEvent {
  timestamp: Date;
  type: 'detected' | 'investigating' | 'action' | 'resolved';
  description: string;
  user?: string;
  automated: boolean;
}

interface IncidentMetrics {
  mttr: number; // Mean Time To Recovery in minutes
  mttd: number; // Mean Time To Detection in minutes
  impactRadius: number; // Number of affected components
  userImpact: 'none' | 'low' | 'medium' | 'high';
}

interface GraphNode {
  id: string;
  label: string;
  type: 'service' | 'database' | 'queue' | 'external';
  position: [number, number, number];
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  metrics: {
    cpu: number;
    memory: number;
    latency: number;
    errorRate: number;
  };
  incidents: string[]; // Incident IDs affecting this node
  dependencies: string[]; // Node IDs this depends on
}

interface GraphEdge {
  from: string;
  to: string;
  type: 'sync' | 'async' | 'data';
  strength: number; // 0-1, connection strength
  latency: number;
  throughput: number;
  status: 'healthy' | 'degraded' | 'failed';
}

interface IncidentView {
  mode: 'timeline' | 'impact' | 'details';
  selectedIncident: string | null;
  timeRange: [Date, Date];
  filters: {
    severity: ('critical' | 'major' | 'minor')[];
    status: ('active' | 'investigating' | 'resolved')[];
    affectedServices: string[];
  };
}

interface GraphUIV2Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
  incidents: Incident[];
  onNodeSelect?: (nodeId: string) => void;
  onIncidentSelect?: (incidentId: string) => void;
  className?: string;
}

const GraphUIV2: React.FC<GraphUIV2Props> = ({
  nodes,
  edges,
  incidents,
  onNodeSelect,
  onIncidentSelect,
  className = '',
}) => {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [incidentView, setIncidentView] = useState<IncidentView>({
    mode: 'timeline',
    selectedIncident: null,
    timeRange: [new Date(Date.now() - 24 * 60 * 60 * 1000), new Date()],
    filters: {
      severity: ['critical', 'major', 'minor'],
      status: ['active', 'investigating'],
      affectedServices: [],
    },
  });

  const [viewMode, setViewMode] = useState<'graph' | 'incidents' | 'hybrid'>(
    'hybrid',
  );
  const [animationSpeed, setAnimationSpeed] = useState(1.0);
  const [showMetrics, setShowMetrics] = useState(true);

  const incidentTimelineRef = useRef<HTMLDivElement>(null);

  // Filter incidents based on current filters
  const filteredIncidents = incidents.filter((incident) => {
    return (
      incidentView.filters.severity.includes(incident.severity) &&
      incidentView.filters.status.includes(incident.status) &&
      (incidentView.filters.affectedServices.length === 0 ||
        incident.affectedNodes.some((node) =>
          incidentView.filters.affectedServices.includes(node),
        ))
    );
  });

  // Get active incidents for real-time visualization
  const activeIncidents = incidents.filter(
    (i) => i.status === 'active' || i.status === 'investigating',
  );

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      setSelectedNode(nodeId);
      onNodeSelect?.(nodeId);

      // Auto-select related incidents
      const nodeIncidents = incidents.filter((i) =>
        i.affectedNodes.includes(nodeId),
      );
      if (nodeIncidents.length > 0 && nodeIncidents[0]) {
        setIncidentView((prev) => ({
          ...prev,
          selectedIncident: nodeIncidents[0].id,
        }));
      }
    },
    [incidents, onNodeSelect],
  );

  const handleIncidentSelect = useCallback(
    (incidentId: string) => {
      setIncidentView((prev) => ({
        ...prev,
        selectedIncident: incidentId,
      }));
      onIncidentSelect?.(incidentId);
    },
    [onIncidentSelect],
  );

  return (
    <div className={`graph-ui-v2 ${className}`}>
      {/* Control Panel */}
      <div className="control-panel">
        <div className="view-controls">
          <button
            className={viewMode === 'graph' ? 'active' : ''}
            onClick={() => setViewMode('graph')}
          >
            Graph View
          </button>
          <button
            className={viewMode === 'incidents' ? 'active' : ''}
            onClick={() => setViewMode('incidents')}
          >
            Incidents
          </button>
          <button
            className={viewMode === 'hybrid' ? 'active' : ''}
            onClick={() => setViewMode('hybrid')}
          >
            Hybrid View
          </button>
        </div>

        <div className="incident-filters">
          <select
            multiple
            value={incidentView.filters.severity}
            onChange={(e) => {
              const selected = Array.from(
                e.target.selectedOptions,
                (option) => option.value,
              ) as ('critical' | 'major' | 'minor')[];
              setIncidentView((prev) => ({
                ...prev,
                filters: { ...prev.filters, severity: selected },
              }));
            }}
          >
            <option value="critical">Critical</option>
            <option value="major">Major</option>
            <option value="minor">Minor</option>
          </select>

          <input
            type="range"
            min="0.1"
            max="3.0"
            step="0.1"
            value={animationSpeed}
            onChange={(e) => setAnimationSpeed(parseFloat(e.target.value))}
            title="Animation Speed"
          />

          <label>
            <input
              type="checkbox"
              checked={showMetrics}
              onChange={(e) => setShowMetrics(e.target.checked)}
            />
            Show Metrics
          </label>
        </div>
      </div>

      <div className="main-content">
        {/* 3D Graph Visualization */}
        {(viewMode === 'graph' || viewMode === 'hybrid') && (
          <div className="graph-container">
            <Canvas
              camera={{ position: [0, 0, 10], fov: 75 }}
              style={{ height: viewMode === 'hybrid' ? '60vh' : '80vh' }}
            >
              <OrbitControls
                enablePan={true}
                enableZoom={true}
                enableRotate={true}
              />
              <ambientLight intensity={0.6} />
              <pointLight position={[10, 10, 10]} intensity={1} />

              {/* Render Nodes */}
              {nodes.map((node) => (
                <NodeVisualization
                  key={node.id}
                  node={node}
                  selected={selectedNode === node.id}
                  hasActiveIncidents={activeIncidents.some((i) =>
                    i.affectedNodes.includes(node.id),
                  )}
                  showMetrics={showMetrics}
                  animationSpeed={animationSpeed}
                  onClick={() => handleNodeClick(node.id)}
                />
              ))}

              {/* Render Edges */}
              {edges.map((edge, index) => (
                <EdgeVisualization
                  key={`${edge.from}-${edge.to}-${index}`}
                  edge={edge}
                  fromNode={nodes.find((n) => n.id === edge.from)}
                  toNode={nodes.find((n) => n.id === edge.to)}
                  animationSpeed={animationSpeed}
                />
              ))}

              {/* Incident Impact Visualization */}
              {activeIncidents.map((incident) => (
                <IncidentImpactVisualization
                  key={incident.id}
                  incident={incident}
                  nodes={nodes.filter((n) =>
                    incident.affectedNodes.includes(n.id),
                  )}
                  animationSpeed={animationSpeed}
                />
              ))}
            </Canvas>

            {/* Node Details Panel */}
            {selectedNode && (
              <NodeDetailsPanel
                node={nodes.find((n) => n.id === selectedNode)}
                incidents={incidents.filter((i) =>
                  i.affectedNodes.includes(selectedNode),
                )}
                onClose={() => setSelectedNode(null)}
              />
            )}
          </div>
        )}

        {/* Incident Management Panel */}
        {(viewMode === 'incidents' || viewMode === 'hybrid') && (
          <div className="incidents-container">
            <div className="incidents-header">
              <h3>Incident Management</h3>
              <div className="incident-stats">
                <span className="stat critical">
                  {
                    filteredIncidents.filter((i) => i.severity === 'critical')
                      .length
                  }{' '}
                  Critical
                </span>
                <span className="stat major">
                  {
                    filteredIncidents.filter((i) => i.severity === 'major')
                      .length
                  }{' '}
                  Major
                </span>
                <span className="stat minor">
                  {
                    filteredIncidents.filter((i) => i.severity === 'minor')
                      .length
                  }{' '}
                  Minor
                </span>
              </div>
            </div>

            <div className="incidents-content">
              {/* Incident Timeline */}
              {incidentView.mode === 'timeline' && (
                <IncidentTimeline
                  incidents={filteredIncidents}
                  selectedIncident={incidentView.selectedIncident}
                  timeRange={incidentView.timeRange}
                  onIncidentSelect={handleIncidentSelect}
                  ref={incidentTimelineRef}
                />
              )}

              {/* Incident Impact View */}
              {incidentView.mode === 'impact' && (
                <IncidentImpactMatrix
                  incidents={filteredIncidents}
                  nodes={nodes}
                  onIncidentSelect={handleIncidentSelect}
                />
              )}

              {/* Incident Details */}
              {incidentView.mode === 'details' &&
                incidentView.selectedIncident && (
                  <IncidentDetails
                    incident={incidents.find(
                      (i) => i.id === incidentView.selectedIncident,
                    )}
                    nodes={nodes}
                  />
                )}
            </div>

            {/* Incident View Controls */}
            <div className="incident-controls">
              <button
                className={incidentView.mode === 'timeline' ? 'active' : ''}
                onClick={() =>
                  setIncidentView((prev) => ({ ...prev, mode: 'timeline' }))
                }
              >
                Timeline
              </button>
              <button
                className={incidentView.mode === 'impact' ? 'active' : ''}
                onClick={() =>
                  setIncidentView((prev) => ({ ...prev, mode: 'impact' }))
                }
              >
                Impact Matrix
              </button>
              <button
                className={incidentView.mode === 'details' ? 'active' : ''}
                onClick={() =>
                  setIncidentView((prev) => ({ ...prev, mode: 'details' }))
                }
              >
                Details
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Node Visualization Component
const NodeVisualization: React.FC<{
  node: GraphNode;
  selected: boolean;
  hasActiveIncidents: boolean;
  showMetrics: boolean;
  animationSpeed: number;
  onClick: () => void;
}> = ({
  node,
  selected,
  hasActiveIncidents,
  showMetrics,
  animationSpeed,
  onClick,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    if (meshRef.current && hasActiveIncidents) {
      // Animate nodes with active incidents
      const animate = () => {
        if (meshRef.current) {
          meshRef.current.rotation.y += 0.02 * animationSpeed;
        }
        requestAnimationFrame(animate);
      };
      animate();
    }
  }, [hasActiveIncidents, animationSpeed]);

  const getNodeColor = () => {
    if (hasActiveIncidents) return '#ff4444';
    switch (node.status) {
      case 'critical':
        return '#ff6b6b';
      case 'warning':
        return '#ffa726';
      case 'healthy':
        return '#4caf50';
      default:
        return '#757575';
    }
  };

  const getNodeSize = () => {
    const baseSize = selected ? 1.5 : 1.0;
    const incidentMultiplier = hasActiveIncidents ? 1.3 : 1.0;
    return baseSize * incidentMultiplier;
  };

  return (
    <group position={node.position}>
      <mesh ref={meshRef} onClick={onClick}>
        <sphereGeometry args={[getNodeSize(), 32, 32]} />
        <meshPhongMaterial color={getNodeColor()} opacity={0.8} transparent />
      </mesh>

      {/* Node Label */}
      <Text
        position={[0, -2, 0]}
        fontSize={0.5}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {node.label}
      </Text>

      {/* Metrics Overlay */}
      {showMetrics && (
        <Html position={[1.5, 1, 0]} style={{ pointerEvents: 'none' }}>
          <div className="node-metrics">
            <div>CPU: {node.metrics.cpu.toFixed(1)}%</div>
            <div>Mem: {node.metrics.memory.toFixed(1)}%</div>
            <div>Err: {node.metrics.errorRate.toFixed(2)}%</div>
          </div>
        </Html>
      )}

      {/* Incident Indicator */}
      {hasActiveIncidents && (
        <mesh position={[0, 1.5, 0]}>
          <ringGeometry args={[0.3, 0.5, 8]} />
          <meshBasicMaterial color="#ff4444" />
        </mesh>
      )}
    </group>
  );
};

// Edge Visualization Component
const EdgeVisualization: React.FC<{
  edge: GraphEdge;
  fromNode?: GraphNode;
  toNode?: GraphNode;
  animationSpeed: number;
}> = ({ edge, fromNode, toNode, animationSpeed }) => {
  if (!fromNode || !toNode) return null;

  const getEdgeColor = () => {
    switch (edge.status) {
      case 'failed':
        return '#ff4444';
      case 'degraded':
        return '#ffa726';
      case 'healthy':
        return '#4caf50';
      default:
        return '#757575';
    }
  };

  const direction = new THREE.Vector3().subVectors(
    new THREE.Vector3(...toNode.position),
    new THREE.Vector3(...fromNode.position),
  );

  const distance = direction.length();
  const midpoint = new THREE.Vector3()
    .addVectors(
      new THREE.Vector3(...fromNode.position),
      new THREE.Vector3(...toNode.position),
    )
    .divideScalar(2);

  return (
    <group position={midpoint.toArray()}>
      <mesh>
        <cylinderGeometry args={[0.02, 0.02, distance]} />
        <meshBasicMaterial color={getEdgeColor()} opacity={0.6} transparent />
      </mesh>
    </group>
  );
};

// Incident Impact Visualization Component
const IncidentImpactVisualization: React.FC<{
  incident: Incident;
  nodes: GraphNode[];
  animationSpeed: number;
}> = ({ incident, nodes, animationSpeed }) => {
  const getSeverityColor = () => {
    switch (incident.severity) {
      case 'critical':
        return '#ff1744';
      case 'major':
        return '#ff9800';
      case 'minor':
        return '#ffeb3b';
      default:
        return '#757575';
    }
  };

  return (
    <group>
      {nodes.map((node) => (
        <mesh key={node.id} position={[...node.position, 0]}>
          <ringGeometry args={[2, 2.5, 16]} />
          <meshBasicMaterial
            color={getSeverityColor()}
            opacity={0.3}
            transparent
          />
        </mesh>
      ))}
    </group>
  );
};

// Node Details Panel Component
const NodeDetailsPanel: React.FC<{
  node?: GraphNode;
  incidents: Incident[];
  onClose: () => void;
}> = ({ node, incidents, onClose }) => {
  if (!node) return null;

  return (
    <div className="node-details-panel">
      <div className="panel-header">
        <h4>{node.label}</h4>
        <button onClick={onClose}>×</button>
      </div>

      <div className="panel-content">
        <div className="node-status">
          <span className={`status-indicator ${node.status}`}>
            {node.status.toUpperCase()}
          </span>
        </div>

        <div className="metrics-grid">
          <div className="metric">
            <label>CPU Usage</label>
            <div className="metric-value">{node.metrics.cpu.toFixed(1)}%</div>
          </div>
          <div className="metric">
            <label>Memory Usage</label>
            <div className="metric-value">
              {node.metrics.memory.toFixed(1)}%
            </div>
          </div>
          <div className="metric">
            <label>Latency</label>
            <div className="metric-value">{node.metrics.latency}ms</div>
          </div>
          <div className="metric">
            <label>Error Rate</label>
            <div className="metric-value">
              {node.metrics.errorRate.toFixed(2)}%
            </div>
          </div>
        </div>

        {incidents.length > 0 && (
          <div className="related-incidents">
            <h5>Related Incidents</h5>
            {incidents.map((incident) => (
              <div
                key={incident.id}
                className={`incident-item ${incident.severity}`}
              >
                <span className="incident-title">{incident.title}</span>
                <span className="incident-status">{incident.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Incident Timeline Component
const IncidentTimeline = React.forwardRef<
  HTMLDivElement,
  {
    incidents: Incident[];
    selectedIncident: string | null;
    timeRange: [Date, Date];
    onIncidentSelect: (incidentId: string) => void;
  }
>(({ incidents, selectedIncident, timeRange, onIncidentSelect }, ref) => {
  return (
    <div ref={ref} className="incident-timeline">
      {incidents
        .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
        .map((incident) => (
          <div
            key={incident.id}
            className={`timeline-item ${incident.severity} ${
              selectedIncident === incident.id ? 'selected' : ''
            }`}
            onClick={() => onIncidentSelect(incident.id)}
          >
            <div className="timeline-marker" />
            <div className="timeline-content">
              <div className="incident-header">
                <span className="incident-title">{incident.title}</span>
                <span className="incident-time">
                  {incident.startTime.toLocaleTimeString()}
                </span>
              </div>
              <div className="incident-description">{incident.description}</div>
              <div className="incident-metrics">
                <span>MTTR: {incident.metrics.mttr}m</span>
                <span>Impact: {incident.metrics.impactRadius} services</span>
              </div>
            </div>
          </div>
        ))}
    </div>
  );
});

// Incident Impact Matrix Component
const IncidentImpactMatrix: React.FC<{
  incidents: Incident[];
  nodes: GraphNode[];
  onIncidentSelect: (incidentId: string) => void;
}> = ({ incidents, nodes, onIncidentSelect }) => {
  return (
    <div className="incident-impact-matrix">
      <div className="matrix-header">
        <div className="service-header">Services</div>
        {incidents.map((incident) => (
          <div key={incident.id} className="incident-header">
            <span className={`severity-indicator ${incident.severity}`} />
            {incident.title}
          </div>
        ))}
      </div>

      <div className="matrix-body">
        {nodes.map((node) => (
          <div key={node.id} className="matrix-row">
            <div className="service-label">{node.label}</div>
            {incidents.map((incident) => (
              <div
                key={`${node.id}-${incident.id}`}
                className={`impact-cell ${
                  incident.affectedNodes.includes(node.id) ? 'affected' : ''
                }`}
                onClick={() => onIncidentSelect(incident.id)}
              >
                {incident.affectedNodes.includes(node.id) && (
                  <span className="impact-indicator">●</span>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

// Incident Details Component
const IncidentDetails: React.FC<{
  incident?: Incident;
  nodes: GraphNode[];
}> = ({ incident, nodes }) => {
  if (!incident) return null;

  const affectedServices = nodes.filter((n) =>
    incident.affectedNodes.includes(n.id),
  );

  return (
    <div className="incident-details">
      <div className="incident-header">
        <h4>{incident.title}</h4>
        <span className={`severity-badge ${incident.severity}`}>
          {incident.severity.toUpperCase()}
        </span>
      </div>

      <div className="incident-metrics-summary">
        <div className="metric">
          <label>MTTR</label>
          <value>{incident.metrics.mttr} minutes</value>
        </div>
        <div className="metric">
          <label>MTTD</label>
          <value>{incident.metrics.mttd} minutes</value>
        </div>
        <div className="metric">
          <label>Impact Radius</label>
          <value>{incident.metrics.impactRadius} components</value>
        </div>
        <div className="metric">
          <label>User Impact</label>
          <value className={incident.metrics.userImpact}>
            {incident.metrics.userImpact.toUpperCase()}
          </value>
        </div>
      </div>

      <div className="affected-services">
        <h5>Affected Services</h5>
        <div className="services-list">
          {affectedServices.map((service) => (
            <div key={service.id} className={`service-item ${service.status}`}>
              <span className="service-name">{service.label}</span>
              <span className="service-status">{service.status}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="incident-timeline-details">
        <h5>Timeline</h5>
        <div className="timeline-events">
          {incident.timeline
            .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
            .map((event, index) => (
              <div key={index} className={`timeline-event ${event.type}`}>
                <div className="event-time">
                  {event.timestamp.toLocaleTimeString()}
                </div>
                <div className="event-description">{event.description}</div>
                {event.user && (
                  <div className="event-user">by {event.user}</div>
                )}
                {event.automated && <span className="automated-tag">AUTO</span>}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default GraphUIV2;
