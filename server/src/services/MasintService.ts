import {
  MasintSignal,
  RFSignal,
  AcousticSignal,
  NuclearSignal,
  ChemBioSignal,
  SeismicSignal,
  RadarCrossSection,
  InfraredSignal,
  SpectralSignal,
  AtmosphericSignal
} from '../types/masint.types.js';
import { z } from 'zod';
import logger from '../utils/logger.js';
import { getPostgresPool } from '../config/database.js';

// Define a simple AnalysisResult interface
export interface AnalysisResult {
  signalId: string;
  timestamp: string;
  threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  classification: string;
  confidence: number;
  anomalies: string[];
  recommendations: string[];
  correlatedEvents?: string[]; // IDs of other signals
}

export class MasintService {
  private static instance: MasintService;

  private constructor() {}

  public static getInstance(): MasintService {
    if (!MasintService.instance) {
      MasintService.instance = new MasintService();
    }
    return MasintService.instance;
  }

  /**
   * Main entry point for processing any MASINT signal.
   */
  public async processSignal(signalWrapper: MasintSignal): Promise<AnalysisResult> {
    const { type, data } = signalWrapper;
    let result: AnalysisResult;

    logger.info({ type, id: data.id }, 'Processing MASINT signal');

    // Persist raw signal
    try {
      const pool = getPostgresPool();
      await pool.query(
        'INSERT INTO masint_signals (id, type, data, timestamp) VALUES ($1, $2, $3, $4)',
        [data.id, type, data, new Date(data.timestamp || new Date())]
      );
    } catch (err) {
      logger.error({ err, id: data.id }, 'Failed to persist raw MASINT signal');
      // Continue processing even if persistence fails? strictly speaking, we should probably fail.
      // But for robustness in this demo, we'll log and proceed, or throw.
      // Let's throw to ensure data integrity.
      throw new Error('Failed to persist signal');
    }

    // Find correlations
    const correlations = await this.findCorrelations(signalWrapper);

    switch (type) {
      case 'rf':
        result = await this.analyzeRF(data as RFSignal);
        break;
      case 'acoustic':
        result = await this.analyzeAcoustic(data as AcousticSignal);
        break;
      case 'nuclear':
        result = await this.analyzeNuclear(data as NuclearSignal);
        break;
      case 'chembio':
        result = await this.analyzeChemBio(data as ChemBioSignal);
        break;
      case 'seismic':
        result = await this.analyzeSeismic(data as SeismicSignal);
        break;
      case 'radar':
        result = await this.analyzeRadar(data as RadarCrossSection);
        break;
      case 'infrared':
        result = await this.analyzeInfrared(data as InfraredSignal);
        break;
      case 'spectral':
        result = await this.analyzeSpectral(data as SpectralSignal);
        break;
      case 'atmospheric':
        result = await this.analyzeAtmospheric(data as AtmosphericSignal);
        break;
      default:
        throw new Error(`Unknown signal type: ${type}`);
    }

    if (correlations.length > 0) {
      result.correlatedEvents = correlations;
      result.recommendations.push(`Correlate with events: ${correlations.join(', ')}`);
    }

    // Persist analysis result
    try {
      const pool = getPostgresPool();
      await pool.query(
        'INSERT INTO masint_analysis (signal_id, result) VALUES ($1, $2)',
        [data.id, result]
      );
    } catch (err) {
      logger.error({ err, id: data.id }, 'Failed to persist MASINT analysis');
    }

    return result;
  }

  private async findCorrelations(signalWrapper: MasintSignal): Promise<string[]> {
    const { data } = signalWrapper;
    const pool = getPostgresPool();
    const correlations: string[] = [];

    let lat: number | undefined;
    let lon: number | undefined;

    // Handle standard 'location' property
    if ('location' in data && data.location) {
      lat = data.location.latitude;
      lon = data.location.longitude;
    }
    // Handle 'epicenter' property for Seismic signals
    else if ('epicenter' in data && data.epicenter) {
      lat = data.epicenter.latitude;
      lon = data.epicenter.longitude;
    }

    // If no location, skip spatial correlation
    if (lat === undefined || lon === undefined) {
      return [];
    }

    try {
      // JSONB query to find nearby signals.
      // Note: precise geospatial query requires PostGIS. This is a rough approximation using simple lat/lon matching in JSON.
      // We check both 'location' and 'epicenter' paths in the JSONB.
      // Assuming 1 degree approx 111km. 0.1 degree approx 11km.
      const query = `
        SELECT id FROM masint_signals
        WHERE id != $1
        AND timestamp > $2::timestamp - INTERVAL '5 minutes'
        AND timestamp < $2::timestamp + INTERVAL '5 minutes'
        AND (
          (
            ABS(CAST(data->'location'->>'latitude' AS FLOAT) - $3) < 0.1
            AND ABS(CAST(data->'location'->>'longitude' AS FLOAT) - $4) < 0.1
          )
          OR
          (
            ABS(CAST(data->'epicenter'->>'latitude' AS FLOAT) - $3) < 0.1
            AND ABS(CAST(data->'epicenter'->>'longitude' AS FLOAT) - $4) < 0.1
          )
        )
        LIMIT 5
      `;

      const res = await pool.query(query, [
        data.id,
        data.timestamp || new Date(),
        lat,
        lon
      ]);

      res.rows.forEach(row => correlations.push(row.id));
    } catch (err) {
      logger.warn({ err }, 'Error finding correlations');
    }

    return correlations;
  }

  private async analyzeRF(signal: RFSignal): Promise<AnalysisResult> {
    const threatLevel = signal.powerDbm > 50 ? 'HIGH' : 'LOW';
    const classification = signal.modulation === 'PULSE' ? 'RADAR' : 'COMMUNICATION';

    return {
      signalId: signal.id,
      timestamp: new Date().toISOString(),
      threatLevel,
      classification,
      confidence: 0.85,
      anomalies: signal.frequencyMhz > 10000 ? ['High Frequency Emission'] : [],
      recommendations: threatLevel === 'HIGH' ? ['Initiate jamming', 'Triangulate source'] : ['Monitor'],
    };
  }

  private async analyzeAcoustic(signal: AcousticSignal): Promise<AnalysisResult> {
    const isExplosion = signal.amplitudeDb > 120 && signal.durationMs < 500;

    return {
      signalId: signal.id,
      timestamp: new Date().toISOString(),
      threatLevel: isExplosion ? 'CRITICAL' : 'LOW',
      classification: isExplosion ? 'EXPLOSION' : signal.classification || 'UNKNOWN',
      confidence: 0.9,
      anomalies: [],
      recommendations: isExplosion ? ['Deploy emergency services', 'Check seismic correlation'] : [],
    };
  }

  private async analyzeNuclear(signal: NuclearSignal): Promise<AnalysisResult> {
    const isWeaponsGrade = ['U-235', 'Pu-239'].includes(signal.isotope) && signal.radiationLevelSv > 0.001;

    return {
      signalId: signal.id,
      timestamp: new Date().toISOString(),
      threatLevel: isWeaponsGrade ? 'CRITICAL' : 'MEDIUM',
      classification: isWeaponsGrade ? 'WEAPONS_MATERIAL' : 'INDUSTRIAL_SOURCE',
      confidence: 0.99,
      anomalies: signal.radiationLevelSv > 0.5 ? ['Lethal Dose Detected'] : [],
      recommendations: ['Isolate area', 'Deploy hazmat team'],
    };
  }

  private async analyzeChemBio(signal: ChemBioSignal): Promise<AnalysisResult> {
    return {
      signalId: signal.id,
      timestamp: new Date().toISOString(),
      threatLevel: 'CRITICAL',
      classification: signal.agentName,
      confidence: signal.confidence,
      anomalies: ['Bio-agent detected'],
      recommendations: ['Activate containment protocols', 'Distribute antidotes'],
    };
  }

  private async analyzeSeismic(signal: SeismicSignal): Promise<AnalysisResult> {
    const isNuclearTest = signal.eventType === 'explosion' && signal.depthKm < 1;

    return {
      signalId: signal.id,
      timestamp: new Date().toISOString(),
      threatLevel: isNuclearTest ? 'CRITICAL' : 'LOW',
      classification: signal.eventType.toUpperCase(),
      confidence: 0.8,
      anomalies: isNuclearTest ? ['Shallow depth explosion signature'] : [],
      recommendations: isNuclearTest ? ['Verify with radionuclides', 'Notify command'] : [],
    };
  }

  private async analyzeRadar(signal: RadarCrossSection): Promise<AnalysisResult> {
    const isStealth = signal.rcsDbsm < -20;

    return {
      signalId: signal.id,
      timestamp: new Date().toISOString(),
      threatLevel: isStealth ? 'HIGH' : 'MEDIUM',
      classification: isStealth ? 'STEALTH_AIRCRAFT' : 'STANDARD_TARGET',
      confidence: 0.75,
      anomalies: [],
      recommendations: isStealth ? ['Enable multi-static tracking'] : [],
    };
  }

  private async analyzeInfrared(signal: InfraredSignal): Promise<AnalysisResult> {
    const isMissileLaunch = signal.intensityWattsPerSr > 5000 && (signal.sourceType === 'plume' || !signal.sourceType);

    return {
      signalId: signal.id,
      timestamp: new Date().toISOString(),
      threatLevel: isMissileLaunch ? 'CRITICAL' : 'LOW',
      classification: isMissileLaunch ? 'MISSILE_LAUNCH' : 'THERMAL_SOURCE',
      confidence: 0.88,
      anomalies: [],
      recommendations: isMissileLaunch ? ['Activate missile defense'] : [],
    };
  }

  private async analyzeSpectral(signal: SpectralSignal): Promise<AnalysisResult> {
    return {
      signalId: signal.id,
      timestamp: new Date().toISOString(),
      threatLevel: 'LOW',
      classification: signal.materialClassification || 'UNKNOWN_MATERIAL',
      confidence: signal.confidence || 0.5,
      anomalies: [],
      recommendations: ['Catalog material signature'],
    };
  }

  private async analyzeAtmospheric(signal: AtmosphericSignal): Promise<AnalysisResult> {
    return {
      signalId: signal.id,
      timestamp: new Date().toISOString(),
      threatLevel: 'LOW',
      classification: 'METEOROLOGICAL_DATA',
      confidence: 1.0,
      anomalies: [],
      recommendations: [],
    };
  }

  /**
   * Retrieve past analysis result.
   */
  public async getAnalysis(signalId: string): Promise<AnalysisResult | undefined> {
    const pool = getPostgresPool();
    try {
      const res = await pool.query(
        'SELECT result FROM masint_analysis WHERE signal_id = $1',
        [signalId]
      );
      if (res.rows.length > 0) {
        return res.rows[0].result as AnalysisResult;
      }
    } catch (err) {
      logger.error({ err, signalId }, 'Error retrieving analysis');
    }
    return undefined;
  }
}
