import { Signal } from './types.js';
import crypto from 'node:crypto';

export class SignalCollectionService {
  private static instance: SignalCollectionService;

  private constructor() {}

  public static getInstance(): SignalCollectionService {
    if (!SignalCollectionService.instance) {
      SignalCollectionService.instance = new SignalCollectionService();
    }
    return SignalCollectionService.instance;
  }

  /**
   * Ingests a raw signal buffer (simulated) and normalizes it into a Signal object.
   */
  public ingestSignal(rawInput: any): Signal {
      // Input validation and normalization logic
      return {
          id: rawInput.id || crypto.randomUUID(),
          emitterId: rawInput.emitterId, // Allow forcing emitterId for simulation
          timestamp: new Date(),
          frequency: rawInput.frequency || 100e6, // Default 100MHz
          bandwidth: rawInput.bandwidth || 25e3,
          power: rawInput.power || -70,
          snr: rawInput.snr || 20,
          duration: rawInput.duration || 1000,
          data: rawInput.data, // Buffer
          metadata: rawInput.metadata || {}
      };
  }
}
