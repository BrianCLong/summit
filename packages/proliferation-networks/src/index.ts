/**
 * Proliferation Networks Package
 *
 * Tracks illicit procurement networks, smuggling routes,
 * and technology transfer for WMD proliferation.
 */

export * from './types.js';
export * from './network-tracker.js';
export * from './procurement-monitor.js';
export * from './financial-tracker.js';

export interface ProliferationNetwork {
  id: string;
  name: string;
  type: 'state_sponsored' | 'criminal' | 'terrorist' | 'corporate';
  countries_involved: string[];
  key_actors: NetworkActor[];
  materials_sought: string[];
  procurement_methods: string[];
  routes: TransportRoute[];
  financial_network: FinancialNode[];
  status: 'active' | 'disrupted' | 'dismantled' | 'suspected';
  threat_level: 'critical' | 'high' | 'medium' | 'low';
  first_identified: string;
  last_activity?: string;
}

export interface NetworkActor {
  id: string;
  name: string;
  role: string;
  nationality?: string;
  affiliated_entities: string[];
  known_contacts: string[];
  sanctions: boolean;
}

export interface ProcurementActivity {
  id: string;
  network_id: string;
  item_sought: string;
  item_category: 'nuclear' | 'chemical' | 'biological' | 'missile' | 'dual_use';
  quantity?: string;
  supplier?: string;
  front_company?: string;
  timestamp: string;
  interdicted: boolean;
  export_control_violation: boolean;
}

export interface TransportRoute {
  origin: string;
  destination: string;
  transit_countries: string[];
  transport_modes: string[];
  known_shipments: number;
  last_used?: string;
}

export interface FinancialNode {
  entity_name: string;
  entity_type: 'bank' | 'company' | 'individual' | 'shell_company';
  country: string;
  role: string;
  transactions_value?: number;
  sanctioned: boolean;
}

export class NetworkTracker {
  private networks: Map<string, ProliferationNetwork> = new Map();

  registerNetwork(network: ProliferationNetwork): void {
    this.networks.set(network.id, network);
  }

  getActiveNetworks(): ProliferationNetwork[] {
    return Array.from(this.networks.values()).filter(n => n.status === 'active');
  }

  trackMaterial(material: string): ProliferationNetwork[] {
    return Array.from(this.networks.values())
      .filter(n => n.materials_sought.includes(material));
  }

  identifyKeyActors(): NetworkActor[] {
    const actors: NetworkActor[] = [];
    this.networks.forEach(n => actors.push(...n.key_actors));
    return actors.filter(a => a.sanctions === false); // Unsanctioned actors
  }
}

export class ProcurementMonitor {
  private activities: ProcurementActivity[] = [];

  recordActivity(activity: ProcurementActivity): void {
    this.activities.push(activity);
  }

  getActivitiesByCategory(category: string): ProcurementActivity[] {
    return this.activities.filter(a => a.item_category === category);
  }

  identifyDualUsePatterns(): { item: string; count: number }[] {
    const items = this.activities
      .filter(a => a.item_category === 'dual_use')
      .reduce((acc, a) => {
        acc[a.item_sought] = (acc[a.item_sought] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    return Object.entries(items).map(([item, count]) => ({ item, count }));
  }
}

export class FinancialTracker {
  private nodes: FinancialNode[] = [];

  addNode(node: FinancialNode): void {
    this.nodes.push(node);
  }

  identifyShellCompanies(): FinancialNode[] {
    return this.nodes.filter(n => n.entity_type === 'shell_company');
  }

  trackTransactionFlow(entity: string): { total_value: number; connections: string[] } {
    const related = this.nodes.filter(n => n.entity_name === entity);
    const total = related.reduce((sum, n) => sum + (n.transactions_value || 0), 0);
    return { total_value: total, connections: related.map(n => n.country) };
  }
}
