import { v4 as uuidv4 } from 'uuid';
import { runCypher } from '../../graph/neo4j';
import { CampaignPhase, CampaignPhaseInput, CampaignPhaseName, CampaignPhaseStatus } from './models/campaign_phase';

/**
 * Service for managing Campaign Phases using Neo4j persistence.
 */
export class CampaignPhaseService {

  async getCampaignPhase(phase_id: string): Promise<CampaignPhase | undefined> {
    const cypher = `
      MATCH (p:CampaignPhase {phase_id: $phase_id})
      RETURN p { .* } as phase
    `;

    const result = await runCypher<{ phase: CampaignPhase }>(cypher, { phase_id });

    if (result.length === 0) return undefined;

    const phase = result[0].phase;
    // Parse JSON fields if necessary (Neo4j returns strings for complex types sometimes, but assuming runCypher handles basic types)
    // Adjust dates if needed
    return phase;
  }

  async getCampaignPhases(campaign_id: string): Promise<CampaignPhase[]> {
    const cypher = `
      MATCH (p:CampaignPhase {campaign_id: $campaign_id})
      RETURN p { .* } as phase
      ORDER BY p.start_date ASC
    `;

    const result = await runCypher<{ phase: CampaignPhase }>(cypher, { campaign_id });
    return result.map(r => r.phase);
  }

  async createCampaignPhase(input: CampaignPhaseInput): Promise<CampaignPhase> {
    const phase_id = uuidv4();
    const now = new Date().toISOString();

    const cypher = `
      CREATE (p:CampaignPhase {
        phase_id: $phase_id,
        campaign_id: $campaign_id,
        phase_name: $phase_name,
        description: $description,
        status: $status,
        tactics: $tactics,
        target_segments: $target_segments,
        vulnerabilities_targeted: $vulnerabilities_targeted,
        start_date: $start_date,
        end_date: $end_date,
        metrics: $metrics,
        provenance_id: $provenance_id,
        created_at: $created_at,
        updated_at: $created_at
      })
      RETURN p { .* } as phase
    `;

    const params = {
      phase_id,
      campaign_id: input.campaign_id,
      phase_name: input.phase_name,
      description: input.description || '',
      status: input.status || CampaignPhaseStatus.PLANNED,
      tactics: input.tactics || [],
      target_segments: input.target_segments || [],
      vulnerabilities_targeted: input.vulnerabilities_targeted || [],
      start_date: input.start_date ? new Date(input.start_date).toISOString() : null,
      end_date: input.end_date ? new Date(input.end_date).toISOString() : null,
      metrics: input.metrics ? JSON.stringify(input.metrics) : '{}', // Neo4j doesn't store maps natively easily without APOC or flattening
      provenance_id: input.provenance_id || null,
      created_at: now
    };

    const result = await runCypher<{ phase: CampaignPhase }>(cypher, params);
    return result[0].phase;
  }

  async updateCampaignPhase(phase_id: string, input: CampaignPhaseInput): Promise<CampaignPhase> {
    const now = new Date().toISOString();

    const cypher = `
      MATCH (p:CampaignPhase {phase_id: $phase_id})
      SET p.phase_name = $phase_name,
          p.description = $description,
          p.status = $status,
          p.tactics = $tactics,
          p.target_segments = $target_segments,
          p.vulnerabilities_targeted = $vulnerabilities_targeted,
          p.start_date = $start_date,
          p.end_date = $end_date,
          p.metrics = $metrics,
          p.provenance_id = $provenance_id,
          p.updated_at = $updated_at
      RETURN p { .* } as phase
    `;

    const params = {
      phase_id,
      phase_name: input.phase_name,
      description: input.description || '',
      status: input.status,
      tactics: input.tactics || [],
      target_segments: input.target_segments || [],
      vulnerabilities_targeted: input.vulnerabilities_targeted || [],
      start_date: input.start_date ? new Date(input.start_date).toISOString() : null,
      end_date: input.end_date ? new Date(input.end_date).toISOString() : null,
      metrics: input.metrics ? JSON.stringify(input.metrics) : '{}',
      provenance_id: input.provenance_id || null,
      updated_at: now
    };

    const result = await runCypher<{ phase: CampaignPhase }>(cypher, params);

    if (result.length === 0) {
       throw new Error(`CampaignPhase with ID ${phase_id} not found.`);
    }

    return result[0].phase;
  }

  async deleteCampaignPhase(phase_id: string): Promise<boolean> {
    const cypher = `
      MATCH (p:CampaignPhase {phase_id: $phase_id})
      DETACH DELETE p
      RETURN count(p) as deletedCount
    `;

    const result = await runCypher<{ deletedCount: number }>(cypher, { phase_id });
    // result[0].deletedCount might be a Neo4j Integer or JS number depending on driver config
    const count = result[0]?.deletedCount;
    // @ts-ignore
    return (typeof count === 'object' && count.toInt) ? count.toInt() > 0 : count > 0;
  }
}

export const campaignPhaseService = new CampaignPhaseService();
