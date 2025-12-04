/**
 * Metadata Search Service
 * Provides comprehensive search across all catalog entities
 */

import {
  DataSource,
  Dataset,
  Field,
  Mapping,
  DataSourceType,
  DatasetStatus,
} from '../types/dataSourceTypes.js';
import { SchemaDefinition, SchemaType, SchemaStatus } from '../types/schemaRegistry.js';
import { DataClassification } from '../types/catalog.js';

/**
 * Search Entity Type
 */
export enum SearchEntityType {
  DATA_SOURCE = 'DATA_SOURCE',
  DATASET = 'DATASET',
  FIELD = 'FIELD',
  MAPPING = 'MAPPING',
  SCHEMA = 'SCHEMA',
  ALL = 'ALL',
}

/**
 * Metadata Search Filter
 */
export interface MetadataSearchFilter {
  entityTypes?: SearchEntityType[];
  dataSourceTypes?: DataSourceType[];
  datasetStatuses?: DatasetStatus[];
  schemaTypes?: SchemaType[];
  classifications?: DataClassification[];
  tags?: string[];
  domains?: string[];
  owners?: string[];
  dateFrom?: Date;
  dateTo?: Date;
}

/**
 * Search Sort Option
 */
export interface SearchSort {
  field: string;
  direction: 'ASC' | 'DESC';
}

/**
 * Metadata Search Request
 */
export interface MetadataSearchRequest {
  query: string;
  filters?: MetadataSearchFilter;
  sort?: SearchSort[];
  offset?: number;
  limit?: number;
  includeArchived?: boolean;
}

/**
 * Metadata Search Result
 */
export interface MetadataSearchResult {
  entityId: string;
  entityType: SearchEntityType;
  name: string;
  displayName: string;
  description: string | null;
  fullyQualifiedName?: string;
  highlights?: string[];
  score: number;
  metadata: Record<string, any>;
}

/**
 * Metadata Search Response
 */
export interface MetadataSearchResponse {
  results: MetadataSearchResult[];
  total: number;
  offset: number;
  limit: number;
  took: number;
  facets: MetadataSearchFacet[];
}

/**
 * Metadata Search Facet
 */
export interface MetadataSearchFacet {
  field: string;
  values: Array<{
    value: string;
    count: number;
  }>;
}

/**
 * Field Search Request
 */
export interface FieldSearchRequest {
  query: string;
  datasetId?: string;
  dataType?: string;
  canonicalFieldId?: string;
  hasMappings?: boolean;
  offset?: number;
  limit?: number;
}

/**
 * Impact Analysis Request
 */
export interface ImpactAnalysisRequest {
  entityId: string;
  entityType: SearchEntityType;
  depth?: number;
}

/**
 * Impact Analysis Response
 */
export interface ImpactAnalysisResponse {
  entityId: string;
  entityType: SearchEntityType;
  impactedEntities: ImpactedEntity[];
  totalImpacted: number;
}

/**
 * Impacted Entity
 */
export interface ImpactedEntity {
  entityId: string;
  entityType: SearchEntityType;
  name: string;
  impactLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  path: string[];
}

export class MetadataSearchService {
  private dataSources: Map<string, DataSource>;
  private datasets: Map<string, Dataset>;
  private fields: Map<string, Field>;
  private mappings: Map<string, Mapping>;
  private schemas: Map<string, SchemaDefinition>;

  constructor(
    dataSources: Map<string, DataSource>,
    datasets: Map<string, Dataset>,
    fields: Map<string, Field>,
    mappings: Map<string, Mapping>,
    schemas: Map<string, SchemaDefinition>,
  ) {
    this.dataSources = dataSources;
    this.datasets = datasets;
    this.fields = fields;
    this.mappings = mappings;
    this.schemas = schemas;
  }

  /**
   * Search across all metadata
   */
  async search(
    request: MetadataSearchRequest,
  ): Promise<MetadataSearchResponse> {
    const startTime = Date.now();
    const results: MetadataSearchResult[] = [];

    const entityTypes = request.filters?.entityTypes || [SearchEntityType.ALL];
    const includeAll = entityTypes.includes(SearchEntityType.ALL);

    // Search data sources
    if (includeAll || entityTypes.includes(SearchEntityType.DATA_SOURCE)) {
      const dsResults = await this.searchDataSources(request);
      results.push(...dsResults);
    }

    // Search datasets
    if (includeAll || entityTypes.includes(SearchEntityType.DATASET)) {
      const datasetResults = await this.searchDatasets(request);
      results.push(...datasetResults);
    }

    // Search fields
    if (includeAll || entityTypes.includes(SearchEntityType.FIELD)) {
      const fieldResults = await this.searchFields(request);
      results.push(...fieldResults);
    }

    // Search mappings
    if (includeAll || entityTypes.includes(SearchEntityType.MAPPING)) {
      const mappingResults = await this.searchMappings(request);
      results.push(...mappingResults);
    }

    // Search schemas
    if (includeAll || entityTypes.includes(SearchEntityType.SCHEMA)) {
      const schemaResults = await this.searchSchemas(request);
      results.push(...schemaResults);
    }

    // Sort results by score (descending)
    results.sort((a, b) => b.score - a.score);

    // Apply pagination
    const offset = request.offset || 0;
    const limit = request.limit || 20;
    const paginatedResults = results.slice(offset, offset + limit);

    // Calculate facets
    const facets = this.calculateFacets(results);

    const took = Date.now() - startTime;

    return {
      results: paginatedResults,
      total: results.length,
      offset,
      limit,
      took,
      facets,
    };
  }

  /**
   * Search data sources
   */
  private async searchDataSources(
    request: MetadataSearchRequest,
  ): Promise<MetadataSearchResult[]> {
    const query = request.query.toLowerCase();
    const results: MetadataSearchResult[] = [];

    for (const ds of this.dataSources.values()) {
      // Apply filters
      if (request.filters?.dataSourceTypes) {
        if (!request.filters.dataSourceTypes.includes(ds.type)) {
          continue;
        }
      }

      if (request.filters?.tags && request.filters.tags.length > 0) {
        if (!request.filters.tags.some((tag) => ds.tags.includes(tag))) {
          continue;
        }
      }

      if (request.filters?.domains && request.filters.domains.length > 0) {
        if (!ds.domain || !request.filters.domains.includes(ds.domain)) {
          continue;
        }
      }

      if (request.filters?.owners && request.filters.owners.length > 0) {
        if (!request.filters.owners.includes(ds.owner)) {
          continue;
        }
      }

      // Calculate relevance score
      const score = this.calculateRelevanceScore(
        query,
        ds.name,
        ds.displayName,
        ds.description,
        ds.tags,
      );

      if (score > 0) {
        results.push({
          entityId: ds.id,
          entityType: SearchEntityType.DATA_SOURCE,
          name: ds.name,
          displayName: ds.displayName,
          description: ds.description,
          highlights: this.extractHighlights(query, ds),
          score,
          metadata: {
            type: ds.type,
            status: ds.connectionStatus,
            owner: ds.owner,
            tags: ds.tags,
            domain: ds.domain,
          },
        });
      }
    }

    return results;
  }

  /**
   * Search datasets
   */
  private async searchDatasets(
    request: MetadataSearchRequest,
  ): Promise<MetadataSearchResult[]> {
    const query = request.query.toLowerCase();
    const results: MetadataSearchResult[] = [];

    for (const ds of this.datasets.values()) {
      // Apply filters
      if (
        request.filters?.datasetStatuses &&
        request.filters.datasetStatuses.length > 0
      ) {
        if (!request.filters.datasetStatuses.includes(ds.status)) {
          continue;
        }
      }

      if (
        request.filters?.classifications &&
        request.filters.classifications.length > 0
      ) {
        if (!request.filters.classifications.includes(ds.classification)) {
          continue;
        }
      }

      if (request.filters?.tags && request.filters.tags.length > 0) {
        if (!request.filters.tags.some((tag) => ds.tags.includes(tag))) {
          continue;
        }
      }

      if (request.filters?.domains && request.filters.domains.length > 0) {
        if (!ds.domain || !request.filters.domains.includes(ds.domain)) {
          continue;
        }
      }

      // Calculate relevance score
      const score = this.calculateRelevanceScore(
        query,
        ds.name,
        ds.displayName,
        ds.description,
        ds.tags,
      );

      if (score > 0) {
        results.push({
          entityId: ds.id,
          entityType: SearchEntityType.DATASET,
          name: ds.name,
          displayName: ds.displayName,
          description: ds.description,
          fullyQualifiedName: ds.fullyQualifiedName,
          highlights: this.extractHighlights(query, ds),
          score,
          metadata: {
            sourceId: ds.sourceId,
            status: ds.status,
            classification: ds.classification,
            owner: ds.owner,
            tags: ds.tags,
            domain: ds.domain,
            recordCount: ds.recordCount,
            fieldCount: ds.fields.length,
          },
        });
      }
    }

    return results;
  }

  /**
   * Search fields
   */
  private async searchFields(
    request: MetadataSearchRequest,
  ): Promise<MetadataSearchResult[]> {
    const query = request.query.toLowerCase();
    const results: MetadataSearchResult[] = [];

    for (const field of this.fields.values()) {
      // Apply filters
      if (
        request.filters?.classifications &&
        request.filters.classifications.length > 0
      ) {
        if (!request.filters.classifications.includes(field.classification)) {
          continue;
        }
      }

      if (request.filters?.tags && request.filters.tags.length > 0) {
        if (!request.filters.tags.some((tag) => field.tags.includes(tag))) {
          continue;
        }
      }

      // Calculate relevance score
      const score = this.calculateRelevanceScore(
        query,
        field.name,
        field.displayName,
        field.description,
        field.tags,
        [field.dataType],
      );

      if (score > 0) {
        const dataset = this.datasets.get(field.datasetId);
        results.push({
          entityId: field.id,
          entityType: SearchEntityType.FIELD,
          name: field.name,
          displayName: field.displayName,
          description: field.description,
          fullyQualifiedName: dataset
            ? `${dataset.fullyQualifiedName}.${field.name}`
            : field.name,
          highlights: this.extractHighlights(query, field),
          score,
          metadata: {
            datasetId: field.datasetId,
            dataType: field.dataType,
            nullable: field.nullable,
            isPrimaryKey: field.isPrimaryKey,
            isForeignKey: field.isForeignKey,
            classification: field.classification,
            tags: field.tags,
            hasMappings: field.mappingIds.length > 0,
            canonicalFieldId: field.canonicalFieldId,
          },
        });
      }
    }

    return results;
  }

  /**
   * Search mappings
   */
  private async searchMappings(
    request: MetadataSearchRequest,
  ): Promise<MetadataSearchResult[]> {
    const query = request.query.toLowerCase();
    const results: MetadataSearchResult[] = [];

    for (const mapping of this.mappings.values()) {
      const score = this.calculateRelevanceScore(
        query,
        mapping.name,
        mapping.name,
        mapping.description,
        [],
      );

      if (score > 0) {
        results.push({
          entityId: mapping.id,
          entityType: SearchEntityType.MAPPING,
          name: mapping.name,
          displayName: mapping.name,
          description: mapping.description,
          highlights: this.extractHighlights(query, mapping),
          score,
          metadata: {
            sourceDatasetId: mapping.sourceDatasetId,
            sourceFieldId: mapping.sourceFieldId,
            canonicalSchemaId: mapping.canonicalSchemaId,
            canonicalFieldId: mapping.canonicalFieldId,
            transformationType: mapping.transformationType,
            status: mapping.status,
            version: mapping.version,
          },
        });
      }
    }

    return results;
  }

  /**
   * Search schemas
   */
  private async searchSchemas(
    request: MetadataSearchRequest,
  ): Promise<MetadataSearchResult[]> {
    const query = request.query.toLowerCase();
    const results: MetadataSearchResult[] = [];

    for (const schema of this.schemas.values()) {
      // Apply filters
      if (request.filters?.schemaTypes && request.filters.schemaTypes.length > 0) {
        if (!request.filters.schemaTypes.includes(schema.type)) {
          continue;
        }
      }

      if (request.filters?.tags && request.filters.tags.length > 0) {
        if (!request.filters.tags.some((tag) => schema.tags.includes(tag))) {
          continue;
        }
      }

      const score = this.calculateRelevanceScore(
        query,
        schema.name,
        schema.name,
        schema.description,
        schema.tags,
      );

      if (score > 0) {
        results.push({
          entityId: schema.id,
          entityType: SearchEntityType.SCHEMA,
          name: schema.name,
          displayName: schema.name,
          description: schema.description,
          fullyQualifiedName: schema.fullyQualifiedName,
          highlights: this.extractHighlights(query, schema),
          score,
          metadata: {
            namespace: schema.namespace,
            type: schema.type,
            format: schema.format,
            version: schema.version,
            status: schema.status,
            owner: schema.owner,
            tags: schema.tags,
          },
        });
      }
    }

    return results;
  }

  /**
   * Search fields with advanced filters
   */
  async searchFieldsAdvanced(
    request: FieldSearchRequest,
  ): Promise<MetadataSearchResult[]> {
    const query = request.query.toLowerCase();
    const results: MetadataSearchResult[] = [];

    for (const field of this.fields.values()) {
      // Apply filters
      if (request.datasetId && field.datasetId !== request.datasetId) {
        continue;
      }

      if (request.dataType && field.dataType !== request.dataType) {
        continue;
      }

      if (
        request.canonicalFieldId &&
        field.canonicalFieldId !== request.canonicalFieldId
      ) {
        continue;
      }

      if (
        request.hasMappings !== undefined &&
        (field.mappingIds.length > 0) !== request.hasMappings
      ) {
        continue;
      }

      // Calculate relevance score
      const score = this.calculateRelevanceScore(
        query,
        field.name,
        field.displayName,
        field.description,
        field.tags,
        [field.dataType],
      );

      if (score > 0) {
        const dataset = this.datasets.get(field.datasetId);
        results.push({
          entityId: field.id,
          entityType: SearchEntityType.FIELD,
          name: field.name,
          displayName: field.displayName,
          description: field.description,
          fullyQualifiedName: dataset
            ? `${dataset.fullyQualifiedName}.${field.name}`
            : field.name,
          highlights: this.extractHighlights(query, field),
          score,
          metadata: {
            datasetId: field.datasetId,
            datasetName: dataset?.name,
            dataType: field.dataType,
            nullable: field.nullable,
            classification: field.classification,
            tags: field.tags,
            mappingCount: field.mappingIds.length,
            canonicalFieldId: field.canonicalFieldId,
          },
        });
      }
    }

    // Sort by score
    results.sort((a, b) => b.score - a.score);

    // Pagination
    const offset = request.offset || 0;
    const limit = request.limit || 20;

    return results.slice(offset, offset + limit);
  }

  /**
   * Perform impact analysis
   */
  async performImpactAnalysis(
    request: ImpactAnalysisRequest,
  ): Promise<ImpactAnalysisResponse> {
    const impactedEntities: ImpactedEntity[] = [];
    const depth = request.depth || 3;

    // Based on entity type, find all dependent entities
    if (request.entityType === SearchEntityType.DATA_SOURCE) {
      // Find all datasets from this source
      for (const dataset of this.datasets.values()) {
        if (dataset.sourceId === request.entityId) {
          impactedEntities.push({
            entityId: dataset.id,
            entityType: SearchEntityType.DATASET,
            name: dataset.name,
            impactLevel: 'HIGH',
            path: [request.entityId, dataset.id],
          });
        }
      }
    } else if (request.entityType === SearchEntityType.DATASET) {
      // Find all fields and mappings
      for (const field of this.fields.values()) {
        if (field.datasetId === request.entityId) {
          impactedEntities.push({
            entityId: field.id,
            entityType: SearchEntityType.FIELD,
            name: field.name,
            impactLevel: 'MEDIUM',
            path: [request.entityId, field.id],
          });
        }
      }

      for (const mapping of this.mappings.values()) {
        if (mapping.sourceDatasetId === request.entityId) {
          impactedEntities.push({
            entityId: mapping.id,
            entityType: SearchEntityType.MAPPING,
            name: mapping.name,
            impactLevel: 'HIGH',
            path: [request.entityId, mapping.id],
          });
        }
      }
    } else if (request.entityType === SearchEntityType.FIELD) {
      // Find all mappings that use this field
      for (const mapping of this.mappings.values()) {
        if (mapping.sourceFieldId === request.entityId) {
          impactedEntities.push({
            entityId: mapping.id,
            entityType: SearchEntityType.MAPPING,
            name: mapping.name,
            impactLevel: 'CRITICAL',
            path: [request.entityId, mapping.id],
          });
        }
      }
    }

    return {
      entityId: request.entityId,
      entityType: request.entityType,
      impactedEntities,
      totalImpacted: impactedEntities.length,
    };
  }

  /**
   * Calculate relevance score
   */
  private calculateRelevanceScore(
    query: string,
    name: string,
    displayName: string,
    description: string | null,
    tags: string[],
    additionalTerms: string[] = [],
  ): number {
    let score = 0;

    // Exact match in name (highest score)
    if (name.toLowerCase() === query) {
      score += 100;
    } else if (name.toLowerCase().includes(query)) {
      score += 50;
    }

    // Match in display name
    if (displayName.toLowerCase().includes(query)) {
      score += 30;
    }

    // Match in description
    if (description && description.toLowerCase().includes(query)) {
      score += 20;
    }

    // Match in tags
    for (const tag of tags) {
      if (tag.toLowerCase().includes(query)) {
        score += 10;
      }
    }

    // Match in additional terms (e.g., data type)
    for (const term of additionalTerms) {
      if (term.toLowerCase().includes(query)) {
        score += 15;
      }
    }

    return score;
  }

  /**
   * Extract highlights
   */
  private extractHighlights(query: string, entity: any): string[] {
    const highlights: string[] = [];

    if (entity.name && entity.name.toLowerCase().includes(query)) {
      highlights.push(`name: ${entity.name}`);
    }

    if (entity.description && entity.description.toLowerCase().includes(query)) {
      highlights.push(`description: ${entity.description.substring(0, 100)}...`);
    }

    return highlights;
  }

  /**
   * Calculate search facets
   */
  private calculateFacets(results: MetadataSearchResult[]): MetadataSearchFacet[] {
    const facets: MetadataSearchFacet[] = [];

    // Entity type facet
    const entityTypeCounts = new Map<string, number>();
    for (const result of results) {
      const count = entityTypeCounts.get(result.entityType) || 0;
      entityTypeCounts.set(result.entityType, count + 1);
    }

    facets.push({
      field: 'entityType',
      values: Array.from(entityTypeCounts.entries()).map(([value, count]) => ({
        value,
        count,
      })),
    });

    // Tags facet
    const tagCounts = new Map<string, number>();
    for (const result of results) {
      const tags = result.metadata.tags || [];
      for (const tag of tags) {
        const count = tagCounts.get(tag) || 0;
        tagCounts.set(tag, count + 1);
      }
    }

    if (tagCounts.size > 0) {
      facets.push({
        field: 'tags',
        values: Array.from(tagCounts.entries())
          .map(([value, count]) => ({
            value,
            count,
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10), // Top 10 tags
      });
    }

    return facets;
  }
}
