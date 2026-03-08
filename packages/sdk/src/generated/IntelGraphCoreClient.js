"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntelGraphCoreClient = void 0;
const FetchHttpRequest_1 = require("./core/FetchHttpRequest");
const AiEnhancementService_1 = require("./services/AiEnhancementService");
const AuthenticationService_1 = require("./services/AuthenticationService");
const CollaborationService_1 = require("./services/CollaborationService");
const EntitiesService_1 = require("./services/EntitiesService");
const GraphAnalyticsService_1 = require("./services/GraphAnalyticsService");
const RelationshipsService_1 = require("./services/RelationshipsService");
const SystemService_1 = require("./services/SystemService");
class IntelGraphCoreClient {
    aiEnhancement;
    authentication;
    collaboration;
    entities;
    graphAnalytics;
    relationships;
    system;
    request;
    constructor(config, HttpRequest = FetchHttpRequest_1.FetchHttpRequest) {
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
        this.aiEnhancement = new AiEnhancementService_1.AiEnhancementService(this.request);
        this.authentication = new AuthenticationService_1.AuthenticationService(this.request);
        this.collaboration = new CollaborationService_1.CollaborationService(this.request);
        this.entities = new EntitiesService_1.EntitiesService(this.request);
        this.graphAnalytics = new GraphAnalyticsService_1.GraphAnalyticsService(this.request);
        this.relationships = new RelationshipsService_1.RelationshipsService(this.request);
        this.system = new SystemService_1.SystemService(this.request);
    }
}
exports.IntelGraphCoreClient = IntelGraphCoreClient;
