import { Driver } from 'neo4j-driver';

interface MediaSourceArgs {
  investigationId?: string;
  mediaType?: string;
  limit?: number;
}

interface EntityArgs {
  investigationId?: string;
  mediaType?: string;
  extractionMethod?: string;
  minConfidence?: number;
  limit?: number;
}

interface CrossModalMatchArgs {
  entityId: string;
  targetMediaTypes: string[];
  minSimilarity?: number;
  limit?: number;
}

interface ExtractionJobArgs {
  investigationId?: string;
  status?: string;
  limit?: number;
}

interface SearchInput {
  query: string;
  mediaTypes?: string[];
  entityTypes?: string[];
  investigationId?: string;
  includeCrossModal?: boolean;
  minConfidence?: number;
  limit?: number;
}

interface SemanticSearchInput {
  embedding: number[];
  mediaTypes?: string[];
  threshold?: number;
  limit?: number;
}

interface MediaSourceInput {
  uri: string;
  mediaType: string;
  mimeType: string;
  filename?: string;
  metadata?: any;
}

interface CreateMultimodalEntityInput {
  type: string;
  label: string;
  description?: string;
  properties: any;
  extractedFrom: string[];
  extractionMethod: string;
  confidence: number;
  boundingBoxes?: any[];
  temporalBounds?: any[];
  spatialContext?: any;
  investigationId: string;
}

interface CreateMultimodalRelationshipInput {
  sourceId: string;
  targetId: string;
  type: string;
  label?: string;
  properties?: any;
  extractedFrom: string[];
  extractionMethod: string;
  confidence: number;
  validFrom?: string;
  validTo?: string;
  spatialContext?: any[];
  temporalContext?: any[];
}

interface ExtractionJobInput {
  mediaSourceId: string;
  extractionMethods: string[];
  investigationId: string;
  processingParams?: any;
}

interface ReprocessMediaArgs {
  mediaSourceId: string;
  extractionMethods: string[];
  investigationId: string;
}

interface BatchUploadArgs {
  inputs: MediaSourceInput[];
}

interface BatchExtractArgs {
  mediaSourceIds: string[];
  extractionMethods: string[];
  investigationId: string;
}

interface GenerateCrossModalMatchesArgs {
  entityId: string;
  targetMediaTypes: string[];
}

interface ComputeSemanticClustersArgs {
  investigationId: string;
  algorithm?: string;
}

interface ValidateExtractionResultsArgs {
  jobId: string;
}

interface CleanupDuplicateEntitiesArgs {
  investigationId: string;
  similarity?: number;
  autoMerge?: boolean;
}

interface UpdateMediaMetadataArgs {
  id: string;
  metadata: any;
}

interface VerifyEntityArgs {
  id: string;
  verified: boolean;
}

interface MergeEntitiesArgs {
  primaryId: string;
  secondaryIds: string[];
}

declare class MultimodalDataService {
  constructor(neo4jDriver: Driver, authService: any, storageService: any);

  getMediaSources(args: MediaSourceArgs): Promise<any[]>;
  getMediaSource(id: string): Promise<any>;
  getMultimodalEntities(args: EntityArgs): Promise<any[]>;
  getMultimodalEntity(id: string): Promise<any>;
  findCrossModalMatches(
    entityId: string,
    targetMediaTypes: string[],
  ): Promise<any[]>;
  getExtractionJobs(args: ExtractionJobArgs): Promise<any[]>;
  getExtractionJob(id: string): Promise<any>;
  multimodalSearch(input: SearchInput): Promise<any>;
  semanticSearch(input: SemanticSearchInput): Promise<any>;
  getMultimodalAnalytics(investigationId: string): Promise<any>;
  getUnverifiedEntities(args: EntityArgs): Promise<any[]>;
  findDuplicateEntities(args: {
    investigationId?: string;
    similarity?: number;
    limit?: number;
  }): Promise<any[]>;
  uploadMediaSource(mediaData: MediaSourceInput, userId: string): Promise<any>;
  deleteMediaSource(id: string, userId: string): Promise<any>;
  updateMediaMetadata(id: string, metadata: any, userId: string): Promise<any>;
  createMultimodalEntity(
    entityData: CreateMultimodalEntityInput,
    userId: string,
  ): Promise<any>;
  updateMultimodalEntity(
    id: string,
    input: CreateMultimodalEntityInput,
    userId: string,
  ): Promise<any>;
  verifyMultimodalEntity(
    id: string,
    verified: boolean,
    userId: string,
  ): Promise<any>;
  mergeMultimodalEntities(
    primaryId: string,
    secondaryIds: string[],
    userId: string,
  ): Promise<any>;
  createMultimodalRelationship(
    relationshipData: CreateMultimodalRelationshipInput,
    userId: string,
  ): Promise<any>;
  updateMultimodalRelationship(
    id: string,
    input: CreateMultimodalRelationshipInput,
    userId: string,
  ): Promise<any>;
  verifyMultimodalRelationship(
    id: string,
    verified: boolean,
    userId: string,
  ): Promise<any>;
  startExtractionJob(jobData: ExtractionJobInput, userId: string): Promise<any>;
  cancelExtractionJob(id: string, userId: string): Promise<any>;
  computeSemanticClusters(
    investigationId: string,
    algorithm?: string,
  ): Promise<any>;
  validateExtractionResults(jobId: string): Promise<any>;
  cleanupDuplicateEntities(
    investigationId: string,
    similarity?: number,
    autoMerge?: boolean,
    userId?: string,
  ): Promise<any>;
}

export default MultimodalDataService;
