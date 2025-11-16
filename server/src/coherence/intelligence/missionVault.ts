import { Neo4jService } from '../../db/neo4j';
import { RedisService } from '../../cache/redis';
import logger from '../../utils/logger';
import { randomUUID as uuidv4 } from 'crypto';

export interface MissionContext {
  missionId: string;
  tenantId: string;
  name: string;
  description: string;
  objectives: MissionObjective[];
  currentPhase: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  classification: 'public' | 'internal' | 'confidential' | 'secret';
  stakeholders: Stakeholder[];
  resources: MissionResource[];
  timeline: MissionTimeline;
  riskProfile: RiskProfile;
  successCriteria: SuccessCriteria[];
  metadata: Record<string, any>;
  created: string;
  lastUpdated: string;
}

export interface MissionObjective {
  objectiveId: string;
  title: string;
  description: string;
  type: 'intelligence' | 'operational' | 'strategic' | 'tactical';
  status: 'pending' | 'active' | 'completed' | 'blocked' | 'cancelled';
  priority: number;
  dependencies: string[];
  assignedAssets: string[];
  progressMetrics: ProgressMetric[];
  estimatedCompletion: string;
}

export interface Stakeholder {
  stakeholderId: string;
  name: string;
  role: string;
  organization: string;
  accessLevel: 'read' | 'contribute' | 'manage' | 'control';
  responsibilities: string[];
  contactInfo: Record<string, any>;
}

export interface MissionResource {
  resourceId: string;
  type: 'human' | 'technical' | 'financial' | 'informational';
  name: string;
  description: string;
  availability: 'available' | 'allocated' | 'unavailable';
  allocation: ResourceAllocation;
  constraints: string[];
}

export interface ResourceAllocation {
  startDate: string;
  endDate: string;
  percentage: number;
  cost: number;
  justification: string;
}

export interface MissionTimeline {
  startDate: string;
  plannedEndDate: string;
  actualEndDate?: string;
  milestones: Milestone[];
  criticalPath: string[];
  bufferTime: number;
}

export interface Milestone {
  milestoneId: string;
  name: string;
  description: string;
  targetDate: string;
  actualDate?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'delayed' | 'at_risk';
  dependencies: string[];
  deliverables: string[];
}

export interface RiskProfile {
  overallRiskLevel: 'low' | 'medium' | 'high' | 'extreme';
  riskFactors: RiskFactor[];
  mitigationStrategies: MitigationStrategy[];
  contingencyPlans: ContingencyPlan[];
  lastAssessment: string;
}

export interface RiskFactor {
  riskId: string;
  category: 'operational' | 'technical' | 'political' | 'resource' | 'timeline';
  description: string;
  probability: number;
  impact: number;
  riskScore: number;
  status: 'identified' | 'monitoring' | 'mitigating' | 'escalated' | 'closed';
}

export interface MitigationStrategy {
  strategyId: string;
  riskIds: string[];
  strategy: string;
  implementation: string;
  effectiveness: number;
  cost: number;
  responsible: string;
}

export interface ContingencyPlan {
  planId: string;
  triggerConditions: string[];
  actions: string[];
  resources: string[];
  decision_authority: string;
}

export interface SuccessCriteria {
  criteriaId: string;
  name: string;
  description: string;
  type: 'quantitative' | 'qualitative' | 'binary';
  target: any;
  current: any;
  measurement_method: string;
  frequency: string;
}

export interface ProgressMetric {
  metricId: string;
  name: string;
  value: number;
  target: number;
  unit: string;
  timestamp: string;
}

export class MissionVault {
  private accessControlCache = new Map<string, any>();

  constructor(
    private neo4j: Neo4jService,
    private redis: RedisService,
  ) {}

  async createMissionContext(
    tenantId: string,
    missionData: Partial<MissionContext>,
  ): Promise<MissionContext> {
    try {
      const missionId = missionData.missionId || uuidv4();

      const mission: MissionContext = {
        missionId,
        tenantId,
        name: missionData.name || 'Unnamed Mission',
        description: missionData.description || '',
        objectives: missionData.objectives || [],
        currentPhase: missionData.currentPhase || 'planning',
        priority: missionData.priority || 'medium',
        classification: missionData.classification || 'internal',
        stakeholders: missionData.stakeholders || [],
        resources: missionData.resources || [],
        timeline: missionData.timeline || this.createDefaultTimeline(),
        riskProfile: missionData.riskProfile || this.createDefaultRiskProfile(),
        successCriteria: missionData.successCriteria || [],
        metadata: missionData.metadata || {},
        created: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      };

      await this.storeMissionContext(mission);

      logger.info('Mission context created', {
        tenantId,
        missionId,
        name: mission.name,
        priority: mission.priority,
        classification: mission.classification,
      });

      return mission;
    } catch (error) {
      logger.error('Failed to create mission context', {
        error,
        tenantId,
        missionData,
      });
      throw error;
    }
  }

  async getMissionContext(
    tenantId: string,
    missionId?: string,
  ): Promise<MissionContext | null> {
    try {
      // If no specific mission ID, get the most active/recent mission
      if (!missionId) {
        const activeMissions = await this.getActiveMissions(tenantId);
        if (activeMissions.length === 0) return null;
        return activeMissions[0];
      }

      // Try cache first
      const cacheKey = `mission:${tenantId}:${missionId}`;
      const cached = await this.redis.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      // Query from Neo4j
      const session = this.neo4j.getSession();
      try {
        const result = await session.executeRead(async (tx) => {
          return await tx.run(
            `
            MATCH (t:Tenant {tenant_id: $tenantId})-[:HAS_MISSION]->(m:Mission {mission_id: $missionId})
            OPTIONAL MATCH (m)-[:HAS_OBJECTIVE]->(obj:Objective)
            OPTIONAL MATCH (m)-[:HAS_STAKEHOLDER]->(sh:Stakeholder)
            OPTIONAL MATCH (m)-[:HAS_RESOURCE]->(res:Resource)
            OPTIONAL MATCH (m)-[:HAS_MILESTONE]->(ms:Milestone)
            OPTIONAL MATCH (m)-[:HAS_RISK]->(rf:RiskFactor)
            OPTIONAL MATCH (m)-[:HAS_CRITERIA]->(sc:SuccessCriteria)

            WITH m,
                 collect(DISTINCT obj) as objectives,
                 collect(DISTINCT sh) as stakeholders,
                 collect(DISTINCT res) as resources,
                 collect(DISTINCT ms) as milestones,
                 collect(DISTINCT rf) as riskFactors,
                 collect(DISTINCT sc) as successCriteria

            RETURN m {
              .*,
              objectives: objectives,
              stakeholders: stakeholders,
              resources: resources,
              milestones: milestones,
              riskFactors: riskFactors,
              successCriteria: successCriteria
            } as mission
          `,
            { tenantId, missionId },
          );
        });

        if (result.records.length === 0) return null;

        const missionData = result.records[0].get('mission');
        const mission = this.transformNeo4jToMissionContext(missionData);

        // Cache the result
        await this.redis.setex(cacheKey, 600, JSON.stringify(mission));

        return mission;
      } finally {
        await session.close();
      }
    } catch (error) {
      logger.error('Failed to get mission context', {
        error,
        tenantId,
        missionId,
      });
      return null;
    }
  }

  async updateMissionProgress(
    tenantId: string,
    missionId: string,
    updates: {
      objectiveUpdates?: Partial<MissionObjective>[];
      milestoneUpdates?: Partial<Milestone>[];
      riskUpdates?: Partial<RiskFactor>[];
      phaseChange?: string;
      metadata?: Record<string, any>;
    },
  ): Promise<void> {
    const session = this.neo4j.getSession();
    try {

      await session.executeWrite(async (tx) => {
        // Update mission phase if provided
        if (updates.phaseChange) {
          await tx.run(
            `
            MATCH (m:Mission {mission_id: $missionId})
            SET m.current_phase = $phase, m.last_updated = datetime()
          `,
            { missionId, phase: updates.phaseChange },
          );
        }

        // Update objectives
        if (updates.objectiveUpdates?.length) {
          for (const objUpdate of updates.objectiveUpdates) {
            await tx.run(
              `
              MATCH (m:Mission {mission_id: $missionId})-[:HAS_OBJECTIVE]->(obj:Objective {objective_id: $objectiveId})
              SET obj += $updates, obj.last_updated = datetime()
            `,
              {
                missionId,
                objectiveId: objUpdate.objectiveId,
                updates: this.sanitizeNeo4jObject(objUpdate),
              },
            );
          }
        }

        // Update milestones
        if (updates.milestoneUpdates?.length) {
          for (const msUpdate of updates.milestoneUpdates) {
            await tx.run(
              `
              MATCH (m:Mission {mission_id: $missionId})-[:HAS_MILESTONE]->(ms:Milestone {milestone_id: $milestoneId})
              SET ms += $updates, ms.last_updated = datetime()
            `,
              {
                missionId,
                milestoneId: msUpdate.milestoneId,
                updates: this.sanitizeNeo4jObject(msUpdate),
              },
            );
          }
        }

        // Update risks
        if (updates.riskUpdates?.length) {
          for (const riskUpdate of updates.riskUpdates) {
            await tx.run(
              `
              MATCH (m:Mission {mission_id: $missionId})-[:HAS_RISK]->(rf:RiskFactor {risk_id: $riskId})
              SET rf += $updates, rf.last_updated = datetime()
            `,
              {
                missionId,
                riskId: riskUpdate.riskId,
                updates: this.sanitizeNeo4jObject(riskUpdate),
              },
            );
          }
        }

        // Update metadata
        if (updates.metadata) {
          await tx.run(
            `
            MATCH (m:Mission {mission_id: $missionId})
            SET m.metadata = $metadata, m.last_updated = datetime()
          `,
            { missionId, metadata: JSON.stringify(updates.metadata) },
          );
        }
      });

      // Invalidate cache
      await this.redis.del(`mission:${tenantId}:${missionId}`);

      logger.info('Mission progress updated', {
        tenantId,
        missionId,
        updates: Object.keys(updates),
      });
    } finally {
      await session.close();
    }
  }

  async assessMissionHealth(
    tenantId: string,
    missionId: string,
  ): Promise<{
    overallHealth: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    healthScore: number;
    factors: any[];
    recommendations: string[];
  }> {
    try {
      const mission = await this.getMissionContext(tenantId, missionId);
      if (!mission) {
        return {
          overallHealth: 'critical',
          healthScore: 0,
          factors: [
            { factor: 'mission_not_found', score: 0, impact: 'critical' },
          ],
          recommendations: ['Verify mission exists and is accessible'],
        };
      }

      const factors = [];
      let totalScore = 0;
      let factorCount = 0;

      // Assess timeline health
      const timelineHealth = this.assessTimelineHealth(mission);
      factors.push(timelineHealth);
      totalScore += timelineHealth.score;
      factorCount++;

      // Assess objective progress
      const objectiveHealth = this.assessObjectiveHealth(mission);
      factors.push(objectiveHealth);
      totalScore += objectiveHealth.score;
      factorCount++;

      // Assess risk profile
      const riskHealth = this.assessRiskHealth(mission);
      factors.push(riskHealth);
      totalScore += riskHealth.score;
      factorCount++;

      // Assess resource allocation
      const resourceHealth = this.assessResourceHealth(mission);
      factors.push(resourceHealth);
      totalScore += resourceHealth.score;
      factorCount++;

      const healthScore = factorCount > 0 ? totalScore / factorCount : 0;
      const overallHealth = this.determineOverallHealth(healthScore);
      const recommendations = this.generateHealthRecommendations(
        factors,
        mission,
      );

      return {
        overallHealth,
        healthScore,
        factors,
        recommendations,
      };
    } catch (error) {
      logger.error('Failed to assess mission health', {
        error,
        tenantId,
        missionId,
      });
      return {
        overallHealth: 'critical',
        healthScore: 0,
        factors: [{ factor: 'assessment_error', score: 0, impact: 'critical' }],
        recommendations: ['Contact system administrator'],
      };
    }
  }

  async getActiveMissions(tenantId: string): Promise<MissionContext[]> {
    const session = this.neo4j.getSession();

    try {
      const result = await session.executeRead(async (tx) => {
        return await tx.run(
          `
          MATCH (t:Tenant {tenant_id: $tenantId})-[:HAS_MISSION]->(m:Mission)
          WHERE m.current_phase IN ['planning', 'active', 'monitoring']
          OPTIONAL MATCH (m)-[:HAS_OBJECTIVE]->(obj:Objective)
          OPTIONAL MATCH (m)-[:HAS_STAKEHOLDER]->(sh:Stakeholder)
          OPTIONAL MATCH (m)-[:HAS_RESOURCE]->(res:Resource)
          OPTIONAL MATCH (m)-[:HAS_MILESTONE]->(ms:Milestone)
          OPTIONAL MATCH (m)-[:HAS_RISK]->(rf:RiskFactor)
          OPTIONAL MATCH (m)-[:HAS_CRITERIA]->(sc:SuccessCriteria)

          WITH m,
               collect(DISTINCT obj) as objectives,
               collect(DISTINCT sh) as stakeholders,
               collect(DISTINCT res) as resources,
               collect(DISTINCT ms) as milestones,
               collect(DISTINCT rf) as riskFactors,
               collect(DISTINCT sc) as successCriteria

          RETURN m {
            .*,
            objectives: objectives,
            stakeholders: stakeholders,
            resources: resources,
            milestones: milestones,
            riskFactors: riskFactors,
            successCriteria: successCriteria
          } as mission
          ORDER BY m.priority DESC, m.last_updated DESC
        `,
          { tenantId },
        );
      });

      return result.records.map((record) => {
        const missionData = record.get('mission');
        return this.transformNeo4jToMissionContext(missionData);
      });
    } finally {
      await session.close();
    }
  }

  async linkCoherenceToMission(
    tenantId: string,
    missionId: string,
    coherenceData: {
      signalTypes: string[];
      activityPatterns: string[];
      narrativeImpacts: string[];
      relevanceScore: number;
    },
  ): Promise<void> {
    const session = this.neo4j.getSession();
    try {

      await session.executeWrite(async (tx) => {
        await tx.run(
          `
          MATCH (m:Mission {mission_id: $missionId})
          MERGE (m)-[:INFORMED_BY]->(ci:CoherenceIntel {
            signal_types: $signalTypes,
            activity_patterns: $activityPatterns,
            narrative_impacts: $narrativeImpacts,
            relevance_score: $relevanceScore,
            linked_at: datetime(),
            last_updated: datetime()
          })
        `,
          {
            missionId,
            signalTypes: coherenceData.signalTypes,
            activityPatterns: coherenceData.activityPatterns,
            narrativeImpacts: coherenceData.narrativeImpacts,
            relevanceScore: coherenceData.relevanceScore,
          },
        );
      });

      // Invalidate mission cache
      await this.redis.del(`mission:${tenantId}:${missionId}`);

      logger.info('Coherence data linked to mission', {
        tenantId,
        missionId,
        relevanceScore: coherenceData.relevanceScore,
      });
    } finally {
      await session.close();
    }
  }

  private async storeMissionContext(mission: MissionContext): Promise<void> {
    const session = this.neo4j.getSession();

    try {
      await session.executeWrite(async (tx) => {
        // Create mission node
        await tx.run(
          `
          MATCH (t:Tenant {tenant_id: $tenantId})
          MERGE (m:Mission {mission_id: $missionId})
          SET m += {
            tenant_id: $tenantId,
            name: $name,
            description: $description,
            current_phase: $currentPhase,
            priority: $priority,
            classification: $classification,
            metadata: $metadata,
            created: datetime($created),
            last_updated: datetime($lastUpdated)
          }
          MERGE (t)-[:HAS_MISSION]->(m)
        `,
          {
            tenantId: mission.tenantId,
            missionId: mission.missionId,
            name: mission.name,
            description: mission.description,
            currentPhase: mission.currentPhase,
            priority: mission.priority,
            classification: mission.classification,
            metadata: JSON.stringify(mission.metadata),
            created: mission.created,
            lastUpdated: mission.lastUpdated,
          },
        );

        // Store objectives
        for (const objective of mission.objectives) {
          await tx.run(
            `
            MATCH (m:Mission {mission_id: $missionId})
            MERGE (obj:Objective {objective_id: $objectiveId})
            SET obj += $objective
            MERGE (m)-[:HAS_OBJECTIVE]->(obj)
          `,
            {
              missionId: mission.missionId,
              objectiveId: objective.objectiveId,
              objective: this.sanitizeNeo4jObject(objective),
            },
          );
        }

        // Store stakeholders
        for (const stakeholder of mission.stakeholders) {
          await tx.run(
            `
            MATCH (m:Mission {mission_id: $missionId})
            MERGE (sh:Stakeholder {stakeholder_id: $stakeholderId})
            SET sh += $stakeholder
            MERGE (m)-[:HAS_STAKEHOLDER]->(sh)
          `,
            {
              missionId: mission.missionId,
              stakeholderId: stakeholder.stakeholderId,
              stakeholder: this.sanitizeNeo4jObject(stakeholder),
            },
          );
        }

        // Store resources
        for (const resource of mission.resources) {
          await tx.run(
            `
            MATCH (m:Mission {mission_id: $missionId})
            MERGE (res:Resource {resource_id: $resourceId})
            SET res += $resource
            MERGE (m)-[:HAS_RESOURCE]->(res)
          `,
            {
              missionId: mission.missionId,
              resourceId: resource.resourceId,
              resource: this.sanitizeNeo4jObject(resource),
            },
          );
        }

        // Store milestones
        for (const milestone of mission.timeline.milestones) {
          await tx.run(
            `
            MATCH (m:Mission {mission_id: $missionId})
            MERGE (ms:Milestone {milestone_id: $milestoneId})
            SET ms += $milestone
            MERGE (m)-[:HAS_MILESTONE]->(ms)
          `,
            {
              missionId: mission.missionId,
              milestoneId: milestone.milestoneId,
              milestone: this.sanitizeNeo4jObject(milestone),
            },
          );
        }

        // Store risk factors
        for (const risk of mission.riskProfile.riskFactors) {
          await tx.run(
            `
            MATCH (m:Mission {mission_id: $missionId})
            MERGE (rf:RiskFactor {risk_id: $riskId})
            SET rf += $risk
            MERGE (m)-[:HAS_RISK]->(rf)
          `,
            {
              missionId: mission.missionId,
              riskId: risk.riskId,
              risk: this.sanitizeNeo4jObject(risk),
            },
          );
        }

        // Store success criteria
        for (const criteria of mission.successCriteria) {
          await tx.run(
            `
            MATCH (m:Mission {mission_id: $missionId})
            MERGE (sc:SuccessCriteria {criteria_id: $criteriaId})
            SET sc += $criteria
            MERGE (m)-[:HAS_CRITERIA]->(sc)
          `,
            {
              missionId: mission.missionId,
              criteriaId: criteria.criteriaId,
              criteria: this.sanitizeNeo4jObject(criteria),
            },
          );
        }
      });
    } finally {
      await session.close();
    }
  }

  private createDefaultTimeline(): MissionTimeline {
    const now = new Date();
    const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

    return {
      startDate: now.toISOString(),
      plannedEndDate: endDate.toISOString(),
      milestones: [],
      criticalPath: [],
      bufferTime: 0.1, // 10% buffer
    };
  }

  private createDefaultRiskProfile(): RiskProfile {
    return {
      overallRiskLevel: 'medium',
      riskFactors: [],
      mitigationStrategies: [],
      contingencyPlans: [],
      lastAssessment: new Date().toISOString(),
    };
  }

  private transformNeo4jToMissionContext(data: any): MissionContext {
    return {
      missionId: data.mission_id,
      tenantId: data.tenant_id,
      name: data.name,
      description: data.description,
      objectives: data.objectives?.map(this.transformNeo4jObject) || [],
      currentPhase: data.current_phase,
      priority: data.priority,
      classification: data.classification,
      stakeholders: data.stakeholders?.map(this.transformNeo4jObject) || [],
      resources: data.resources?.map(this.transformNeo4jObject) || [],
      timeline: {
        startDate: data.start_date,
        plannedEndDate: data.planned_end_date,
        actualEndDate: data.actual_end_date,
        milestones: data.milestones?.map(this.transformNeo4jObject) || [],
        criticalPath: data.critical_path || [],
        bufferTime: data.buffer_time || 0.1,
      },
      riskProfile: {
        overallRiskLevel: data.risk_level || 'medium',
        riskFactors: data.riskFactors?.map(this.transformNeo4jObject) || [],
        mitigationStrategies: [],
        contingencyPlans: [],
        lastAssessment: data.risk_assessment_date || new Date().toISOString(),
      },
      successCriteria:
        data.successCriteria?.map(this.transformNeo4jObject) || [],
      metadata: JSON.parse(data.metadata || '{}'),
      created: data.created,
      lastUpdated: data.last_updated,
    };
  }

  private transformNeo4jObject(obj: any): any {
    const result = { ...obj };
    // Handle any specific Neo4j to JS transformations
    return result;
  }

  private sanitizeNeo4jObject(obj: any): any {
    const sanitized = { ...obj };
    // Convert arrays and objects to JSON strings for Neo4j storage
    Object.keys(sanitized).forEach((key) => {
      if (
        Array.isArray(sanitized[key]) ||
        (typeof sanitized[key] === 'object' && sanitized[key] !== null)
      ) {
        sanitized[key] = JSON.stringify(sanitized[key]);
      }
    });
    return sanitized;
  }

  private assessTimelineHealth(mission: MissionContext): any {
    const now = new Date();
    const plannedEnd = new Date(mission.timeline.plannedEndDate);
    const progress =
      mission.timeline.milestones.filter((m) => m.status === 'completed')
        .length / Math.max(mission.timeline.milestones.length, 1);
    const timeElapsed =
      (now.getTime() - new Date(mission.timeline.startDate).getTime()) /
      (plannedEnd.getTime() - new Date(mission.timeline.startDate).getTime());

    let score = 1.0;
    const issues = [];

    if (timeElapsed > progress + 0.2) {
      score -= 0.3;
      issues.push('Behind schedule');
    }

    if (now > plannedEnd) {
      score -= 0.5;
      issues.push('Past deadline');
    }

    return {
      factor: 'timeline',
      score: Math.max(0, score),
      impact: score < 0.5 ? 'high' : score < 0.7 ? 'medium' : 'low',
      details: {
        progress: progress * 100,
        timeElapsed: timeElapsed * 100,
        issues,
      },
    };
  }

  private assessObjectiveHealth(mission: MissionContext): any {
    const objectives = mission.objectives;
    if (objectives.length === 0) {
      return {
        factor: 'objectives',
        score: 0.5,
        impact: 'medium',
        details: { reason: 'no_objectives' },
      };
    }

    const completed = objectives.filter((o) => o.status === 'completed').length;
    const blocked = objectives.filter((o) => o.status === 'blocked').length;
    const active = objectives.filter((o) => o.status === 'active').length;

    let score = completed / objectives.length;
    if (blocked > 0) score -= (blocked / objectives.length) * 0.5;
    if (active === 0 && completed < objectives.length) score -= 0.2;

    return {
      factor: 'objectives',
      score: Math.max(0, Math.min(1, score)),
      impact: score < 0.4 ? 'high' : score < 0.7 ? 'medium' : 'low',
      details: {
        total: objectives.length,
        completed,
        blocked,
        active,
        completionRate: (completed / objectives.length) * 100,
      },
    };
  }

  private assessRiskHealth(mission: MissionContext): any {
    const risks = mission.riskProfile.riskFactors;
    if (risks.length === 0) {
      return {
        factor: 'risk',
        score: 0.8,
        impact: 'low',
        details: { reason: 'no_identified_risks' },
      };
    }

    const highRisks = risks.filter((r) => r.riskScore >= 0.7).length;
    const mediumRisks = risks.filter(
      (r) => r.riskScore >= 0.4 && r.riskScore < 0.7,
    ).length;
    const mitigatedRisks = risks.filter(
      (r) => r.status === 'mitigating' || r.status === 'closed',
    ).length;

    let score = 1.0;
    score -= (highRisks / risks.length) * 0.4;
    score -= (mediumRisks / risks.length) * 0.2;
    score += (mitigatedRisks / risks.length) * 0.1;

    return {
      factor: 'risk',
      score: Math.max(0, Math.min(1, score)),
      impact: score < 0.5 ? 'high' : score < 0.7 ? 'medium' : 'low',
      details: {
        total: risks.length,
        high: highRisks,
        medium: mediumRisks,
        mitigated: mitigatedRisks,
      },
    };
  }

  private assessResourceHealth(mission: MissionContext): any {
    const resources = mission.resources;
    if (resources.length === 0) {
      return {
        factor: 'resources',
        score: 0.3,
        impact: 'high',
        details: { reason: 'no_resources' },
      };
    }

    const available = resources.filter(
      (r) => r.availability === 'available',
    ).length;
    const allocated = resources.filter(
      (r) => r.availability === 'allocated',
    ).length;
    const unavailable = resources.filter(
      (r) => r.availability === 'unavailable',
    ).length;

    let score = (available + allocated * 0.8) / resources.length;
    score -= (unavailable / resources.length) * 0.3;

    return {
      factor: 'resources',
      score: Math.max(0, Math.min(1, score)),
      impact: score < 0.5 ? 'high' : score < 0.7 ? 'medium' : 'low',
      details: {
        total: resources.length,
        available,
        allocated,
        unavailable,
      },
    };
  }

  private determineOverallHealth(
    healthScore: number,
  ): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' {
    if (healthScore >= 0.9) return 'excellent';
    if (healthScore >= 0.7) return 'good';
    if (healthScore >= 0.5) return 'fair';
    if (healthScore >= 0.3) return 'poor';
    return 'critical';
  }

  private generateHealthRecommendations(
    factors: any[],
    mission: MissionContext,
  ): string[] {
    const recommendations = [];

    factors.forEach((factor) => {
      if (factor.impact === 'high') {
        switch (factor.factor) {
          case 'timeline':
            recommendations.push(
              'Consider timeline adjustment or resource reallocation',
            );
            break;
          case 'objectives':
            recommendations.push(
              'Review blocked objectives and reassign resources',
            );
            break;
          case 'risk':
            recommendations.push(
              'Escalate high-risk factors and implement mitigation strategies',
            );
            break;
          case 'resources':
            recommendations.push(
              'Secure additional resources or adjust mission scope',
            );
            break;
        }
      }
    });

    if (recommendations.length === 0) {
      recommendations.push(
        'Mission health is acceptable - continue monitoring',
      );
    }

    return recommendations;
  }
}
