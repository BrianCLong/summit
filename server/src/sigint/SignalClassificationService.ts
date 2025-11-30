import { Signal, ClassificationResult, ModulationType } from './types.js';

export class SignalClassificationService {
  private static instance: SignalClassificationService;

  private constructor() {}

  public static getInstance(): SignalClassificationService {
    if (!SignalClassificationService.instance) {
      SignalClassificationService.instance = new SignalClassificationService();
    }
    return SignalClassificationService.instance;
  }

  /**
   * Simulates signal classification based on frequency and bandwidth features.
   */
  public async classifySignal(signal: Signal): Promise<ClassificationResult> {
    // In a real system, this would use ML models or signature matching.
    // Here we simulate based on common bands.

    let label = 'Unknown Signal';
    let tags: string[] = [];
    let threatLevel: ClassificationResult['threatLevel'] = 'LOW';
    let confidence = 0.5 + Math.random() * 0.4; // Random confidence 0.5-0.9

    const freqMHz = signal.frequency / 1e6;

    if (freqMHz >= 88 && freqMHz <= 108) {
        label = 'FM Broadcast';
        tags = ['Civilian', 'Broadcast', 'Audio'];
        threatLevel = 'LOW';
    } else if (freqMHz >= 118 && freqMHz <= 137) {
        label = 'Airband Comms';
        tags = ['Aviation', 'Voice', 'AM'];
        threatLevel = 'LOW';
    } else if (freqMHz >= 156 && freqMHz <= 162) {
        label = 'Marine VHF';
        tags = ['Marine', 'Voice', 'AIS'];
        threatLevel = 'LOW';
    } else if (freqMHz >= 400 && freqMHz <= 470) {
        label = 'UHF Land Mobile';
        tags = ['PMR', 'LMR', 'Handheld'];
        threatLevel = 'MEDIUM'; // Could be security/police
    } else if (freqMHz >= 800 && freqMHz <= 960) {
        label = 'GSM/LTE Downlink';
        tags = ['Cellular', 'Digital', 'Encrypted'];
        threatLevel = 'LOW';
    } else if (freqMHz >= 1200 && freqMHz <= 1400) {
        label = 'L-Band Radar';
        tags = ['Radar', 'Long-Range', 'Pulse'];
        threatLevel = 'HIGH';
    } else if (freqMHz >= 2400 && freqMHz <= 2500) {
        label = 'ISM Band';
        tags = ['WiFi', 'Bluetooth', 'Drone Control'];
        threatLevel = 'MEDIUM'; // Drones
    } else if (freqMHz >= 5000 && freqMHz <= 5800) {
        label = 'C-Band Radar / WiFi';
        tags = ['Radar', 'WiFi', 'Weather'];
        threatLevel = 'MEDIUM';
    } else if (freqMHz >= 8000 && freqMHz <= 12000) {
        label = 'X-Band Fire Control Radar';
        tags = ['Radar', 'Targeting', 'Missile Guidance'];
        threatLevel = 'CRITICAL';
    }

    // Refine based on bandwidth
    if (signal.bandwidth > 5e6 && label.includes('Radar')) {
        tags.push('Wideband');
    } else if (signal.bandwidth < 25e3 && !label.includes('Radar')) {
        tags.push('Narrowband');
    }

    return {
        label,
        confidence,
        tags,
        threatLevel
    };
  }

  /**
   * Simulates modulation recognition.
   */
  public async analyzeModulation(signal: Signal): Promise<ModulationType> {
    // Heuristic simulation
    if (signal.bandwidth < 15e3) {
        // Narrowband is often AM/FM/NFM
        return Math.random() > 0.5 ? 'AM' : 'FM';
    } else if (signal.bandwidth > 5e6) {
        // Wideband
        return Math.random() > 0.5 ? 'OFDM' : 'CSS';
    } else {
        // Digital comms
        const types: ModulationType[] = ['PSK', 'FSK', 'QAM'];
        return types[Math.floor(Math.random() * types.length)];
    }
  }
}
