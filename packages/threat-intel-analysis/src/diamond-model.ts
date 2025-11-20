/**
 * Diamond Model of Intrusion Analysis
 * Implementation of the Diamond Model framework for threat intelligence analysis
 */

export interface DiamondVertex {
  adversary?: {
    id?: string;
    name?: string;
    operator?: string;
    customer?: string;
  };
  capability?: {
    description: string;
    tools: string[];
    techniques: string[];
    vulnerabilities?: string[];
  };
  infrastructure?: {
    type: string; // IP, domain, URL, email, etc.
    value: string;
    provider?: string;
    location?: string;
  };
  victim?: {
    personae?: string; // Individual, group, organization, sector
    assets?: string[]; // What assets were targeted
    targeting?: string; // Email, network, application, etc.
  };
}

export interface DiamondEvent {
  id: string;
  timestamp: string;

  // Core features (the four vertices)
  adversary: DiamondVertex['adversary'];
  capability: DiamondVertex['capability'];
  infrastructure: DiamondVertex['infrastructure'];
  victim: DiamondVertex['victim'];

  // Meta-features
  phase?: string; // Kill Chain phase
  result?: string; // Success, failure, unknown
  direction?: 'adversary-to-infrastructure' | 'infrastructure-to-victim' | 'victim-to-infrastructure';
  methodology?: string;
  resources?: string[];

  // Social-political
  socialPolitical?: {
    motivation?: string;
    sponsor?: string;
    geopolitics?: string;
  };

  // Technology
  technology?: {
    platform?: string;
    protocol?: string;
    encryption?: string;
  };

  // Confidence
  confidence: number; // 0-100

  // Relationships
  relatedEvents?: string[];
  threadId?: string; // Activity thread
}

export class DiamondModelAnalysis {
  private events: Map<string, DiamondEvent> = new Map();
  private threads: Map<string, string[]> = new Map(); // threadId -> eventIds

  /**
   * Add a Diamond event
   */
  addEvent(event: DiamondEvent): void {
    this.events.set(event.id, event);

    // Add to thread if specified
    if (event.threadId) {
      const threadEvents = this.threads.get(event.threadId) || [];
      threadEvents.push(event.id);
      this.threads.set(event.threadId, threadEvents);
    }
  }

  /**
   * Get event by ID
   */
  getEvent(id: string): DiamondEvent | undefined {
    return this.events.get(id);
  }

  /**
   * Create activity thread
   */
  createThread(threadId: string, eventIds: string[]): void {
    this.threads.set(threadId, eventIds);

    // Update events with thread ID
    for (const eventId of eventIds) {
      const event = this.events.get(eventId);
      if (event) {
        event.threadId = threadId;
        this.events.set(eventId, event);
      }
    }
  }

  /**
   * Pivot on adversary
   */
  pivotOnAdversary(adversaryId: string): DiamondEvent[] {
    return Array.from(this.events.values()).filter(
      event => event.adversary?.id === adversaryId
    );
  }

  /**
   * Pivot on infrastructure
   */
  pivotOnInfrastructure(infraType: string, infraValue: string): DiamondEvent[] {
    return Array.from(this.events.values()).filter(
      event =>
        event.infrastructure?.type === infraType &&
        event.infrastructure?.value === infraValue
    );
  }

  /**
   * Pivot on capability
   */
  pivotOnCapability(tool: string): DiamondEvent[] {
    return Array.from(this.events.values()).filter(
      event => event.capability?.tools.includes(tool)
    );
  }

  /**
   * Pivot on victim
   */
  pivotOnVictim(victimAsset: string): DiamondEvent[] {
    return Array.from(this.events.values()).filter(
      event => event.victim?.assets?.includes(victimAsset)
    );
  }

  /**
   * Analyze activity thread
   */
  analyzeThread(threadId: string): {
    events: DiamondEvent[];
    adversaries: Set<string>;
    infrastructure: Set<string>;
    capabilities: Set<string>;
    victims: Set<string>;
    timeline: DiamondEvent[];
  } {
    const eventIds = this.threads.get(threadId) || [];
    const events = eventIds
      .map(id => this.events.get(id))
      .filter((e): e is DiamondEvent => e !== undefined);

    const adversaries = new Set<string>();
    const infrastructure = new Set<string>();
    const capabilities = new Set<string>();
    const victims = new Set<string>();

    for (const event of events) {
      if (event.adversary?.id) adversaries.add(event.adversary.id);
      if (event.infrastructure?.value) infrastructure.add(event.infrastructure.value);
      event.capability?.tools.forEach(tool => capabilities.add(tool));
      event.victim?.assets?.forEach(asset => victims.add(asset));
    }

    const timeline = events.sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    return {
      events,
      adversaries,
      infrastructure,
      capabilities,
      victims,
      timeline,
    };
  }

  /**
   * Find related events
   */
  findRelatedEvents(eventId: string, maxDistance: number = 2): DiamondEvent[] {
    const event = this.events.get(eventId);
    if (!event) return [];

    const related = new Set<DiamondEvent>();
    const visited = new Set<string>();
    const queue: Array<{ event: DiamondEvent; distance: number }> = [
      { event, distance: 0 }
    ];

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.distance > maxDistance || visited.has(current.event.id)) {
        continue;
      }

      visited.add(current.event.id);
      related.add(current.event);

      // Find events sharing infrastructure
      if (current.event.infrastructure) {
        const infraEvents = this.pivotOnInfrastructure(
          current.event.infrastructure.type,
          current.event.infrastructure.value
        );

        for (const e of infraEvents) {
          if (!visited.has(e.id)) {
            queue.push({ event: e, distance: current.distance + 1 });
          }
        }
      }

      // Find events sharing adversary
      if (current.event.adversary?.id) {
        const advEvents = this.pivotOnAdversary(current.event.adversary.id);

        for (const e of advEvents) {
          if (!visited.has(e.id)) {
            queue.push({ event: e, distance: current.distance + 1 });
          }
        }
      }
    }

    return Array.from(related).filter(e => e.id !== eventId);
  }

  /**
   * Generate attack path
   */
  generateAttackPath(threadId: string): {
    path: string[];
    description: string;
  } {
    const analysis = this.analyzeThread(threadId);
    const path: string[] = [];

    for (const event of analysis.timeline) {
      const step = [
        event.adversary?.name || 'Unknown Adversary',
        'uses',
        event.capability?.tools.join(', ') || 'unknown tools',
        'via',
        event.infrastructure?.value || 'unknown infrastructure',
        'to target',
        event.victim?.assets?.join(', ') || 'unknown assets',
      ].join(' ');

      path.push(step);
    }

    const description = `Attack path for thread ${threadId} with ${analysis.events.length} events`;

    return { path, description };
  }

  /**
   * Export to graph format
   */
  exportGraph(threadId?: string): {
    nodes: Array<{ id: string; type: string; label: string }>;
    edges: Array<{ from: string; to: string; label: string }>;
  } {
    const events = threadId
      ? (this.threads.get(threadId) || []).map(id => this.events.get(id)).filter((e): e is DiamondEvent => e !== undefined)
      : Array.from(this.events.values());

    const nodes: Array<{ id: string; type: string; label: string }> = [];
    const edges: Array<{ from: string; to: string; label: string }> = [];
    const nodeSet = new Set<string>();

    for (const event of events) {
      // Adversary node
      if (event.adversary?.id && !nodeSet.has(event.adversary.id)) {
        nodes.push({
          id: event.adversary.id,
          type: 'adversary',
          label: event.adversary.name || event.adversary.id,
        });
        nodeSet.add(event.adversary.id);
      }

      // Infrastructure node
      const infraId = `${event.infrastructure?.type}:${event.infrastructure?.value}`;
      if (event.infrastructure && !nodeSet.has(infraId)) {
        nodes.push({
          id: infraId,
          type: 'infrastructure',
          label: event.infrastructure.value,
        });
        nodeSet.add(infraId);
      }

      // Victim node
      const victimId = event.victim?.personae || 'victim';
      if (!nodeSet.has(victimId)) {
        nodes.push({
          id: victimId,
          type: 'victim',
          label: victimId,
        });
        nodeSet.add(victimId);
      }

      // Edges
      if (event.adversary?.id && event.infrastructure) {
        edges.push({
          from: event.adversary.id,
          to: infraId,
          label: 'uses',
        });
      }

      if (event.infrastructure) {
        edges.push({
          from: infraId,
          to: victimId,
          label: 'targets',
        });
      }
    }

    return { nodes, edges };
  }

  /**
   * Get all events
   */
  getAllEvents(): DiamondEvent[] {
    return Array.from(this.events.values());
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.events.clear();
    this.threads.clear();
  }
}
