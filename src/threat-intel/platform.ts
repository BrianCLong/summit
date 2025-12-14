import { randomUUID } from 'crypto';

type KillChainPhase = 'reconnaissance' | 'weaponization' | 'delivery' | 'exploitation' | 'installation' | 'command-and-control' | 'actions-on-objectives';
export type TlpLevel = 'CLEAR' | 'GREEN' | 'AMBER' | 'RED';

const tlpRank: Record<TlpLevel, number> = {
  CLEAR: 0,
  GREEN: 1,
  AMBER: 2,
  RED: 3,
};

export interface StixObject {
  id: string;
  type: 'indicator' | 'malware' | 'threat-actor' | 'campaign' | 'tool' | 'attack-pattern';
  name: string;
  description?: string;
  labels?: string[];
  pattern?: string;
  created: Date;
  modified: Date;
  externalReferences?: { sourceName: string; url?: string; externalId?: string }[];
  tlp?: TlpLevel;
}

export interface TaxiiBundle {
  type: 'bundle';
  objects: Array<
    StixObject & {
      object_marking_refs?: string[];
    }
  >;
}

export interface MitreTechnique {
  id: string;
  tactic: string;
  technique: string;
  detection: string;
  mitigation: string;
}

export interface ThreatActorProfile {
  id: string;
  name: string;
  motivations: string[];
  sophistication: 'low' | 'medium' | 'advanced' | 'apt';
  region: string;
  sectors: string[];
  knownTechniques: string[];
  preferredKillChainPhases: KillChainPhase[];
  confidence: number;
  tlp: TlpLevel;
  notes?: string;
}

export interface IndicatorOfCompromise {
  id: string;
  type: 'ip' | 'domain' | 'hash' | 'url' | 'email';
  value: string;
  source: string;
  confidence: number;
  tlp: TlpLevel;
  sightings: number;
  tags: string[];
  relatedTechniques?: string[];
  firstSeen?: Date;
  lastSeen?: Date;
  enrichment?: {
    reputationScore: number;
    geography?: string;
    asn?: string;
    relatedActors?: string[];
    darkWebHits?: number;
    cveOverlap?: string[];
  };
}

export interface CveRecord {
  id: string;
  cvss: number;
  affectedProducts: string[];
  exploitedInTheWild: boolean;
  published: Date;
  tlp: TlpLevel;
}

export interface DarkWebMention {
  id: string;
  source: string;
  content: string;
  matchedIndicators: string[];
  riskScore: number;
  tlp: TlpLevel;
  observed: Date;
}

export interface ThreatHuntingRule {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  match: (event: Record<string, any>) => boolean;
  requiredTlp?: TlpLevel;
}

export interface CorrelatedThreat {
  id: string;
  iocs: IndicatorOfCompromise[];
  actors: ThreatActorProfile[];
  cves: CveRecord[];
  darkWebMentions: DarkWebMention[];
  score: number;
  narrative: string;
}

export interface ThreatScoreInput {
  confidence: number;
  severity: number;
  actorSophistication?: ThreatActorProfile['sophistication'];
  killChainPhase?: KillChainPhase;
  hasActiveExploitation?: boolean;
  tlp: TlpLevel;
  iocCount?: number;
  enrichmentScore?: number;
}

export interface PartnerProfile {
  id: string;
  name: string;
  maxTlp: TlpLevel;
  acceptedFeeds: string[];
}

export interface FeedIngestionResult {
  feed: string;
  accepted: number;
  rejected: number;
  tlpApplied: TlpLevel;
}

const defaultMitreTechniques: MitreTechnique[] = [
  {
    id: 'T1190',
    tactic: 'Initial Access',
    technique: 'Exploit Public-Facing Application',
    detection: 'Monitor web logs for injection attempts and WAF alerts.',
    mitigation: 'Patch external services and deploy virtual patching.',
  },
  {
    id: 'T1059',
    tactic: 'Execution',
    technique: 'Command and Scripting Interpreter',
    detection: 'Collect command-line audit logs and suspicious shells.',
    mitigation: 'Restrict scripting engines and enforce signing.',
  },
  {
    id: 'T1041',
    tactic: 'Exfiltration',
    technique: 'Exfiltration Over C2 Channel',
    detection: 'Inspect egress traffic for beaconing domains and DNS tunneling.',
    mitigation: 'Egress filtering and DLP controls for sensitive data.',
  },
];

export class ThreatIntelPlatform {
  private stixFeeds = new Map<string, StixObject[]>();
  private mitreLookup: Map<string, MitreTechnique>;
  private actors = new Map<string, ThreatActorProfile>();
  private iocs = new Map<string, IndicatorOfCompromise>();
  private cves = new Map<string, CveRecord>();
  private darkWebIntel: DarkWebMention[] = [];
  private huntingRules: ThreatHuntingRule[] = [];

  constructor(seedMitreTechniques: MitreTechnique[] = defaultMitreTechniques) {
    this.mitreLookup = new Map(seedMitreTechniques.map((tech) => [tech.id, tech]));
  }

  ingestStixFeed(feedName: string, objects: StixObject[], defaultTlp: TlpLevel = 'AMBER'): FeedIngestionResult {
    const existing = this.stixFeeds.get(feedName) ?? [];
    const seen = new Set(existing.map((obj) => obj.id));
    let accepted = 0;
    let rejected = 0;

    const normalized = objects.map((obj) => ({ ...obj, tlp: obj.tlp ?? defaultTlp }));

    for (const obj of normalized) {
      if (seen.has(obj.id)) {
        rejected += 1;
        continue;
      }
      accepted += 1;
      existing.push(obj);
      seen.add(obj.id);
    }

    this.stixFeeds.set(feedName, existing);
    return { feed: feedName, accepted, rejected, tlpApplied: defaultTlp };
  }

  registerCustomFeed(feedName: string, generator: () => StixObject[], tlp: TlpLevel = 'GREEN'): FeedIngestionResult {
    const generated = generator().map((item) => ({ ...item, tlp }));
    return this.ingestStixFeed(feedName, generated, tlp);
  }

  ingestTaxiiBundle(feedName: string, bundle: TaxiiBundle, defaultTlp: TlpLevel = 'AMBER'): FeedIngestionResult {
    const normalized = bundle.objects
      .filter((obj) =>
        ['indicator', 'malware', 'threat-actor', 'campaign', 'tool', 'attack-pattern'].includes(obj.type),
      )
      .map((obj) => ({
        ...obj,
        tlp: this.resolveTlpFromMarkings(obj.object_marking_refs, obj.tlp ?? defaultTlp),
      }));

    return this.ingestStixFeed(feedName, normalized, defaultTlp);
  }

  mapAttackTechniques(techniqueIds: string[]): MitreTechnique[] {
    return techniqueIds
      .map((id) => this.mitreLookup.get(id))
      .filter((technique): technique is MitreTechnique => Boolean(technique));
  }

  addThreatActorProfile(profile: ThreatActorProfile): ThreatActorProfile {
    const normalized = { ...profile, id: profile.id || randomUUID() };
    this.actors.set(normalized.id, normalized);
    return normalized;
  }

  trackCve(record: CveRecord): CveRecord {
    this.cves.set(record.id, record);
    return record;
  }

  addDarkWebIntel(mention: Omit<DarkWebMention, 'id'> & { id?: string }): DarkWebMention {
    const entry: DarkWebMention = { ...mention, id: mention.id ?? randomUUID() };
    this.darkWebIntel.push(entry);
    return entry;
  }

  addHuntingRule(rule: ThreatHuntingRule): ThreatHuntingRule {
    this.huntingRules.push(rule);
    return rule;
  }

  addIoc(ioc: IndicatorOfCompromise): IndicatorOfCompromise {
    const enriched = this.enrichIoc(ioc);
    this.iocs.set(enriched.id, enriched);
    return enriched;
  }

  private enrichIoc(ioc: IndicatorOfCompromise): IndicatorOfCompromise {
    const reputationBase = this.deriveReputation(ioc.type, ioc.value);
    const darkWebHits = this.darkWebIntel.filter((item) => item.matchedIndicators.includes(ioc.value)).length;
    const cveOverlap = Array.from(this.cves.values())
      .filter((cve) => cve.affectedProducts.some((product) => ioc.tags.includes(product)))
      .map((cve) => cve.id);

    const enrichmentScore = Math.min(100, reputationBase + ioc.confidence * 0.6 + darkWebHits * 10 + cveOverlap.length * 5);

    const enrichment = {
      reputationScore: Math.round(enrichmentScore),
      geography: ioc.tags.find((tag) => tag.startsWith('geo:'))?.replace('geo:', ''),
      asn: ioc.tags.find((tag) => tag.startsWith('asn:'))?.replace('asn:', ''),
      relatedActors: this.matchActors(ioc.relatedTechniques ?? []),
      darkWebHits,
      cveOverlap,
    };

    return { ...ioc, enrichment };
  }

  private deriveReputation(type: IndicatorOfCompromise['type'], value: string): number {
    if (type === 'ip' && (value.startsWith('10.') || value.startsWith('192.168.'))) {
      return 5;
    }
    if (type === 'hash') {
      return 60;
    }
    if (type === 'domain' && value.endsWith('.onion')) {
      return 80;
    }
    return 30;
  }

  private matchActors(techniques: string[]): string[] {
    return Array.from(this.actors.values())
      .filter((actor) => actor.knownTechniques.some((tech) => techniques.includes(tech)))
      .map((actor) => actor.id);
  }

  private resolveTlpFromMarkings(markings: string[] | undefined, fallback: TlpLevel): TlpLevel {
    if (!markings?.length) return fallback;

    const map: Record<string, TlpLevel> = {
      'tlp:red': 'RED',
      'tlp:amber': 'AMBER',
      'tlp:green': 'GREEN',
      'tlp:clear': 'CLEAR',
      'tlp:white': 'CLEAR',
    };

    for (const mark of markings) {
      const match = map[mark.toLowerCase()];
      if (match) {
        return match;
      }
    }

    return fallback;
  }

  hunt(events: Record<string, any>[], rules: ThreatHuntingRule[] = this.huntingRules): { rule: string; matches: any[] }[] {
    return rules.map((rule) => ({
      rule: rule.name,
      matches: events.filter((event) => rule.match(event) && this.isTlpCompatible(event.tlp ?? 'CLEAR', rule.requiredTlp ?? 'CLEAR')),
    }));
  }

  correlate(): CorrelatedThreat[] {
    const correlations: CorrelatedThreat[] = [];
    const iocs = Array.from(this.iocs.values());

    for (const actor of this.actors.values()) {
      const relatedIocs = iocs.filter((ioc) =>
        (ioc.relatedTechniques ?? []).some((tech) => actor.knownTechniques.includes(tech)) ||
        (ioc.enrichment?.relatedActors ?? []).includes(actor.id),
      );
      if (!relatedIocs.length) continue;

      const cves = Array.from(this.cves.values()).filter((cve) => actor.sectors.some((sector) => cve.affectedProducts.includes(sector)));
      const darkWebMentions = this.darkWebIntel.filter((mention) =>
        relatedIocs.some((ioc) => mention.matchedIndicators.includes(ioc.value)) || actor.motivations.some((mot) => mention.content.includes(mot)),
      );

      const score = this.computeThreatScore({
        confidence: actor.confidence,
        severity: relatedIocs.length * 10 + cves.length * 5,
        actorSophistication: actor.sophistication,
        killChainPhase: actor.preferredKillChainPhases[0],
        hasActiveExploitation: cves.some((cve) => cve.exploitedInTheWild),
        tlp: actor.tlp,
        iocCount: relatedIocs.length,
        enrichmentScore: relatedIocs.reduce((acc, item) => acc + (item.enrichment?.reputationScore ?? 0), 0) / Math.max(1, relatedIocs.length),
      });

      correlations.push({
        id: randomUUID(),
        iocs: relatedIocs,
        actors: [actor],
        cves,
        darkWebMentions,
        score,
        narrative: `${actor.name} linked to ${relatedIocs.length} IOCs with ${cves.length} CVEs and ${darkWebMentions.length} dark web signals`,
      });
    }

    return correlations.sort((a, b) => b.score - a.score);
  }

  computeThreatScore(input: ThreatScoreInput): number {
    const tlpWeight = 1 - tlpRank[input.tlp] * 0.1;
    const sophisticationWeight = this.sophisticationWeight(input.actorSophistication);
    const killChainWeight = input.killChainPhase ? this.killChainWeight(input.killChainPhase) : 1;
    const exploitationWeight = input.hasActiveExploitation ? 1.2 : 1;
    const enrichmentWeight = (input.enrichmentScore ?? 50) / 100;

    const raw =
      input.severity * 0.4 +
      input.confidence * 0.25 +
      (input.iocCount ?? 0) * 2 +
      sophisticationWeight * 10 +
      killChainWeight * 8 +
      exploitationWeight * 5 +
      enrichmentWeight * 15;

    const scored = Math.max(0, Math.min(100, raw * tlpWeight));
    return Math.round(scored * 10) / 10;
  }

  shareIntelligence(partner: PartnerProfile): {
    stix: StixObject[];
    actors: ThreatActorProfile[];
    iocs: IndicatorOfCompromise[];
    cves: CveRecord[];
    darkWeb: DarkWebMention[];
  } {
    const allowed = (tlp?: TlpLevel) => this.isTlpCompatible(tlp ?? 'CLEAR', partner.maxTlp);
    const feedKeys = partner.acceptedFeeds.length ? partner.acceptedFeeds : Array.from(this.stixFeeds.keys());
    const stix = feedKeys.flatMap((key) => this.stixFeeds.get(key) ?? []).filter((item) => allowed(item.tlp));

    return {
      stix,
      actors: Array.from(this.actors.values()).filter((actor) => allowed(actor.tlp)),
      iocs: Array.from(this.iocs.values()).filter((ioc) => allowed(ioc.tlp)),
      cves: Array.from(this.cves.values()).filter((cve) => allowed(cve.tlp)),
      darkWeb: this.darkWebIntel.filter((item) => allowed(item.tlp)),
    };
  }

  private sophisticationWeight(level?: ThreatActorProfile['sophistication']): number {
    switch (level) {
      case 'apt':
        return 2;
      case 'advanced':
        return 1.5;
      case 'medium':
        return 1.1;
      case 'low':
        return 0.8;
      default:
        return 1;
    }
  }

  private killChainWeight(phase: KillChainPhase): number {
    if (['installation', 'command-and-control', 'actions-on-objectives'].includes(phase)) {
      return 1.3;
    }
    if (phase === 'exploitation') {
      return 1.1;
    }
    return 0.9;
  }

  private isTlpCompatible(itemTlp: TlpLevel, maxTlp: TlpLevel): boolean {
    return tlpRank[itemTlp] <= tlpRank[maxTlp];
  }
}

export const buildDefaultPlatform = () => new ThreatIntelPlatform();
