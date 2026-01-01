// server/src/stargate/StargateService.ts

import { Wormhole, DataPacket } from './stargate.types';
import { randomUUID } from 'crypto';

/**
 * Service for managing (simulated) subspace data exfiltration.
 * Project STARGATE.
 */
export class StargateService {
  private activeWormholes: Map<string, Wormhole> = new Map();

  /**
   * Opens a new wormhole for data transmission.
   * @param target The target system for the wormhole.
   * @returns The created Wormhole object.
   */
  async openWormhole(target: string): Promise<Wormhole> {
    const wormholeId = `wh-${randomUUID()}`;
    const newWormhole: Wormhole = {
      wormholeId,
      targetSystem: target,
      status: 'stable',
      createdAt: new Date(),
    };
    this.activeWormholes.set(wormholeId, newWormhole);
    return newWormhole;
  }

  /**
   * Transmits a data packet through a wormhole.
   * @param packet The DataPacket to be transmitted.
   * @returns A confirmation object.
   */
  async transmitPacket(packet: Omit<DataPacket, 'packetId'>): Promise<{ confirmationId: string; status: string }> {
    const { wormholeId } = packet;
    const wormhole = this.activeWormholes.get(wormholeId);
    if (!wormhole || wormhole.status !== 'stable') {
      throw new Error(`Wormhole ${wormholeId} is not stable for transmission.`);
    }
    const confirmationId = `tx-${randomUUID()}`;
    return { confirmationId, status: 'transmitted' };
  }
}

export const stargateService = new StargateService();
