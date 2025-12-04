import { EventEmitter } from 'events';
import logger from '../utils/logger';

// --- Types & Interfaces ---

export type EWEffectType =
  | 'NOISE_JAMMING'
  | 'DECEPTION_JAMMING'
  | 'BARRAGE_JAMMING'
  | 'SPOT_JAMMING'
  | 'DRFM_REPEATER'
  | 'COMM_DISRUPTION'
  | 'RADAR_SPOOFING'
  | 'EMP_BLAST';

export type SignalType =
  | 'RADAR'
  | 'COMMUNICATION'
  | 'NAVIGATION'
  | 'GUIDANCE'
  | 'UNKNOWN';

export interface GeoLocation {
  lat: number;
  lon: number;
  alt?: number; // Altitude in meters
}

export interface SpectrumSignal {
  id: string;
  frequency: number; // MHz
  bandwidth: number; // MHz
  power: number; // dBm at source
  modulation: string;
  type: SignalType;
  sourceId?: string;
  location?: GeoLocation;
  timestamp: Date;
  signature?: string; // Digital fingerprint
  content?: string; // Simulated content
}

export interface EWAsset {
  id: string;
  name: string;
  type: 'GROUND_STATION' | 'AIRCRAFT' | 'SATELLITE' | 'SHIP' | 'MANPACK';
  location: GeoLocation;
  capabilities: EWEffectType[];
  maxPower: number; // Watts
  frequencyRange: [number, number]; // [Min, Max] MHz
  status: 'ACTIVE' | 'PASSIVE' | 'OFFLINE' | 'DAMAGED';
  activeProtection: string[]; // List of active EP measures
}

export interface JammingMission {
  id: string;
  assetId: string;
  targetFrequency: number;
  bandwidth: number;
  effect: EWEffectType;
  startTime: Date;
  durationSeconds: number;
  powerOutput: number;
  status: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'FAILED';
  effectiveness?: number; // 0-1 score calculated post-activation
}

export interface InterceptReport {
  id: string;
  signalId: string;
  interceptTime: Date;
  analyzedType: SignalType;
  confidence: number;
  content?: string; // Decoded content if applicable (simulated)
  parameters: {
    pri?: number; // Pulse Repetition Interval
    pw?: number; // Pulse Width
    scanRate?: number;
    encryptionType?: string;
  };
}

export interface DirectionFindingResult {
  signalId: string;
  estimatedLocation: GeoLocation;
  errorRadius: number; // Meters
  triangulationPoints: number; // Number of sensors used
  timestamp: Date;
}

export interface BattleSpaceView {
  timestamp: Date;
  assets: EWAsset[];
  signals: SpectrumSignal[];
  activeJammers: JammingMission[];
  intercepts: InterceptReport[];
  spectrumUtilization: number; // 0-1 metric
}

/**
 * Electronic Warfare Service
 *
 * Manages the electromagnetic spectrum operations including Electronic Attack (EA),
 * Electronic Protection (EP), and Electronic Support (ES).
 */
export class ElectronicWarfareService extends EventEmitter {
  private assets: Map<string, EWAsset> = new Map();
  private signals: Map<string, SpectrumSignal> = new Map();
  private activeJammers: Map<string, JammingMission> = new Map();
  private signalHistory: InterceptReport[] = [];

  constructor() {
    super();
    logger.info('Electronic Warfare Service initialized.');
  }

  /**
   * Registers a new friendly or neutral EW asset in the battle management system.
   */
  public registerAsset(asset: EWAsset): void {
    this.assets.set(asset.id, { ...asset, activeProtection: [] });
    logger.info(`EW Asset registered: ${asset.name} (${asset.id})`);
    this.emit('assetRegistered', asset);
  }

  /**
   * Updates the location of an asset.
   */
  public updateAssetLocation(assetId: string, location: GeoLocation): void {
    const asset = this.assets.get(assetId);
    if (asset) {
      asset.location = location;
      this.assets.set(assetId, asset);
      this.emit('assetMoved', { assetId, location });
    }
  }

  /**
   * Simulates the detection of a signal in the spectrum.
   * (Electronic Support / Signals Intelligence)
   */
  public detectSignal(signal: SpectrumSignal): void {
    this.signals.set(signal.id, signal);
    logger.info(`Signal detected: ${signal.id} at ${signal.frequency}MHz`);
    this.emit('signalDetected', signal);

    // Automatically attempt initial analysis if we have passive sensors
    const passiveSensors = Array.from(this.assets.values()).filter(
      (a) => a.status !== 'OFFLINE'
    );
    if (passiveSensors.length > 0) {
      this.analyzeSignal(signal.id);
    }
  }

  /**
   * Analyzes a specific signal to determine its characteristics.
   * (Pulse Analysis / ELINT / SIGINT)
   */
  public analyzeSignal(signalId: string): InterceptReport | null {
    const signal = this.signals.get(signalId);
    if (!signal) return null;

    // Simulate analysis logic based on signal properties
    const isRadar = signal.type === 'RADAR' || signal.frequency > 1000;
    const isEncrypted = Math.random() > 0.5;

    const report: InterceptReport = {
      id: `INT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      signalId: signal.id,
      interceptTime: new Date(),
      analyzedType: signal.type,
      confidence: 0.85 + Math.random() * 0.1,
      content: isEncrypted ? 'ENCRYPTED_DATA' : signal.content || 'NO_CONTENT',
      parameters: {
        pri: isRadar ? Math.random() * 1000 : undefined,
        pw: isRadar ? Math.random() * 50 : undefined,
        encryptionType: isEncrypted ? 'AES-256' : 'NONE',
      },
    };

    this.signalHistory.push(report);
    logger.info(
      `Signal analyzed: ${signalId} identified as ${report.analyzedType}`
    );
    this.emit('signalAnalyzed', report);
    return report;
  }

  /**
   * Performs Direction Finding (DF) on a signal using registered sensors.
   * Uses simulated Time Difference of Arrival (TDOA) logic.
   */
  public triangulateSignal(signalId: string): DirectionFindingResult | null {
    const signal = this.signals.get(signalId);
    if (!signal) {
      logger.warn(`Cannot triangulate unknown signal: ${signalId}`);
      return null;
    }

    // Need at least 2 active assets with sensing capabilities to triangulate
    const activeSensors = Array.from(this.assets.values()).filter(
      (a) => a.status === 'ACTIVE' || a.status === 'PASSIVE'
    );

    if (activeSensors.length < 2) {
      logger.warn('Insufficient sensors for triangulation.');
      return null;
    }

    // Simulate triangulation result
    // Accuracy improves with more sensors and closer proximity (simulated)
    const errorRadius = 1000 / Math.pow(activeSensors.length, 1.5);

    const result: DirectionFindingResult = {
      signalId,
      estimatedLocation: signal.location || { lat: 0, lon: 0 },
      errorRadius,
      triangulationPoints: activeSensors.length,
      timestamp: new Date(),
    };

    logger.info(
      `Signal ${signalId} triangulated with ${result.triangulationPoints} sensors. Error: ${errorRadius.toFixed(1)}m`
    );
    this.emit('directionFound', result);
    return result;
  }

  /**
   * Calculates the Jamming-to-Signal (J/S) ratio to estimate effectiveness.
   * This is a simplified physics model.
   */
  private calculateJammingEffectiveness(
    jammer: EWAsset,
    mission: JammingMission
  ): number {
    // 1. Check if jammer covers the target frequency
    if (
      mission.targetFrequency < jammer.frequencyRange[0] ||
      mission.targetFrequency > jammer.frequencyRange[1]
    ) {
      return 0.0;
    }

    // 2. Base effectiveness on power and technique
    let effectiveness = mission.powerOutput / jammer.maxPower;

    // 3. Technique modifiers
    switch (mission.effect) {
      case 'SPOT_JAMMING':
        effectiveness *= 1.0; // High concentration
        break;
      case 'BARRAGE_JAMMING':
        effectiveness *= 0.4; // Spread out power
        break;
      case 'DRFM_REPEATER':
        effectiveness *= 0.9; // High sophistication
        break;
      case 'NOISE_JAMMING':
        effectiveness *= 0.6; // Brute force
        break;
      default:
        effectiveness *= 0.5;
    }

    // 4. Random environmental factors (fading, multipath)
    effectiveness *= 0.8 + Math.random() * 0.4;

    return Math.min(Math.max(effectiveness, 0), 1);
  }

  /**
   * Executes an Electronic Attack (Jamming).
   */
  public deployJammer(
    assetId: string,
    targetFrequency: number,
    bandwidth: number,
    effect: EWEffectType,
    durationSeconds: number = 60
  ): JammingMission {
    const asset = this.assets.get(assetId);
    if (!asset) throw new Error('Asset not found');
    if (!asset.capabilities.includes(effect)) {
      throw new Error(`Asset ${asset.name} does not support effect ${effect}`);
    }
    if (asset.status === 'OFFLINE' || asset.status === 'DAMAGED') {
      throw new Error('Asset is not operational');
    }

    const mission: JammingMission = {
      id: `JAM-${Date.now()}-${Math.floor(Math.random() * 100)}`,
      assetId,
      targetFrequency,
      bandwidth,
      effect,
      startTime: new Date(),
      durationSeconds,
      powerOutput: asset.maxPower * 0.9, // Run at 90% power by default
      status: 'ACTIVE',
      effectiveness: 0,
    };

    // Calculate initial effectiveness
    mission.effectiveness = this.calculateJammingEffectiveness(asset, mission);

    this.activeJammers.set(mission.id, mission);
    logger.info(
      `Jamming mission started: ${effect} on ${targetFrequency}MHz by ${asset.name} (Eff: ${mission.effectiveness.toFixed(2)})`
    );
    this.emit('jammingStarted', mission);

    // Schedule auto-stop
    setTimeout(() => {
      this.stopJammer(mission.id);
    }, durationSeconds * 1000);

    return mission;
  }

  /**
   * Stops an active jamming mission.
   */
  public stopJammer(missionId: string): void {
    const mission = this.activeJammers.get(missionId);
    if (mission && mission.status === 'ACTIVE') {
      mission.status = 'COMPLETED';
      this.activeJammers.set(missionId, mission); // Update state
      logger.info(`Jamming mission completed: ${missionId}`);
      this.emit('jammingStopped', mission);
    }
  }

  /**
   * Specialized method for Communication Disruption.
   */
  public disruptCommunications(
    assetId: string,
    targetFreq: number
  ): JammingMission {
    return this.deployJammer(
      assetId,
      targetFreq,
      0.025, // Narrowband 25kHz
      'COMM_DISRUPTION',
      30
    );
  }

  /**
   * Specialized method for Radar Jamming.
   */
  public jamRadar(assetId: string, targetFreq: number): JammingMission {
    return this.deployJammer(
      assetId,
      targetFreq,
      10, // Wideband 10MHz
      'NOISE_JAMMING',
      45
    );
  }

  /**
   * Activates Electronic Protection (EP) measures for an asset.
   * e.g., Frequency Hopping, Power Management.
   */
  public activateProtection(
    assetId: string,
    measure: 'FREQ_HOPPING' | 'EMISSION_CONTROL' | 'ANTIJAM_FILTERS'
  ): void {
    const asset = this.assets.get(assetId);
    if (!asset) throw new Error('Asset not found');

    if (!asset.activeProtection.includes(measure)) {
      asset.activeProtection.push(measure);
      this.assets.set(assetId, asset);
      logger.info(`Activating EP measure ${measure} for asset ${asset.name}`);
      this.emit('protectionActivated', { assetId, measure });
    }
  }

  /**
   * Deactivates an EP measure.
   */
  public deactivateProtection(assetId: string, measure: string): void {
    const asset = this.assets.get(assetId);
    if (!asset) return;

    asset.activeProtection = asset.activeProtection.filter((m) => m !== measure);
    this.assets.set(assetId, asset);
    this.emit('protectionDeactivated', { assetId, measure });
  }

  /**
   * Electromagnetic Battle Management (EMBM).
   * Returns a situational awareness report of the spectrum.
   */
  public getBattleSpacePicture(): BattleSpaceView {
    const signals = Array.from(this.signals.values());
    const utilization =
      signals.length > 0 ? Math.min(signals.length * 0.1, 1.0) : 0; // Simulated

    return {
      timestamp: new Date(),
      assets: Array.from(this.assets.values()),
      signals: signals,
      activeJammers: Array.from(this.activeJammers.values()).filter(
        (j) => j.status === 'ACTIVE'
      ),
      intercepts: this.signalHistory.slice(-50), // Last 50 intercepts
      spectrumUtilization: utilization,
    };
  }

  /**
   * Simulates an EMP analysis impact assessment (Theoretical).
   */
  public analyzeEMPBlast(location: GeoLocation, yieldKt: number): any {
    const radiusKm = Math.sqrt(yieldKt) * 4; // Rudimentary scaling
    const affectedAssets = Array.from(this.assets.values()).filter((asset) => {
      // Simple distance calculation (ignoring earth curvature for short distances)
      const latDiff = (asset.location.lat - location.lat) * 111;
      const lonDiff =
        (asset.location.lon - location.lon) *
        111 *
        Math.cos(location.lat * (Math.PI / 180));
      const distKm = Math.sqrt(latDiff * latDiff + lonDiff * lonDiff);
      return distKm < radiusKm;
    });

    const report = {
      event: 'EMP_ANALYSIS',
      origin: location,
      yieldKt,
      estimatedRadiusKm: radiusKm,
      assetsAtRisk: affectedAssets.map((a) => a.id),
      timestamp: new Date(),
    };

    logger.warn(
      `EMP Analysis generated. Estimated ${affectedAssets.length} assets at risk.`
    );
    return report;
  }
}

export default new ElectronicWarfareService();
