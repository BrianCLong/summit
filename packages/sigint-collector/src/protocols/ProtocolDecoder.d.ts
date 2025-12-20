/**
 * Protocol Decoder - RF protocol identification
 * TRAINING/SIMULATION ONLY
 */
import { SignalType, ModulationType } from '../types';
export interface ProtocolSignature {
    id: string;
    name: string;
    signalType: SignalType;
    modulation: ModulationType;
    frequency: {
        min: number;
        max: number;
        typical: number;
    };
    bandwidth: number;
    characteristics: {
        frameDuration?: number;
        symbolRate?: number;
        channelSpacing?: number;
        accessMethod?: 'FDMA' | 'TDMA' | 'CDMA' | 'OFDMA';
    };
    description: string;
}
export interface DecodingResult {
    protocol: string;
    confidence: number;
    parameters: Record<string, unknown>;
    rawData?: string;
    timestamp: Date;
    isSimulated: boolean;
}
export declare class ProtocolDecoder {
    private signatures;
    constructor();
    private initializeSignatures;
    /**
     * Identify protocol from signal characteristics
     */
    identifyProtocol(params: {
        frequency: number;
        bandwidth: number;
        modulation?: ModulationType;
    }): Array<{
        signature: ProtocolSignature;
        confidence: number;
    }>;
    /**
     * Decode protocol data (simulated)
     */
    decodeProtocol(protocolId: string, _data: Uint8Array | Float32Array): DecodingResult | null;
    /**
     * Get all protocol signatures
     */
    getSignatures(): ProtocolSignature[];
    /**
     * Get signature by ID
     */
    getSignature(id: string): ProtocolSignature | undefined;
    /**
     * Get protocols by signal type
     */
    getProtocolsByType(signalType: SignalType): ProtocolSignature[];
}
//# sourceMappingURL=ProtocolDecoder.d.ts.map