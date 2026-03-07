import { GraphEdge, GraphNode, LayerId, TimelineEvent } from "./types";

export const layers: { id: LayerId; label: string; description: string }[] = [
  { id: "signals", label: "Signals", description: "Sensor signatures and RF telemetry traces." },
  {
    id: "comms",
    label: "Communications",
    description: "Operator chatters, dispatch calls, and relays.",
  },
  {
    id: "logistics",
    label: "Logistics",
    description: "Movements, manifests, and supply choke points.",
  },
];

export const geofences = [
  {
    id: "harbor",
    name: "Harbor Secure Zone",
    description: "Restricted docks and craneways monitored for anomalous handoffs.",
    color: "border-orange-400",
  },
  {
    id: "inland",
    name: "Inland Transfer Lots",
    description: "Intermodal yards receiving late-night transfers.",
    color: "border-emerald-400",
  },
  {
    id: "aircorridor",
    name: "Air Corridor",
    description: "Low-altitude flight path near recon balloons.",
    color: "border-sky-400",
  },
];

export const nodes: GraphNode[] = [
  {
    id: "n1",
    label: "Harbor Crane 07",
    layer: "logistics",
    timestamp: 2,
    location: "Harbor",
    confidence: 0.72,
    provenance: "IoT crane sensor + manifest OCR",
    neighbors: ["n2", "n4"],
    geofence: "harbor",
  },
  {
    id: "n2",
    label: "Dispatch Relay 14",
    layer: "comms",
    timestamp: 4,
    location: "Harbor",
    confidence: 0.81,
    provenance: "VHF monitoring + speech-to-text",
    neighbors: ["n1", "n3"],
    geofence: "harbor",
  },
  {
    id: "n3",
    label: "Courier Van Kilo",
    layer: "logistics",
    timestamp: 9,
    location: "Inland",
    confidence: 0.66,
    provenance: "ALPR corridor + roadside lidar",
    neighbors: ["n2", "n5"],
    geofence: "inland",
  },
  {
    id: "n4",
    label: "RF Beacon Sweep",
    layer: "signals",
    timestamp: 7,
    location: "Air Corridor",
    confidence: 0.58,
    provenance: "Drone SDR sweep",
    neighbors: ["n1"],
    geofence: "aircorridor",
  },
  {
    id: "n5",
    label: "Warehouse Lot D",
    layer: "logistics",
    timestamp: 13,
    location: "Inland",
    confidence: 0.74,
    provenance: "Thermal cameras + dock badge scans",
    neighbors: ["n3", "n6"],
    geofence: "inland",
  },
  {
    id: "n6",
    label: "Encrypted Chat Burst",
    layer: "comms",
    timestamp: 16,
    location: "Air Corridor",
    confidence: 0.69,
    provenance: "Satellite relay",
    neighbors: ["n5"],
    geofence: "aircorridor",
  },
];

export const edges: GraphEdge[] = [
  { id: "e1", source: "n1", target: "n2", strength: 0.7 },
  { id: "e2", source: "n2", target: "n3", strength: 0.82 },
  { id: "e3", source: "n1", target: "n4", strength: 0.55 },
  { id: "e4", source: "n3", target: "n5", strength: 0.61 },
  { id: "e5", source: "n5", target: "n6", strength: 0.77 },
];

export const timeline: TimelineEvent[] = [
  {
    id: "t1",
    label: "Crane load flagged",
    timestamp: 2,
    weight: 7,
    annotation: "Crate weight mismatch triggers risk model.",
  },
  {
    id: "t2",
    label: "Dispatch redirect",
    timestamp: 4,
    weight: 5,
    annotation: "Overnight supervisor reroutes manifest.",
  },
  {
    id: "t3",
    label: "RF beacon echo",
    timestamp: 7,
    weight: 4,
    annotation: "Short burst across air corridor.",
  },
  {
    id: "t4",
    label: "Courier handoff",
    timestamp: 9,
    weight: 8,
    annotation: "Van meets unregistered courier at lot entrance.",
  },
  {
    id: "t5",
    label: "Thermal spike",
    timestamp: 13,
    weight: 6,
    annotation: "Unexpected loading activity after curfew.",
  },
  {
    id: "t6",
    label: "Encrypted relay",
    timestamp: 16,
    weight: 5,
    annotation: "Burst of encrypted packets near airfield.",
  },
];
