// server/src/stargate/stargate.types.ts

/**
 * Represents a wormhole for data transmission.
 */
export interface Wormhole {
  wormholeId: string;
  targetSystem: string;
  status: 'stable' | 'unstable' | 'closed';
  createdAt: Date;
}

/**
 * Represents a data packet to be transmitted.
 */
export interface DataPacket {
  packetId: string;
  wormholeId: string;
  payload: any;
}
