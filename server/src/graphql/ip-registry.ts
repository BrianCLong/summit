// @ip-family: N/A (tooling)
/**
 * GraphQL API for IP Registry
 *
 * Serves ip-registry.yaml data via GraphQL for IP Console UI and metrics dashboards.
 * TODO: Add mutations for updating family status, assigning owners, etc.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import * as yaml from 'yaml';
import type { IResolvers } from '@graphql-tools/utils';

// ============================================================================
// Types (matching ip-registry.yaml schema)
// ============================================================================

interface IPFamilyHorizons {
  h0_hardening: string[];
  h1_mvp: string[];
  h2_v1: string[];
  h3_moonshot: string[];
}

interface IPFamily {
  family_id: string;
  name: string;
  summary: string;
  status: 'idea' | 'partial' | 'mvp' | 'v1' | 'v2+';
  owner: string;
  modules: string[];
  capabilities: string[];
  horizons: IPFamilyHorizons;
  risks: string[];
  dependencies: string[];
  tags: string[];
}

interface IPRegistry {
  families: IPFamily[];
}

// ============================================================================
// Registry Loader (cached)
// ============================================================================

let cachedRegistry: IPRegistry | null = null;
let lastLoadTime = 0;
const CACHE_TTL = 60000; // 1 minute

function loadRegistry(): IPRegistry {
  const now = Date.now();
  if (cachedRegistry && now - lastLoadTime < CACHE_TTL) {
    return cachedRegistry;
  }

  try {
    const registryPath = join(process.cwd(), 'docs/ip/ip-registry.yaml');
    const content = readFileSync(registryPath, 'utf-8');
    cachedRegistry = yaml.parse(content) as IPRegistry;
    lastLoadTime = now;
    return cachedRegistry;
  } catch (error) {
    console.error('Failed to load IP registry:', error);
    return { families: [] };
  }
}

// ============================================================================
// GraphQL Type Definitions
// ============================================================================

export const ipRegistryTypeDefs = `
  type IPFamilyHorizons {
    h0_hardening: [String!]!
    h1_mvp: [String!]!
    h2_v1: [String!]!
    h3_moonshot: [String!]!
  }

  type IPFamily {
    family_id: ID!
    name: String!
    summary: String!
    status: IPFamilyStatus!
    owner: String!
    modules: [String!]!
    capabilities: [String!]!
    horizons: IPFamilyHorizons!
    risks: [String!]!
    dependencies: [String!]!
    tags: [String!]!
  }

  enum IPFamilyStatus {
    idea
    partial
    mvp
    v1
    v2plus
  }

  type IPMetricsGlobal {
    total_families: Int!
    status_breakdown: IPStatusBreakdown!
    avg_coverage_pct: Int!
    families_below_50pct: Int!
    total_annotations: Int!
  }

  type IPStatusBreakdown {
    idea: Int!
    partial: Int!
    mvp: Int!
    v1: Int!
    v2plus: Int!
  }

  type IPFamilyMetrics {
    family_id: ID!
    name: String!
    status: String!
    modules_listed: Int!
    modules_found: Int!
    annotations_found: Int!
    coverage_pct: Int!
    missing_modules: [String!]!
    annotated_files: [String!]!
  }

  type IPMetrics {
    global: IPMetricsGlobal!
    families: [IPFamilyMetrics!]!
    generated_at: String!
  }

  extend type Query {
    """
    Get all IP families from the registry
    """
    ipFamilies(
      status: IPFamilyStatus
      tag: String
    ): [IPFamily!]!

    """
    Get a single IP family by ID
    """
    ipFamily(family_id: ID!): IPFamily

    """
    Get IP metrics (coverage, annotations, etc.)
    Note: This queries pre-generated metrics from ip-metrics.ts output
    """
    ipMetrics: IPMetrics
  }

  extend type Mutation {
    """
    Update IP family status (requires admin role)
    """
    updateIPFamilyStatus(
      family_id: ID!
      status: IPFamilyStatus!
    ): IPFamily

    """
    Assign owner to IP family (requires admin role)
    """
    assignIPFamilyOwner(
      family_id: ID!
      owner: String!
    ): IPFamily
  }
`;

// ============================================================================
// Resolvers
// ============================================================================

export const ipRegistryResolvers: IResolvers = {
  Query: {
    ipFamilies: (_parent, args) => {
      const registry = loadRegistry();
      let families = registry.families;

      // Filter by status if provided
      if (args.status) {
        const statusMap: Record<string, string> = {
          v2plus: 'v2+',
        };
        const targetStatus = statusMap[args.status] || args.status;
        families = families.filter((f) => f.status === targetStatus);
      }

      // Filter by tag if provided
      if (args.tag) {
        families = families.filter((f) => f.tags.includes(args.tag));
      }

      return families;
    },

    ipFamily: (_parent, args) => {
      const registry = loadRegistry();
      return registry.families.find((f) => f.family_id === args.family_id) || null;
    },

    ipMetrics: async () => {
      // TODO: Execute ip-metrics.ts script and parse output
      // For now, return mock data structure
      return {
        global: {
          total_families: 10,
          status_breakdown: {
            idea: 1,
            partial: 3,
            mvp: 4,
            v1: 2,
            v2plus: 0,
          },
          avg_coverage_pct: 65,
          families_below_50pct: 2,
          total_annotations: 47,
        },
        families: [],
        generated_at: new Date().toISOString(),
      };
    },
  },

  Mutation: {
    updateIPFamilyStatus: async (_parent, args, context) => {
      // TODO: Implement mutation logic
      // 1. Check user has admin role
      // 2. Update ip-registry.yaml file
      // 3. Invalidate cache
      // 4. Record provenance (who changed what, when)
      throw new Error('Not yet implemented');
    },

    assignIPFamilyOwner: async (_parent, args, context) => {
      // TODO: Implement mutation logic
      throw new Error('Not yet implemented');
    },
  },

  IPFamily: {
    // Resolve status enum (v2+ → v2plus for GraphQL)
    status: (parent) => {
      if (parent.status === 'v2+') return 'v2plus';
      return parent.status;
    },
  },
};

// ============================================================================
// Export for integration into main schema
// ============================================================================

export function registerIPRegistryAPI() {
  // This function can be called from main GraphQL setup to register these types/resolvers
  // Example: Add ipRegistryTypeDefs and ipRegistryResolvers to your schema builder
  return {
    typeDefs: ipRegistryTypeDefs,
    resolvers: ipRegistryResolvers,
  };
}
