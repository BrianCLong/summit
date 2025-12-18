import { Signal, Emitter } from '../types.js';
import { getPostgresPool, getNeo4jDriver } from '../../config/database.js';
import { telemetry } from '../../lib/telemetry/comprehensive-telemetry.js';
import { Driver } from 'neo4j-driver';
import { ManagedPostgresPool } from '../../db/postgres.js';

export class SigIntRepository {
  private static instance: SigIntRepository;
  private pgPool: ManagedPostgresPool;
  private neo4jDriver: Driver;

  private constructor() {
    this.pgPool = getPostgresPool();
    this.neo4jDriver = getNeo4jDriver();
  }

  public static getInstance(): SigIntRepository {
    if (!SigIntRepository.instance) {
      SigIntRepository.instance = new SigIntRepository();
    }
    return SigIntRepository.instance;
  }

  // --- Emitter Operations ---

  public async upsertEmitter(emitter: Emitter): Promise<void> {
    const client = await this.pgPool.connect();
    try {
      await client.query('BEGIN');

      // 1. Postgres Upsert
      const query = `
        INSERT INTO sigint_emitters (
          id, name, type, status, last_seen_at, frequency_min, frequency_max, detected_modulations, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
          last_seen_at = EXCLUDED.last_seen_at,
          detected_modulations = array_cat(sigint_emitters.detected_modulations, EXCLUDED.detected_modulations),
          frequency_min = LEAST(sigint_emitters.frequency_min, EXCLUDED.frequency_min),
          frequency_max = GREATEST(sigint_emitters.frequency_max, EXCLUDED.frequency_max),
          metadata = sigint_emitters.metadata || EXCLUDED.metadata;
      `;

      await client.query(query, [
        emitter.id,
        emitter.name,
        emitter.type,
        emitter.status,
        emitter.lastSeen,
        emitter.frequencyRange.min,
        emitter.frequencyRange.max,
        emitter.detectedModulations,
        JSON.stringify(emitter.location || {}) // Store location in metadata for now or specialized column
      ]);

      // 2. Neo4j Sync (Graph Projection)
      await this.syncEmitterToGraph(emitter);

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      telemetry.subsystems.database.errors.add(1);
      throw err;
    } finally {
      client.release();
    }
  }

  public async getEmitter(id: string): Promise<Emitter | null> {
    const res = await this.pgPool.read('SELECT * FROM sigint_emitters WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return this.mapRowToEmitter(res.rows[0]);
  }

  public async getAllEmitters(): Promise<Emitter[]> {
    const res = await this.pgPool.read('SELECT * FROM sigint_emitters ORDER BY last_seen_at DESC LIMIT 100');
    return res.rows.map(this.mapRowToEmitter);
  }

  // --- Signal Operations ---

  public async logSignal(signal: Signal): Promise<void> {
    const query = `
      INSERT INTO sigint_signals (
        id, emitter_id, timestamp, frequency, bandwidth, power, snr, duration,
        modulation_type, classification_label, classification_confidence, threat_level,
        geolocation, content_snippet, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    `;

    try {
      await this.pgPool.query(query, [
        signal.id,
        signal.emitterId,
        signal.timestamp,
        signal.frequency,
        signal.bandwidth,
        signal.power,
        signal.snr,
        signal.duration,
        signal.modulationType,
        signal.classification?.label,
        signal.classification?.confidence,
        signal.classification?.threatLevel,
        JSON.stringify(signal.geolocation),
        signal.content,
        JSON.stringify(signal.metadata)
      ]);

      // Sync Signal Event to Graph
      await this.syncSignalToGraph(signal);

    } catch (err) {
      telemetry.subsystems.database.errors.add(1);
      throw err;
    }
  }

  public async getSignalsByEmitter(emitterId: string, limit: number = 50): Promise<Signal[]> {
    const res = await this.pgPool.read(
      'SELECT * FROM sigint_signals WHERE emitter_id = $1 ORDER BY timestamp DESC LIMIT $2',
      [emitterId, limit]
    );
    return res.rows.map(this.mapRowToSignal);
  }

  public async getRecentSignals(limit: number = 50): Promise<Signal[]> {
    const res = await this.pgPool.read(
      'SELECT * FROM sigint_signals ORDER BY timestamp DESC LIMIT $1',
      [limit]
    );
    return res.rows.map(this.mapRowToSignal);
  }

  // --- Graph Sync ---

  private async syncEmitterToGraph(emitter: Emitter) {
    const session = this.neo4jDriver.session();
    try {
      await session.run(`
        MERGE (e:Emitter {id: $id})
        SET e.name = $name,
            e.type = $type,
            e.lastSeen = $lastSeen,
            e.threatLevel = $threatLevel
        WITH e
        CALL spatial.addNode('layer_emitters', e) YIELD node RETURN node
      `, {
        id: emitter.id,
        name: emitter.name,
        type: emitter.type,
        lastSeen: emitter.lastSeen.toISOString(),
        threatLevel: 'UNKNOWN' // Could be refined
      });
    } catch (e) {
      // Log but don't fail the transaction if Graph is down (Soft dependency)
      console.warn('Neo4j sync failed for emitter', e);
    } finally {
      await session.close();
    }
  }

  private async syncSignalToGraph(signal: Signal) {
     const session = this.neo4jDriver.session();
     try {
       // Link Signal to Emitter and potentially a Location
       await session.run(`
         MATCH (e:Emitter {id: $emitterId})
         CREATE (s:Signal {
           id: $id,
           timestamp: $timestamp,
           frequency: $frequency,
           classification: $classification
         })
         CREATE (e)-[:EMITTED]->(s)
         WITH s
         WHERE $lat IS NOT NULL
         CREATE (l:Location {latitude: $lat, longitude: $lon})
         CREATE (s)-[:ORIGINATED_AT]->(l)
       `, {
         emitterId: signal.emitterId,
         id: signal.id,
         timestamp: signal.timestamp.toISOString(),
         frequency: signal.frequency,
         classification: signal.classification?.label,
         lat: signal.geolocation?.latitude,
         lon: signal.geolocation?.longitude
       });
     } catch (e) {
       console.warn('Neo4j sync failed for signal', e);
     } finally {
       await session.close();
     }
  }

  // --- Mappers ---

  private mapRowToEmitter(row: any): Emitter {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      status: row.status,
      lastSeen: row.last_seen_at,
      frequencyRange: { min: parseInt(row.frequency_min), max: parseInt(row.frequency_max) },
      detectedModulations: row.detected_modulations || [],
      location: row.metadata ? JSON.parse(JSON.stringify(row.metadata)) : undefined // simplified
    };
  }

  private mapRowToSignal(row: any): Signal {
    return {
      id: row.id,
      emitterId: row.emitter_id,
      timestamp: row.timestamp,
      frequency: parseInt(row.frequency),
      bandwidth: parseInt(row.bandwidth),
      power: row.power,
      snr: row.snr,
      duration: row.duration,
      modulationType: row.modulation_type,
      classification: {
        label: row.classification_label,
        confidence: row.classification_confidence,
        threatLevel: row.threat_level as any,
        tags: [] // Not stored in flat schema for simplicity, could be JSON
      },
      geolocation: row.geolocation,
      content: row.content_snippet,
      metadata: row.metadata
    };
  }
}
