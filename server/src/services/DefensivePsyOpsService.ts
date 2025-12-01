/**
 * Defensive Psychological Operations Service
 *
 * DEFENSIVE ONLY: Protects against psychological warfare, influence campaigns,
 * and cognitive manipulation attempts targeting the organization or users.
 */

import { Pool } from 'pg';
import logger from '../utils/logger';
import { EventEmitter } from 'events';
import { ContentAnalyzer, AnalysisResult } from './ContentAnalyzer';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const eventBus = require('../workers/eventBus.js') as EventEmitter;

export interface PsyOpsThread {
  id: string;
  source: string;
  threat_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  attack_vector: string;
  narrative: string;
  sentiment_score: number;
  status: 'MONITORING' | 'INVESTIGATING' | 'RESOLVED';
  created_at: Date;
  metadata?: any;
}

export class DefensivePsyOpsService extends EventEmitter {
  private db: Pool | null = null;
  private logger = logger;
  private analyzer: ContentAnalyzer;

  constructor(dbPool?: Pool) {
    super();
    this.analyzer = new ContentAnalyzer();

    if (dbPool) {
      this.db = dbPool;
    }

    this.initializeEventListeners();
  }

  /**
   * Lazy load the database pool to allow for isolated testing and avoid
   * import side-effects from the monolithic config.
   */
  private async getDb(): Promise<Pool> {
    if (this.db) return this.db;

    try {
      const { getPostgresPool } = await import('../config/database.js');
      this.db = getPostgresPool() as unknown as Pool;
      return this.db;
    } catch (error) {
      this.logger.error('Failed to load database config module', error);
      throw new Error('Database not initialized');
    }
  }

  private initializeEventListeners() {
    eventBus.on('raw-event', async (event: any) => {
      if (event.source === 'red-team' && (event.type === 'phishing' || event.type === 'influence')) {
        this.logger.info('Analyzing Red Team event for PsyOps...', { type: event.type });

        const content = event.data?.narrative || event.data?.description || JSON.stringify(event.data);

        // We capture errors here to prevent event bus crashes
        try {
          await this.detectPsychologicalThreats(content, {
               source: 'RED_TEAM_SIMULATION',
               original_event_type: event.type,
               ...event.data
          });
        } catch (err) {
          this.logger.error('Error processing Red Team event', err);
        }
      }
    });
  }

  public async detectPsychologicalThreats(
    content: string,
    metadata: any,
  ): Promise<PsyOpsThread | null> {
    try {
      const analysis: AnalysisResult = this.analyzer.analyze(content);

      if (analysis.manipulationScore > 0.4 || analysis.flags.length > 0) {

        const threatLevel = this.calculateThreatLevel(analysis.manipulationScore, analysis.flags);

        const threat = await this.persistThreat({
          source: metadata.source || 'UNKNOWN',
          threatLevel,
          attackVector: analysis.keywords.join(',') || 'unknown',
          narrative: content.substring(0, 1000),
          sentiment: analysis.sentiment,
          status: 'MONITORING',
          metadata: { ...metadata, analysis }
        });

        this.emit('threatDetected', threat);
        this.logger.warn(`PsyOps Threat Detected: ${threat.id} [${threatLevel}]`);

        await this.logEvent(threat.id, 'THREAT_DETECTED', { analysis, metadata });

        return threat;
      }

      return null;
    } catch (error) {
      this.logger.error('Error detecting psychological threats:', error);
      return null;
    }
  }

  private calculateThreatLevel(score: number, flags: string[]): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score > 0.8 || flags.includes('HIGH_RISK_DISINFO')) return 'CRITICAL';
    if (score > 0.6) return 'HIGH';
    if (score > 0.4) return 'MEDIUM';
    return 'LOW';
  }

  private async persistThreat(data: {
    source: string;
    threatLevel: string;
    attackVector: string;
    narrative: string;
    sentiment: number;
    status: string;
    metadata: any;
  }): Promise<PsyOpsThread> {
    const db = await this.getDb();
    const query = `
      INSERT INTO psyops_threats
      (source, threat_level, attack_vector, narrative, sentiment_score, status, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const values = [
      data.source,
      data.threatLevel,
      data.attackVector,
      data.narrative,
      data.sentiment,
      data.status,
      JSON.stringify(data.metadata)
    ];

    const res = await db.query(query, values);
    return res.rows[0];
  }

  private async logEvent(threatId: string, eventType: string, details: any): Promise<void> {
    const db = await this.getDb();
    const query = `
      INSERT INTO psyops_logs (threat_id, event_type, details)
      VALUES ($1, $2, $3)
    `;
    await db.query(query, [threatId, eventType, JSON.stringify(details)]);
  }

  public async getActiveThreats(): Promise<PsyOpsThread[]> {
    const db = await this.getDb();
    const res = await db.query("SELECT * FROM psyops_threats WHERE status != 'RESOLVED' ORDER BY created_at DESC");
    return res.rows;
  }

  public async resolveThreat(threatId: string, resolutionNotes: string): Promise<void> {
     const db = await this.getDb();
     await db.query("UPDATE psyops_threats SET status = 'RESOLVED', updated_at = NOW() WHERE id = $1", [threatId]);
     await this.logEvent(threatId, 'THREAT_RESOLVED', { notes: resolutionNotes });
  }
}
