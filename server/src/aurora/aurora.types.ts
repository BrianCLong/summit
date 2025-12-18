// server/src/aurora/aurora.types.ts

/**
 * Represents a specific neural implant device.
 */
export interface NeuralImplant {
  implantId: string; // Unique identifier for the implant (e.g., Neuralink N1 serial number)
  userId: string; // The user associated with this implant
  implantType: 'Neuralink N1' | 'Paradromics' | 'Synchron' | 'Unknown';
  status: 'online' | 'offline' | 'error' | 'initializing';
  bandwidthMbit: number; // Maximum data transfer rate in Mbit/s
  firmwareVersion: string;
  lastSeen: Date;
}

/**
 * Represents a single, coherent thought translated from raw neural signals.
 */
export interface ThoughtPacket {
  packetId: string;
  timestamp: Date;
  implantId: string;
  sourceAnalystId: string;
  thoughtType: 'entity_creation' | 'entity_query' | 'relation_link' | 'system_command';
  payload: {
    // Example: { "type": "superyacht", "name": "Putin's Yacht", "owner": "Vladimir Putin" }
    [key: string]: any;
  };
  confidence: number; // Confidence score from the neural decoder (0.0 to 1.0)
}

/**
 * Represents a stream of thoughts from a specific implant.
 */
export interface ThoughtStream {
  streamId: string;
  implantId: string;
  isActive: boolean;
  startTime: Date;
  lastPacketTimestamp?: Date;
}

/**
 * Represents a data payload to be pushed directly into an analyst's visual cortex.
 */
export interface CortexOverlay {
  overlayId: string;
  targetImplantId: string;
  timestamp: Date;
  type: 'text' | 'image' | 'graph_node' | 'geospatial_track';
  content: string; // Could be a string, a URL to an image, or a JSON object for complex data
  durationSeconds: number; // How long the overlay should persist
  priority: 'critical' | 'high' | 'medium' | 'low';
}
