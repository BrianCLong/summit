/**
 * Entity linking to external knowledge bases
 */

import { Entity, EntityType } from '../types.js';

export interface LinkedEntity {
  entity: Entity;
  links: EntityLink[];
}

export interface EntityLink {
  source: string;
  uri: string;
  label: string;
  description?: string;
  confidence: number;
  types?: string[];
  properties?: Record<string, any>;
}

export interface KnowledgeBase {
  name: string;
  baseUri: string;
  searchEndpoint?: string;
}

export class EntityLinker {
  private knowledgeBases: KnowledgeBase[];
  private cache: Map<string, EntityLink[]>;

  constructor() {
    this.knowledgeBases = this.getDefaultKnowledgeBases();
    this.cache = new Map();
  }

  /**
   * Link entities to external knowledge bases
   */
  async link(entities: Entity[]): Promise<LinkedEntity[]> {
    const results: LinkedEntity[] = [];

    for (const entity of entities) {
      const cacheKey = `${entity.type}:${entity.text}`;

      // Check cache first
      if (this.cache.has(cacheKey)) {
        results.push({
          entity,
          links: this.cache.get(cacheKey)!
        });
        continue;
      }

      // Generate candidate links
      const links = await this.generateLinks(entity);

      // Cache results
      this.cache.set(cacheKey, links);

      results.push({
        entity,
        links
      });
    }

    return results;
  }

  /**
   * Generate links for an entity
   */
  private async generateLinks(entity: Entity): Promise<EntityLink[]> {
    const links: EntityLink[] = [];

    // Generate Wikidata link candidate
    const wikidataLink = this.generateWikidataLink(entity);
    if (wikidataLink) {
      links.push(wikidataLink);
    }

    // Generate DBpedia link candidate
    const dbpediaLink = this.generateDBpediaLink(entity);
    if (dbpediaLink) {
      links.push(dbpediaLink);
    }

    // Generate Schema.org type
    const schemaOrgLink = this.generateSchemaOrgLink(entity);
    if (schemaOrgLink) {
      links.push(schemaOrgLink);
    }

    return links;
  }

  /**
   * Generate Wikidata link
   */
  private generateWikidataLink(entity: Entity): EntityLink | null {
    const normalizedName = entity.text.replace(/\s+/g, '_');

    return {
      source: 'wikidata',
      uri: `https://www.wikidata.org/wiki/${encodeURIComponent(normalizedName)}`,
      label: entity.text,
      confidence: 0.7,
      types: this.getWikidataTypes(entity.type)
    };
  }

  /**
   * Generate DBpedia link
   */
  private generateDBpediaLink(entity: Entity): EntityLink | null {
    const normalizedName = entity.text.replace(/\s+/g, '_');

    return {
      source: 'dbpedia',
      uri: `http://dbpedia.org/resource/${encodeURIComponent(normalizedName)}`,
      label: entity.text,
      confidence: 0.65,
      types: this.getDBpediaTypes(entity.type)
    };
  }

  /**
   * Generate Schema.org type link
   */
  private generateSchemaOrgLink(entity: Entity): EntityLink | null {
    const schemaType = this.getSchemaOrgType(entity.type);
    if (!schemaType) return null;

    return {
      source: 'schema.org',
      uri: `https://schema.org/${schemaType}`,
      label: schemaType,
      confidence: 0.9,
      types: [schemaType]
    };
  }

  /**
   * Get Wikidata types for entity type
   */
  private getWikidataTypes(type: EntityType): string[] {
    const mapping: Record<EntityType, string[]> = {
      [EntityType.PERSON]: ['Q5'],
      [EntityType.ORGANIZATION]: ['Q43229', 'Q4830453'],
      [EntityType.LOCATION]: ['Q2221906', 'Q515'],
      [EntityType.DATE]: ['Q205892'],
      [EntityType.TIME]: ['Q11471'],
      [EntityType.MONEY]: ['Q1368'],
      [EntityType.PERCENT]: ['Q11229'],
      [EntityType.EMAIL]: ['Q1273693'],
      [EntityType.PHONE]: ['Q11224'],
      [EntityType.URL]: ['Q42253'],
      [EntityType.IP_ADDRESS]: ['Q11135'],
      [EntityType.PRODUCT]: ['Q2424752'],
      [EntityType.EVENT]: ['Q1656682'],
      [EntityType.CUSTOM]: []
    };

    return mapping[type] || [];
  }

  /**
   * Get DBpedia types for entity type
   */
  private getDBpediaTypes(type: EntityType): string[] {
    const mapping: Record<EntityType, string[]> = {
      [EntityType.PERSON]: ['dbo:Person', 'foaf:Person'],
      [EntityType.ORGANIZATION]: ['dbo:Organization', 'dbo:Company'],
      [EntityType.LOCATION]: ['dbo:Location', 'dbo:Place'],
      [EntityType.DATE]: ['xsd:date'],
      [EntityType.TIME]: ['xsd:time'],
      [EntityType.MONEY]: ['dbo:Currency'],
      [EntityType.PERCENT]: ['xsd:decimal'],
      [EntityType.EMAIL]: [],
      [EntityType.PHONE]: [],
      [EntityType.URL]: ['xsd:anyURI'],
      [EntityType.IP_ADDRESS]: [],
      [EntityType.PRODUCT]: ['dbo:Product'],
      [EntityType.EVENT]: ['dbo:Event'],
      [EntityType.CUSTOM]: []
    };

    return mapping[type] || [];
  }

  /**
   * Get Schema.org type for entity type
   */
  private getSchemaOrgType(type: EntityType): string | null {
    const mapping: Record<EntityType, string | null> = {
      [EntityType.PERSON]: 'Person',
      [EntityType.ORGANIZATION]: 'Organization',
      [EntityType.LOCATION]: 'Place',
      [EntityType.DATE]: 'Date',
      [EntityType.TIME]: 'Time',
      [EntityType.MONEY]: 'MonetaryAmount',
      [EntityType.PERCENT]: null,
      [EntityType.EMAIL]: 'ContactPoint',
      [EntityType.PHONE]: 'ContactPoint',
      [EntityType.URL]: 'URL',
      [EntityType.IP_ADDRESS]: null,
      [EntityType.PRODUCT]: 'Product',
      [EntityType.EVENT]: 'Event',
      [EntityType.CUSTOM]: null
    };

    return mapping[type] || null;
  }

  /**
   * Get default knowledge bases
   */
  private getDefaultKnowledgeBases(): KnowledgeBase[] {
    return [
      {
        name: 'Wikidata',
        baseUri: 'https://www.wikidata.org',
        searchEndpoint: 'https://www.wikidata.org/w/api.php'
      },
      {
        name: 'DBpedia',
        baseUri: 'http://dbpedia.org',
        searchEndpoint: 'http://lookup.dbpedia.org/api/search'
      },
      {
        name: 'Schema.org',
        baseUri: 'https://schema.org'
      }
    ];
  }

  /**
   * Add a custom knowledge base
   */
  addKnowledgeBase(kb: KnowledgeBase): void {
    this.knowledgeBases.push(kb);
  }

  /**
   * Get all knowledge bases
   */
  getKnowledgeBases(): KnowledgeBase[] {
    return [...this.knowledgeBases];
  }

  /**
   * Clear link cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Resolve entity against knowledge base (would call API in production)
   */
  async resolve(entity: Entity, knowledgeBase: string): Promise<EntityLink | null> {
    // In production, this would call the knowledge base API
    // For now, return a generated link
    const links = await this.generateLinks(entity);
    return links.find(l => l.source === knowledgeBase) || null;
  }
}
