import { gql } from 'graphql-tag';

export const ctiTypeDefs = gql`
  # Core CTI Types
  type ThreatActor {
    id: ID!
    name: String!
    description: String
    aliases: [String]
    threat_actor_types: [String]
    sophistication: String
    goals: [String]
    resource_level: String
    primary_motivation: String
    secondary_motivations: [String]
    first_seen: DateTime
    last_seen: DateTime

    # Relationships
    campaigns: [Campaign]
    malware: [Malware]
    attack_patterns: [AttackPattern]
    attributed_iocs: [IOC]
    diamond_model: DiamondModel
  }

  type Malware {
    id: ID!
    name: String!
    description: String
    malware_types: [String]
    is_family: Boolean
    platform: [String]
    architecture: [String]

    # Relationships
    variants: [Malware]
    used_by: [ThreatActor]
    kill_chain_phases: [KillChainPhase]
    capabilities: [String]
  }

  type Campaign {
    id: ID!
    name: String!
    description: String
    objective: String
    first_seen: DateTime
    last_seen: DateTime

    # Relationships
    attributed_to: ThreatActor
    uses_malware: [Malware]
    uses_tools: [Tool]
    targets: [String] # Industries, geos
  }

  type AttackPattern {
    id: ID!
    name: String!
    description: String
    kill_chain_phases: [KillChainPhase]
    external_id: String # e.g. T1001

    # Relationships
    used_by: [ThreatActor]
  }

  type Tool {
    id: ID!
    name: String!
    description: String
    tool_types: [String]
    tool_version: String
  }

  type IOC {
    id: ID!
    type: String! # ip, domain, file_hash, etc.
    value: String!
    description: String
    threatType: String
    severity: String
    confidence: Float
    firstSeen: DateTime
    lastSeen: DateTime
    tags: [String]
    source: String
    tlp: String
    isActive: Boolean

    # Analysis
    detections: [Detection]
    attribution: Attribution
    enrichment: JSON
  }

  type Attribution {
    actor: ThreatActor
    campaign: Campaign
    confidence: Float
    reasoning: [String]
  }

  type Detection {
    id: ID!
    detectionTime: DateTime!
    source: String
    severity: String
    status: String
    details: JSON
    ioc: IOC
  }

  # Analytic Models
  type DiamondModel {
    adversary: ThreatActor
    capability: [String] # Malware, Tools, TTPs
    infrastructure: [String] # IPs, Domains, Servers
    victim: [String] # Target Industries, Geos
    social_political: String
    technology: String
  }

  type KillChainPhase {
    kill_chain_name: String
    phase_name: String
  }

  type ThreatHunt {
    id: ID!
    name: String!
    description: String
    status: String
    priority: String
    hypothesis: String
    huntType: String
    queries: [HuntQuery]
    findings: [HuntFinding]
    timeline: [HuntTimelineEntry]
    created_at: DateTime
  }

  type HuntQuery {
    id: ID!
    name: String
    query: String
    queryType: String
    results: JSON
  }

  type HuntFinding {
    id: ID!
    title: String
    severity: String
    confidence: Float
    evidence: [JSON]
  }

  type HuntTimelineEntry {
    timestamp: DateTime
    event: String
    description: String
  }

  type ImportJob {
      id: ID!
      status: String!
      type: String
      stats: JSON
      errors: [JSON]
  }

  # Queries & Mutations
  extend type Query {
    threatActor(id: ID!): ThreatActor
    threatActors(limit: Int): [ThreatActor]

    malware(id: ID!): Malware
    malwareList(limit: Int): [Malware]

    ioc(id: ID!): IOC
    iocs(type: String, severity: String, limit: Int): [IOC]

    threatHunt(id: ID!): ThreatHunt
    threatHunts(status: String): [ThreatHunt]

    # Advanced Analysis
    analyzeDiamondModel(actorId: ID!): DiamondModel
    analyzeAttackChain(incidentId: ID!): [AttackPattern]
    getThreatScore(entityId: ID!): Float
  }

  extend type Mutation {
    createThreatHunt(name: String!, description: String!, hypothesis: String!): ThreatHunt
    addFindingToHunt(huntId: ID!, title: String!, severity: String!, evidence: JSON!): HuntFinding
    updateIOC(id: ID!, severity: String, status: String): IOC

    # STIX/TAXII Support
    importTaxiiCollection(taxiiUrl: String!, collectionId: String!): ImportJob
    importStixBundle(bundleJson: JSON!): ImportJob
  }
`;
