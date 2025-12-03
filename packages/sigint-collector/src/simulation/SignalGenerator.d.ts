/**
 * Signal Generator - Creates simulated signals for training
 * TRAINING/SIMULATION ONLY
 */
import { RawSignal, SignalType, ClassificationLevel, COMINTMessage, ELINTReport } from '../types';
export interface SignalGeneratorConfig {
    seed?: number;
    realism: 'LOW' | 'MEDIUM' | 'HIGH';
    includeNoise: boolean;
    noiseFloor: number;
}
export declare class SignalGenerator {
    private config;
    private random;
    private sampleCallsigns;
    private sampleLocations;
    private sampleRadarTypes;
    constructor(config?: Partial<SignalGeneratorConfig>);
    private seededRandom;
    generateRFSignal(params: {
        signalType: SignalType;
        frequency?: number;
        classification?: ClassificationLevel;
    }): RawSignal;
    generateCOMINTMessage(params: {
        communicationType: COMINTMessage['communicationType'];
        language?: string;
        classification?: ClassificationLevel;
    }): COMINTMessage;
    generateELINTReport(params?: {
        emitterType?: ELINTReport['emitterType'];
        classification?: ClassificationLevel;
    }): ELINTReport;
    private generateIQData;
    private generateAM;
    private generateFM;
    private generateBPSK;
    private generateQPSK;
    private generatePulse;
    private getTypicalFrequency;
    private getTypicalModulation;
    private getTypicalBandwidth;
    private inferCategory;
    private randomLocation;
    private generateSampleContent;
    private extractKeywords;
    private extractEntities;
}
//# sourceMappingURL=SignalGenerator.d.ts.map