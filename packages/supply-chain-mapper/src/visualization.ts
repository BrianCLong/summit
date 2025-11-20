import {
  SupplyChainNode,
  SupplyChainRelationship,
} from '@intelgraph/supply-chain-types';

/**
 * Graph visualization node
 */
export interface VisNode {
  id: string;
  label: string;
  type: string;
  tier: number;
  criticality: 'low' | 'medium' | 'high' | 'critical';
  status: string;
  location?: {
    country: string;
    latitude?: number;
    longitude?: number;
  };
  size: number;
  color: string;
  metadata: Record<string, any>;
}

/**
 * Graph visualization edge
 */
export interface VisEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type: string;
  strength: number;
  width: number;
  color: string;
  metadata: Record<string, any>;
}

/**
 * Complete visualization graph
 */
export interface VisGraph {
  nodes: VisNode[];
  edges: VisEdge[];
  layout: 'force' | 'hierarchical' | 'geographic' | 'circular';
  metadata: {
    totalNodes: number;
    totalEdges: number;
    tiers: number[];
    criticalNodes: number;
  };
}

/**
 * Geographic distribution data
 */
export interface GeographicDistribution {
  countries: Array<{
    country: string;
    nodeCount: number;
    criticalNodes: number;
    latitude: number;
    longitude: number;
  }>;
  regions: Array<{
    region: string;
    nodeCount: number;
    countries: string[];
  }>;
  concentrationRisk: number; // 0-1
}

/**
 * Visualization service for supply chain networks
 */
export class VisualizationService {
  private readonly CRITICALITY_COLORS = {
    low: '#4CAF50',
    medium: '#FFC107',
    high: '#FF9800',
    critical: '#F44336',
  };

  private readonly STATUS_COLORS = {
    active: '#4CAF50',
    inactive: '#9E9E9E',
    'under-review': '#FFC107',
    suspended: '#F44336',
  };

  private readonly TIER_SIZES = {
    1: 30,
    2: 25,
    3: 20,
    default: 15,
  };

  /**
   * Convert supply chain data to visualization graph
   */
  toVisualizationGraph(
    nodes: SupplyChainNode[],
    relationships: SupplyChainRelationship[],
    layout: 'force' | 'hierarchical' | 'geographic' | 'circular' = 'force'
  ): VisGraph {
    const visNodes = nodes.map(node => this.toVisNode(node));
    const visEdges = relationships
      .filter(rel => rel.isActive)
      .map(rel => this.toVisEdge(rel));

    const tiers = [...new Set(nodes.map(n => n.tier))].sort((a, b) => a - b);
    const criticalNodes = nodes.filter(n => n.criticality === 'critical').length;

    return {
      nodes: visNodes,
      edges: visEdges,
      layout,
      metadata: {
        totalNodes: nodes.length,
        totalEdges: visEdges.length,
        tiers,
        criticalNodes,
      },
    };
  }

  /**
   * Generate geographic distribution visualization data
   */
  getGeographicDistribution(nodes: SupplyChainNode[]): GeographicDistribution {
    const countryMap = new Map<string, {
      count: number;
      critical: number;
      lat: number;
      lon: number;
    }>();

    for (const node of nodes) {
      if (!node.location?.country) continue;

      const country = node.location.country;
      if (!countryMap.has(country)) {
        countryMap.set(country, {
          count: 0,
          critical: 0,
          lat: node.location.latitude || 0,
          lon: node.location.longitude || 0,
        });
      }

      const data = countryMap.get(country)!;
      data.count++;
      if (node.criticality === 'critical') {
        data.critical++;
      }
    }

    const countries = Array.from(countryMap.entries()).map(([country, data]) => ({
      country,
      nodeCount: data.count,
      criticalNodes: data.critical,
      latitude: data.lat,
      longitude: data.lon,
    }));

    // Calculate concentration risk (Herfindahl-Hirschman Index)
    const totalNodes = nodes.filter(n => n.location?.country).length;
    const hhi = countries.reduce((sum, c) => {
      const share = c.nodeCount / totalNodes;
      return sum + Math.pow(share, 2);
    }, 0);

    // Group by regions (simplified - in production use proper region mapping)
    const regionMap = new Map<string, Set<string>>();
    for (const country of countries) {
      // Simplified region mapping - in production use proper geographic data
      const region = this.getRegion(country.country);
      if (!regionMap.has(region)) {
        regionMap.set(region, new Set());
      }
      regionMap.get(region)!.add(country.country);
    }

    const regions = Array.from(regionMap.entries()).map(([region, countriesSet]) => ({
      region,
      nodeCount: countries
        .filter(c => countriesSet.has(c.country))
        .reduce((sum, c) => sum + c.nodeCount, 0),
      countries: Array.from(countriesSet),
    }));

    return {
      countries,
      regions,
      concentrationRisk: hhi,
    };
  }

  /**
   * Generate hierarchical tier visualization
   */
  getTierVisualization(
    nodes: SupplyChainNode[],
    relationships: SupplyChainRelationship[]
  ): {
    tiers: Array<{
      tier: number;
      nodes: string[];
      nodeCount: number;
      criticalCount: number;
      downstreamConnections: number;
    }>;
  } {
    const tierMap = new Map<number, SupplyChainNode[]>();

    for (const node of nodes) {
      if (!tierMap.has(node.tier)) {
        tierMap.set(node.tier, []);
      }
      tierMap.get(node.tier)!.push(node);
    }

    const tiers = Array.from(tierMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([tier, tierNodes]) => {
        const nodeIds = tierNodes.map(n => n.id);
        const criticalCount = tierNodes.filter(n => n.criticality === 'critical').length;
        const downstreamConnections = relationships.filter(
          r => r.isActive && nodeIds.includes(r.sourceNodeId)
        ).length;

        return {
          tier,
          nodes: nodeIds,
          nodeCount: tierNodes.length,
          criticalCount,
          downstreamConnections,
        };
      });

    return { tiers };
  }

  /**
   * Generate real-time dashboard data
   */
  getDashboardData(
    nodes: SupplyChainNode[],
    relationships: SupplyChainRelationship[]
  ): {
    overview: {
      totalNodes: number;
      activeNodes: number;
      inactiveNodes: number;
      underReview: number;
      suspended: number;
    };
    criticality: {
      low: number;
      medium: number;
      high: number;
      critical: number;
    };
    network: {
      totalRelationships: number;
      activeRelationships: number;
      averageStrength: number;
      averageTier: number;
    };
    geographic: {
      countries: number;
      regions: number;
      concentrationRisk: number;
    };
  } {
    const statusCounts = {
      active: 0,
      inactive: 0,
      'under-review': 0,
      suspended: 0,
    };

    const criticalityCounts = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    for (const node of nodes) {
      statusCounts[node.status]++;
      criticalityCounts[node.criticality]++;
    }

    const activeRels = relationships.filter(r => r.isActive);
    const totalStrength = activeRels.reduce((sum, r) => sum + r.strength, 0);
    const avgStrength = activeRels.length > 0 ? totalStrength / activeRels.length : 0;

    const totalTier = nodes.reduce((sum, n) => sum + n.tier, 0);
    const avgTier = nodes.length > 0 ? totalTier / nodes.length : 0;

    const countries = new Set(nodes.filter(n => n.location?.country).map(n => n.location!.country));
    const regions = new Set(
      Array.from(countries).map(c => this.getRegion(c))
    );

    const geoDist = this.getGeographicDistribution(nodes);

    return {
      overview: {
        totalNodes: nodes.length,
        activeNodes: statusCounts.active,
        inactiveNodes: statusCounts.inactive,
        underReview: statusCounts['under-review'],
        suspended: statusCounts.suspended,
      },
      criticality: criticalityCounts,
      network: {
        totalRelationships: relationships.length,
        activeRelationships: activeRels.length,
        averageStrength: avgStrength,
        averageTier: avgTier,
      },
      geographic: {
        countries: countries.size,
        regions: regions.size,
        concentrationRisk: geoDist.concentrationRisk,
      },
    };
  }

  // Private helper methods

  private toVisNode(node: SupplyChainNode): VisNode {
    return {
      id: node.id,
      label: node.name,
      type: node.type,
      tier: node.tier,
      criticality: node.criticality,
      status: node.status,
      location: node.location ? {
        country: node.location.country,
        latitude: node.location.latitude,
        longitude: node.location.longitude,
      } : undefined,
      size: this.TIER_SIZES[node.tier as keyof typeof this.TIER_SIZES] || this.TIER_SIZES.default,
      color: this.CRITICALITY_COLORS[node.criticality],
      metadata: node.metadata || {},
    };
  }

  private toVisEdge(rel: SupplyChainRelationship): VisEdge {
    return {
      id: rel.id,
      source: rel.sourceNodeId,
      target: rel.targetNodeId,
      label: rel.relationshipType,
      type: rel.relationshipType,
      strength: rel.strength,
      width: Math.max(1, rel.strength * 5),
      color: this.getEdgeColor(rel.strength),
      metadata: {
        materialFlow: rel.materialFlow,
        volume: rel.volume,
        leadTimeDays: rel.leadTimeDays,
        cost: rel.cost,
      },
    };
  }

  private getEdgeColor(strength: number): string {
    if (strength >= 0.8) return '#2196F3';
    if (strength >= 0.6) return '#03A9F4';
    if (strength >= 0.4) return '#81D4FA';
    return '#B3E5FC';
  }

  private getRegion(country: string): string {
    // Simplified region mapping - in production use proper geographic data
    const regionMap: Record<string, string> = {
      'United States': 'North America',
      'Canada': 'North America',
      'Mexico': 'North America',
      'China': 'Asia Pacific',
      'Japan': 'Asia Pacific',
      'South Korea': 'Asia Pacific',
      'India': 'Asia Pacific',
      'Germany': 'Europe',
      'France': 'Europe',
      'United Kingdom': 'Europe',
      'Italy': 'Europe',
      'Spain': 'Europe',
      'Brazil': 'South America',
      'Argentina': 'South America',
    };

    return regionMap[country] || 'Other';
  }
}
