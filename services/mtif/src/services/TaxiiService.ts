import type {
  CollectionRecord,
  ObjectQueryOptions,
  PaginatedResult,
  StixObject,
  TaxiiApiRootInformation,
  TaxiiDiscoveryDocument
} from '../types.js';
import { FeedRepository, COLLECTION_DEFAULT_ID } from './FeedRepository.js';

export interface TaxiiServiceOptions {
  discoveryTitle?: string;
  discoveryDescription?: string;
  contact?: string;
  apiRoot?: string;
  maxContentLength?: number;
}

export class TaxiiService {
  constructor(private readonly repository: FeedRepository, private readonly options: TaxiiServiceOptions = {}) {}

  discoveryDocument(): TaxiiDiscoveryDocument {
    return {
      title: this.options.discoveryTitle ?? 'Model Threat Intelligence TAXII Service',
      description:
        this.options.discoveryDescription ?? 'TAXII 2.1 compliant API exposing LLM threat intelligence feeds.',
      contact: this.options.contact ?? 'security@intelgraph.example.com',
      default: `${this.apiRootPath()}/`,
      api_roots: [this.apiRootPath()]
    };
  }

  apiRootInformation(): TaxiiApiRootInformation {
    return {
      title: 'MTIF API Root',
      description: 'Primary TAXII API root for MTIF collections.',
      versions: ['2.1'],
      max_content_length: this.options.maxContentLength ?? 10_485_760
    };
  }

  listCollections(): CollectionRecord[] {
    return this.repository.listCollections();
  }

  queryObjects(collectionId: string, options: ObjectQueryOptions): PaginatedResult<StixObject> {
    return this.repository.getObjects(collectionId, options);
  }

  get defaultCollectionId(): string {
    return COLLECTION_DEFAULT_ID;
  }

  private apiRootPath(): string {
    return this.options.apiRoot ?? '/taxii2/api-root';
  }
}
