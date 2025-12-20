/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BaseHttpRequest } from './core/BaseHttpRequest';
import type { OpenAPIConfig } from './core/OpenAPI';
import { FetchHttpRequest } from './core/FetchHttpRequest';
import { AiEnhancementService } from './services/AiEnhancementService';
import { AuthenticationService } from './services/AuthenticationService';
import { CollaborationService } from './services/CollaborationService';
import { EntitiesService } from './services/EntitiesService';
import { GraphAnalyticsService } from './services/GraphAnalyticsService';
import { RelationshipsService } from './services/RelationshipsService';
import { SystemService } from './services/SystemService';
type HttpRequestConstructor = new (config: OpenAPIConfig) => BaseHttpRequest;
export class IntelGraphCoreClient {
  public readonly aiEnhancement: AiEnhancementService;
  public readonly authentication: AuthenticationService;
  public readonly collaboration: CollaborationService;
  public readonly entities: EntitiesService;
  public readonly graphAnalytics: GraphAnalyticsService;
  public readonly relationships: RelationshipsService;
  public readonly system: SystemService;
  public readonly request: BaseHttpRequest;
  constructor(config?: Partial<OpenAPIConfig>, HttpRequest: HttpRequestConstructor = FetchHttpRequest) {
    this.request = new HttpRequest({
      BASE: config?.BASE ?? 'https://api.intelgraph.ai/v2',
      VERSION: config?.VERSION ?? '2.2.0',
      WITH_CREDENTIALS: config?.WITH_CREDENTIALS ?? false,
      CREDENTIALS: config?.CREDENTIALS ?? 'include',
      TOKEN: config?.TOKEN,
      USERNAME: config?.USERNAME,
      PASSWORD: config?.PASSWORD,
      HEADERS: config?.HEADERS,
      ENCODE_PATH: config?.ENCODE_PATH,
    });
    this.aiEnhancement = new AiEnhancementService(this.request);
    this.authentication = new AuthenticationService(this.request);
    this.collaboration = new CollaborationService(this.request);
    this.entities = new EntitiesService(this.request);
    this.graphAnalytics = new GraphAnalyticsService(this.request);
    this.relationships = new RelationshipsService(this.request);
    this.system = new SystemService(this.request);
  }
}

