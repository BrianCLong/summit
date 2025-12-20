# Automated Data Flow Diagram

```mermaid
graph TD
    CyberDeceptionService(CyberDeceptionService)
    GeoIntService.js(GeoIntService.js)
    EmbeddingService.js(EmbeddingService.js)
    soundex.js[soundex.js]
    cacheService.js(cacheService.js)
    aiAnalysis[aiAnalysis]
    ai[ai]
    docs[docs]
    PhantomLimbService(PhantomLimbService)
    graph-explainer.js[graph-explainer.js]
    LLMService.test(LLMService.test)
    tickets.js[tickets.js]
    FeatureFlagService.test(FeatureFlagService.test)
    QuotaEnforcer.test[QuotaEnforcer.test]
    AuthorizationService.test(AuthorizationService.test)
    NLToCypherService.js(NLToCypherService.js)
    GovernanceDashboardService(GovernanceDashboardService)
    CIBudgetService(CIBudgetService)
    TenantService.js(TenantService.js)
    pm[pm]
    RTBFJobService(RTBFJobService)
    DetectionEngine[DetectionEngine]
    InventionService.test(InventionService.test)
    models[models]
    CaseService(CaseService)
    EntityRepo.test[(EntityRepo.test)]
    orchestration-service(orchestration-service)
    llm-adapter.js[llm-adapter.js]
    PRRiskClassifierService(PRRiskClassifierService)
    dlp[dlp]
    decision-analysis-pipeline[decision-analysis-pipeline]
    policyEvaluator[policyEvaluator]
    GDPRComplianceService(GDPRComplianceService)
    RelationshipRepo.js[(RelationshipRepo.js)]
    provenance-ledger-beta.e2e.test[provenance-ledger-beta.e2e.test]
    EntityResolutionV2Service.test(EntityResolutionV2Service.test)
    repository[(repository)]
    authDirective[authDirective]
    IntelGraphService.test(IntelGraphService.test)
    service(service)
    service.test(service.test)
    entity-mapper[entity-mapper]
    graphrag[graphrag]
    GlassBoxRunService(GlassBoxRunService)
    events[events]
    siem[siem]
    ProvenanceRepo.js[(ProvenanceRepo.js)]
    provenance-ledger-beta[provenance-ledger-beta]
    WorkspaceService.js(WorkspaceService.js)
    EntityResolutionService(EntityResolutionService)
    OracleService(OracleService)
    backupScheduler[backupScheduler]
    CopilotNLQueryService(CopilotNLQueryService)
    TieredRateLimitMiddleware[TieredRateLimitMiddleware]
    cacheHelper[cacheHelper]
    AccessControl.js[AccessControl.js]
    unifiedAuth[unifiedAuth]
    rateLimit[rateLimit]
    PlaybookManager.test[PlaybookManager.test]
    FeatureFlagService(FeatureFlagService)
    er[er]
    GraphAnalysisService.js(GraphAnalysisService.js)
    adminPanelResolvers[adminPanelResolvers]
    SecuriteyesService.js(SecuriteyesService.js)
    dsl[dsl]
    VerificationSwarmService.js(VerificationSwarmService.js)
    SocialService(SocialService)
    RiskManager.js[RiskManager.js]
    RateLimiter.js[RateLimiter.js]
    AbyssService(AbyssService)
    compliance[compliance]
    TimeSeriesIntelligenceService.js(TimeSeriesIntelligenceService.js)
    guardrails.service.test(guardrails.service.test)
    demo_cti[demo_cti]
    SOC2ComplianceService(SOC2ComplianceService)
    trust-center[trust-center]
    AuthService.test(AuthService.test)
    pbac[pbac]
    IngestionService(IngestionService)
    InventionService(InventionService)
    rtbfOrchestrator[rtbfOrchestrator]
    NarrativeAnalysisService(NarrativeAnalysisService)
    trust-center-api[trust-center-api]
    WarrantService(WarrantService)
    engine.test[engine.test]
    summitsight[summitsight]
    geoint[geoint]
    aurelius[aurelius]
    GraphRAGQueryServiceEnhanced.js(GraphRAGQueryServiceEnhanced.js)
    GraphRAGService.js(GraphRAGService.js)
    HTMLExporter[HTMLExporter]
    neo4j[neo4j]
    MCPServersRepo.js[(MCPServersRepo.js)]
    policyEvaluator.test[policyEvaluator.test]
    usage[usage]
    cti-routes[cti-routes]
    OSINTQueueService(OSINTQueueService)
    embeddingUpsertWorker[embeddingUpsertWorker]
    DatabaseService.js(DatabaseService.js)
    dlq[dlq]
    SynonymService.js(SynonymService.js)
    AlertTriageV2Service(AlertTriageV2Service)
    GraphRAGQueryService.test(GraphRAGQueryService.test)
    ElasticsearchService(ElasticsearchService)
    resource-costs[resource-costs]
    echelon2[echelon2]
    Template.js[Template.js]
    ga-core-metrics[ga-core-metrics]
    governance-dashboard[governance-dashboard]
    IngestService.test(IngestService.test)
    quality[quality]
    behavioralFingerprintWorker[behavioralFingerprintWorker]
    RegulatoryReportingService.js(RegulatoryReportingService.js)
    cti[cti]
    Scheduler[Scheduler]
    neighborhood-cache[neighborhood-cache]
    CSVExporter[CSVExporter]
    investigationWorkflowService(investigationWorkflowService)
    alerting-service(alerting-service)
    GraphService.test(GraphService.test)
    consistencyWorker[consistencyWorker]
    crudResolvers[crudResolvers]
    ExternalVerifier.js[ExternalVerifier.js]
    PipelineOrchestrator[PipelineOrchestrator]
    TenantAdminService.js(TenantAdminService.js)
    PDFExporter[PDFExporter]
    MaestroService(MaestroService)
    ingest[ingest]
    audit[audit]
    StrategicPlanRepo.js[(StrategicPlanRepo.js)]
    ConsistencyStore[ConsistencyStore]
    abyss[abyss]
    StrategicPlanningService(StrategicPlanningService)
    OSINTAggregator[OSINTAggregator]
    OSINTQueueService.js(OSINTQueueService.js)
    graph[graph]
    SchemaCatalogService.js(SchemaCatalogService.js)
    lifecycle-listeners.js[lifecycle-listeners.js]
    bundle-serializer[bundle-serializer]
    collaborationService(collaborationService)
    governance[governance]
    model[model]
    ai-insights-client[ai-insights-client]
    TenantCostService(TenantCostService)
    TradeSurveillanceService.js(TradeSurveillanceService.js)
    aiAnalysis.js[aiAnalysis.js]
    HumintService.test(HumintService.test)
    CustomSchemaService(CustomSchemaService)
    cds[cds]
    audit-event-capture-middleware[audit-event-capture-middleware]
    soc2EvidenceJob[soc2EvidenceJob]
    webhook.test[webhook.test]
    QueryReplayService(QueryReplayService)
    CognitiveMapperService.js(CognitiveMapperService.js)
    securiteyes[securiteyes]
    IntelGraphService.js(IntelGraphService.js)
    EmailAnalyticsService.js(EmailAnalyticsService.js)
    KeyVaultService.js(KeyVaultService.js)
    EvidenceRepository.js[(EvidenceRepository.js)]
    IngestService(IngestService)
    ZeroDayService(ZeroDayService)
    GraphConsistencyService.js(GraphConsistencyService.js)
    authRoutes[authRoutes]
    MultimodalDataService.js(MultimodalDataService.js)
    attachments[attachments]
    multimodalResolvers[multimodalResolvers]
    DoclingService.js(DoclingService.js)
    provenance-beta[provenance-beta]
    StatisticalDetector.test[StatisticalDetector.test]
    SpectrumAnalysisService.js(SpectrumAnalysisService.js)
    KnowledgeRepository.js[(KnowledgeRepository.js)]
    GraphRAGQueryService(GraphRAGQueryService)
    Template[Template]
    resolvers-combined[resolvers-combined]
    graph-store[graph-store]
    AdversarialLabService.js(AdversarialLabService.js)
    featurePlaceholders.test[featurePlaceholders.test]
    SupplyChain.test[SupplyChain.test]
    advanced-routing-engine[advanced-routing-engine]
    NecromancerService(NecromancerService)
    EmailService.js(EmailService.js)
    ExtractionEngine[ExtractionEngine]
    threatHuntingService(threatHuntingService)
    QueryPreviewService(QueryPreviewService)
    ReleaseGate[ReleaseGate]
    SchemaRegistryService(SchemaRegistryService)
    AdminPanelService.js(AdminPanelService.js)
    AttachmentService(AttachmentService)
    SecuredLLMService.js(SecuredLLMService.js)
    HttpConnector[HttpConnector]
    selectorMinimizationJobs[selectorMinimizationJobs]
    narrative-prioritization[narrative-prioritization]
    SigIntManager[SigIntManager]
    check-graph-drift[check-graph-drift]
    audit-log.js[audit-log.js]
    pipelines-repo.js[(pipelines-repo.js)]
    DatabaseService(DatabaseService)
    rbac.test[rbac.test]
    evidence-registration-flow[evidence-registration-flow]
    WormStorageService(WormStorageService)
    export-api[export-api]
    cyber-deception[cyber-deception]
    executors-repo.js[(executors-repo.js)]
    SigIntRepository.js[(SigIntRepository.js)]
    detectors.js[detectors.js]
    ModelAbuseWatch.js[ModelAbuseWatch.js]
    growth[growth]
    PPTXExporter[PPTXExporter]
    CrossDomainGuard[CrossDomainGuard]
    GraphCompressionService(GraphCompressionService)
    index[index]
    deception[deception]
    GraphOpsService.js(GraphOpsService.js)
    data-residency[data-residency]
    scoring[scoring]
    PriorArtService(PriorArtService)
    graphragQueryResolvers[graphragQueryResolvers]
    ForesightService(ForesightService)
    CaseRepo.js[(CaseRepo.js)]
    CorrelationEngine[CorrelationEngine]
    strategicPlanLoader[strategicPlanLoader]
    DLPService.js(DLPService.js)
    identity[identity]
    QuotaEnforcer[QuotaEnforcer]
    PRRiskClassifierService.test(PRRiskClassifierService.test)
    HallucinationMitigationService.js(HallucinationMitigationService.js)
    data-platform[data-platform]
    CdnUploadService.test(CdnUploadService.test)
    HybridEntityResolutionService(HybridEntityResolutionService)
    selectorMinimizationMiddleware[selectorMinimizationMiddleware]
    SemanticKGRAGService.js(SemanticKGRAGService.js)
    reporting[(reporting)]
    cacheService(cacheService)
    OSINTPrioritizer[OSINTPrioritizer]
    DefensivePsyOpsService.js(DefensivePsyOpsService.js)
    serviceContinuityOrchestrator(serviceContinuityOrchestrator)
    SearchAnalyticsService(SearchAnalyticsService)
    JSONExporter[JSONExporter]
    NormalizationService(NormalizationService)
    IntelligenceAnalysisService(IntelligenceAnalysisService)
    CopilotOrchestrationService.js(CopilotOrchestrationService.js)
    CausalGraphService(CausalGraphService)
    PredictiveRelationshipService(PredictiveRelationshipService)
    MVP1RBACService(MVP1RBACService)
    SecuredLLMService(SecuredLLMService)
    dashboard-api[dashboard-api]
    GraphAnalyticsService.js(GraphAnalyticsService.js)
    AuditAccessLogRepo.js[(AuditAccessLogRepo.js)]
    time-series-intelligence.test[time-series-intelligence.test]
    NLToCypherService.test(NLToCypherService.test)
    ExternalAPIService.js(ExternalAPIService.js)
    resolvers[resolvers]
    GeopoliticalOracleService(GeopoliticalOracleService)
    dlpMiddleware[dlpMiddleware]
    EmbeddingService(EmbeddingService)
    AICopilotOrchestrator.js[AICopilotOrchestrator.js]
    memoryRepositories.test[(memoryRepositories.test)]
    osint[osint]
    SummitsightDataService(SummitsightDataService)
    InvoiceService.test(InvoiceService.test)
    PredictiveScenarioSimulator[PredictiveScenarioSimulator]
    opa-client[opa-client]
    schema[schema]
    SemanticSearchService.js(SemanticSearchService.js)
    redaction.service.js(redaction.service.js)
    loops.test[loops.test]
    docling.test[docling.test]
    cases[cases]
    CdnUploadService.js(CdnUploadService.js)
    ProofOfNonCollectionService.js(ProofOfNonCollectionService.js)
    InfluenceChannelService.test(InfluenceChannelService.test)
    indexing[indexing]
    distributed-config-service.test(distributed-config-service.test)
    llm-router.config[llm-router.config]
    GAReleaseService(GAReleaseService)
    openapi.js[openapi.js]
    HIPAAComplianceService.js(HIPAAComplianceService.js)
    nl-to-cypher.service(nl-to-cypher.service)
    QuotaService.js(QuotaService.js)
    ingest-worker.js[ingest-worker.js]
    CSVConnector[CSVConnector]
    PredictiveService(PredictiveService)
    experimentation-service(experimentation-service)
    runs-repo.js[(runs-repo.js)]
    ai-copilot[ai-copilot]
    EntityResolutionV2Service.js(EntityResolutionV2Service.js)
    GraphRAGQueryService.js(GraphRAGQueryService.js)
    guard.js[guard.js]
    MultimodalDataService(MultimodalDataService)
    EnrichmentService(EnrichmentService)
    handlers[handlers]
    ExtractionJobService(ExtractionJobService)
    GraphIndexAdvisorService.js(GraphIndexAdvisorService.js)
    PipelineSmokeService(PipelineSmokeService)
    byok-hsm-orchestrator.test[byok-hsm-orchestrator.test]
    telemetry.test[telemetry.test]
    ExternalAPIService(ExternalAPIService)
    residency-service.js(residency-service.js)
    CausalGraphService.test(CausalGraphService.test)
    test-helpers.js[test-helpers.js]
    WorkflowService(WorkflowService)
    webhook.worker[webhook.worker]
    test-helpers[test-helpers]
    cacheService.test(cacheService.test)
    DeceptionService.js(DeceptionService.js)
    BackupManager[BackupManager]
    types.js[types.js]
    EvidenceFusionService.js(EvidenceFusionService.js)
    runs-api[runs-api]
    graph-compression[graph-compression]
    RiskManager[RiskManager]
    export-service.js(export-service.js)
    CompetitiveIntelligenceService(CompetitiveIntelligenceService)
    doclingRepository[(doclingRepository)]
    XAIOverlayService.js(XAIOverlayService.js)
    TaskRepo.js[(TaskRepo.js)]
    tenant-admin[tenant-admin]
    MnemosyneService(MnemosyneService)
    HumintService.js(HumintService.js)
    SafeMutations[SafeMutations]
    RagContextBuilder.test[RagContextBuilder.test]
    PlaybookManager.js[PlaybookManager.js]
    signals-service(signals-service)
    routes[routes]
    OSINTPrioritizationService(OSINTPrioritizationService)
    PlaybookManager[PlaybookManager]
    UsageMeteringService.js(UsageMeteringService.js)
    SOC2ComplianceService.test(SOC2ComplianceService.test)
    policyWrapper[policyWrapper]
    advancedML[advancedML]
    CIBDetectionService.js(CIBDetectionService.js)
    LLMSafetyService(LLMSafetyService)
    scheduler[scheduler]
    proof-carrying-publisher[proof-carrying-publisher]
    tenantGraph[tenantGraph]
    SimulationEngineService(SimulationEngineService)
    DeepfakeHunterService.js(DeepfakeHunterService.js)
    NLToCypherService(NLToCypherService)
    MultimodalSentimentService.js(MultimodalSentimentService.js)
    AuthService(AuthService)
    DeepfakeHunterService(DeepfakeHunterService)
    TenantRepository.test[(TenantRepository.test)]
    CaseRepo[(CaseRepo)]
    regulatory-pack-service.js(regulatory-pack-service.js)
    resolvers.copilot-mvp[resolvers.copilot-mvp]
    cost-guard[cost-guard]
    ReportServiceV2.js(ReportServiceV2.js)
    CaseService.js(CaseService.js)
    PolicyEngine.js[PolicyEngine.js]
    orchestrator[orchestrator]
    provenance-ledger-beta.js[provenance-ledger-beta.js]
    EventSourcingService.js(EventSourcingService.js)
    billing[billing]
    AuthService.js(AuthService.js)
    AuthorizationService.js(AuthorizationService.js)
    PatternOfLifeService(PatternOfLifeService)
    evidence-registration-flow.js[evidence-registration-flow.js]
    PPTXExporter.test[PPTXExporter.test]
    EvidenceFusionService(EvidenceFusionService)
    conductor-routes[conductor-routes]
    CostAnomalyDetectionService(CostAnomalyDetectionService)
    graphAnalysis[graphAnalysis]
    queryComplexityPlugin[queryComplexityPlugin]
    TemplateValidator[TemplateValidator]
    search-v1[search-v1]
    repository.js[(repository.js)]
    taxii-service.js(taxii-service.js)
    GDPRComplianceService.js(GDPRComplianceService.js)
    policy-guard.test[policy-guard.test]
    feedback-service(feedback-service)
    time-series-intelligence[time-series-intelligence]
    maestro[maestro]
    agent_service(agent_service)
    rbac[rbac]
    llm[llm]
    pageRepository[(pageRepository)]
    theme-service.js(theme-service.js)
    feedback.test[(feedback.test)]
    GrowthPlaybookService(GrowthPlaybookService)
    siemMiddleware[siemMiddleware]
    DoclingService(DoclingService)
    StorageTierRecommenderService.test(StorageTierRecommenderService.test)
    FusionService(FusionService)
    AuditService.js(AuditService.js)
    VendorService(VendorService)
    BaseConnector[BaseConnector]
    ResourceCostAnalyzerService.js(ResourceCostAnalyzerService.js)
    consistency[consistency]
    llm-guardrails[llm-guardrails]
    AdversaryAgentService.js(AdversaryAgentService.js)
    SoarService.js(SoarService.js)
    llm.js[llm.js]
    GACoremetricsService(GACoremetricsService)
    IntelGraphService(IntelGraphService)
    STIXTAXIIFusionService.js(STIXTAXIIFusionService.js)
    ReportRequestValidator.test[(ReportRequestValidator.test)]
    coalescer[coalescer]
    PipelineSmokeService.js(PipelineSmokeService.js)
    resolvers.er[resolvers.er]
    provenance-ledger.js[provenance-ledger.js]
    assistant[assistant]
    xai[xai]
    RetrievalService.test(RetrievalService.test)
    copilot[copilot]
    SavedSearchService(SavedSearchService)
    core[core]
    similarity[similarity]
    PipelineSmokeService.test(PipelineSmokeService.test)
    evidenceOk[evidenceOk]
    LLMService(LLMService)
    LLMService.js(LLMService.js)
    KPIEngine[KPIEngine]
    model-card-generator[model-card-generator]
    CIBDetectionService(CIBDetectionService)
    AdvancedMLService(AdvancedMLService)
    GraphCompressionService.test(GraphCompressionService.test)
    persistenceService(persistenceService)
    RagContextBuilder[RagContextBuilder]
    summit-investigate[summit-investigate]
    CognitiveMapperService.test(CognitiveMapperService.test)
    AuroraService(AuroraService)
    entityResolution.normalization.test[entityResolution.normalization.test]
    audit-access[audit-access]
    RiskManager.test[RiskManager.test]
    CognitiveMapperService(CognitiveMapperService)
    ComplianceMonitoringService(ComplianceMonitoringService)
    scim[scim]
    nl-query.service.test(nl-query.service.test)
    geoint.service.test(geoint.service.test)
    EntityLinkingService.js(EntityLinkingService.js)
    app[app]
    DigitalTwinService(DigitalTwinService)
    SovereignSafeguardsService(SovereignSafeguardsService)
    enhanced-premium-models.js[enhanced-premium-models.js]
    audit-event-capture-middleware.test[audit-event-capture-middleware.test]
    TripwireMetricsService.js(TripwireMetricsService.js)
    TenantPartitioningService(TenantPartitioningService)
    LlmSecurityService(LlmSecurityService)
    intel-graph[intel-graph]
    SemanticSearchService(SemanticSearchService)
    ConsistencyStore.js[ConsistencyStore.js]
    retrieval.test[retrieval.test]
    types[types]
    SecurityIncidentPipeline.test[SecurityIncidentPipeline.test]
    EventSourcingService.test(EventSourcingService.test)
    GraphRAGService(GraphRAGService)
    opa-client.js[opa-client.js]
    GraphConsistencyReporter[(GraphConsistencyReporter)]
    mechanisms[mechanisms]
    auth.test[auth.test]
    normalization[normalization]
    MarketDataService.js(MarketDataService.js)
    IntelCorroborationService.js(IntelCorroborationService.js)
    PredictiveScenarioSimulator.js[PredictiveScenarioSimulator.js]
    AuditAccessLogRepo.test[(AuditAccessLogRepo.test)]
    soar[soar]
    GraphConsistencyService(GraphConsistencyService)
    IncidentManager[IncidentManager]
    UserRepository[(UserRepository)]
    DLQService(DLQService)
    DetectionEngine.test[DetectionEngine.test]
    RTBFAuditService(RTBFAuditService)
    evidence[evidence]
    mock-templates[mock-templates]
    scoring.test[scoring.test]
    ForesightService.test(ForesightService.test)
    xai-integration[xai-integration]
    distributed-config-service(distributed-config-service)
    EventSourcingService(EventSourcingService)
    CaseRepo.test[(CaseRepo.test)]
    EntityResolutionService.test(EntityResolutionService.test)
    ReportServiceV2.test(ReportServiceV2.test)
    SIEMService.js(SIEMService.js)
    DetectionEngine.js[DetectionEngine.js]
    StatisticalDetector[StatisticalDetector]
    RelationshipShapeValidator.test[RelationshipShapeValidator.test]
    legacy[legacy]
    integration.test[integration.test]
    InfluenceChannelService(InfluenceChannelService)
    opaFeatureFlagClient[opaFeatureFlagClient]
    InvoiceService(InvoiceService)
    GovernanceDashboardService.js(GovernanceDashboardService.js)
    ThreatModelingService(ThreatModelingService)
    tenant_repository.js[(tenant_repository.js)]
    CopilotOrchestrationService.test(CopilotOrchestrationService.test)
    security[security]
    services-types(services-types)
    PolicyService.js(PolicyService.js)
    MVP1RBACService.js(MVP1RBACService.js)
    FeatureFlagService.js(FeatureFlagService.js)
    TemplateValidator.test[TemplateValidator.test]
    DeceptionService.test(DeceptionService.test)
    docling[docling]
    report-executor[(report-executor)]
    SummitInvestigate.js[SummitInvestigate.js]
    ChunkingService(ChunkingService)
    GraphConsistencyService.test(GraphConsistencyService.test)
    EdgeFleetService(EdgeFleetService)
    InfluenceOperationsService(InfluenceOperationsService)
    humint[humint]
    KeyVaultService(KeyVaultService)
    sessionRepository[(sessionRepository)]
    TenantSLOService(TenantSLOService)
    pipelines-api[pipelines-api]
    SimilarityService(SimilarityService)
    governedInvestigation[governedInvestigation]
    LLMAnalystService(LLMAnalystService)
    StorageTierRecommenderService.js(StorageTierRecommenderService.js)
    trust-center-service.js(trust-center-service.js)
    BillingService(BillingService)
    server_entry[server_entry]
    QueryBuilderService(QueryBuilderService)
    TenantCostService.js(TenantCostService.js)
    guard[guard]
    masint[masint]
    dpGate[dpGate]
    SecuriteyesService.test(SecuriteyesService.test)
    policy-guard.js[policy-guard.js]
    SovereignSafeguardsService.js(SovereignSafeguardsService.js)
    NarrativePrioritizationService.js(NarrativePrioritizationService.js)
    SemanticKGRAGService.test(SemanticKGRAGService.test)
    trust-center-service.test(trust-center-service.test)
    AICopilotOrchestrator[AICopilotOrchestrator]
    SigningService(SigningService)
    AutoMLService(AutoMLService)
    UsageMeteringService.test(UsageMeteringService.test)
    n8n[n8n]
    CyberDeceptionService.js(CyberDeceptionService.js)
    doclingGraphRepository.js[(doclingGraphRepository.js)]
    DecryptionService.js(DecryptionService.js)
    RiskService(RiskService)
    anomaly-detector[anomaly-detector]
    CrossPlatformAttributionService.js(CrossPlatformAttributionService.js)
    KeyService.js(KeyService.js)
    geopolitics[geopolitics]
    runs-repo[(runs-repo)]
    orchestration-service.js(orchestration-service.js)
    BackupService.js(BackupService.js)
    CaseWorkflowService(CaseWorkflowService)
    SchemaCatalogService.test(SchemaCatalogService.test)
    mlAnalysisService(mlAnalysisService)
    SemanticKGRAGService(SemanticKGRAGService)
    production-security[production-security]
    service.js(service.js)
    intelgraph[intelgraph]
    PricingEngine.js[PricingEngine.js]
    influence-operations[influence-operations]
    RelationshipService.js(RelationshipService.js)
    entity-resolution[entity-resolution]
    export[export]
    caseSpacesAuditWorkflow.integration.test[caseSpacesAuditWorkflow.integration.test]
    admin-smoke[admin-smoke]
    secretRefs[secretRefs]
    IncidentManager.js[IncidentManager.js]
    nl-query.service.js(nl-query.service.js)
    InvestigationSessionService(InvestigationSessionService)
    PathRankingService.js(PathRankingService.js)
    cognitive-mapper[cognitive-mapper]
    VeracityScoringService(VeracityScoringService)
    IngestionService.js(IngestionService.js)
    SecurityIncidentPipeline[SecurityIncidentPipeline]
    NormalizationService.test(NormalizationService.test)
    ga-release[ga-release]
    search[search]
    PatternOfLifeService.test(PatternOfLifeService.test)
    supply-chain[supply-chain]
    cds.test[cds.test]
    PrivacyService.js(PrivacyService.js)
    SummitsightETLService(SummitsightETLService)
    model-adapter[model-adapter]
    QueueService(QueueService)
    OSINTFeedService(OSINTFeedService)
    GrowthPlaybookService.test(GrowthPlaybookService.test)
    rateLimit.test[rateLimit.test]
    KPIEngine.test[KPIEngine.test]
    ForecastingEngine[ForecastingEngine]
    EntityRepo.js[(EntityRepo.js)]
    mnemosyne[mnemosyne]
    SecureFusionService.js(SecureFusionService.js)
    ExporterFactory[ExporterFactory]
    mock-templates.js[mock-templates.js]
    graphragResolvers[graphragResolvers]
    narrativeImpactModel[narrativeImpactModel]
    GraphPatternService(GraphPatternService)
    RiskAnalyticsService.js(RiskAnalyticsService.js)
    EntityRepo[(EntityRepo)]
    Echelon2Service(Echelon2Service)
    zero_day[zero_day]
    NarrativePrioritizationService(NarrativePrioritizationService)
    quantumModelEngine[quantumModelEngine]
    coherenceService(coherenceService)
    psyops[psyops]
    FileConnector[FileConnector]
    experiments.test[experiments.test]
    FraudDetectionService.js(FraudDetectionService.js)
    DataRetentionService.js(DataRetentionService.js)
    graphConsistencyJob[graphConsistencyJob]
    ExtractionJobService.js(ExtractionJobService.js)
    IndexingService(IndexingService)
    disclosures[disclosures]
    DigitalTwinService.test(DigitalTwinService.test)
    GDPRComplianceService.test(GDPRComplianceService.test)
    streaming[streaming]
    workspaces[workspaces]
    StrategicPlanningService.js(StrategicPlanningService.js)
    SignalClassificationService.js(SignalClassificationService.js)
    RelationshipShapeValidator.js[RelationshipShapeValidator.js]
    SignalCollectionService.js(SignalCollectionService.js)
    WatchlistService(WatchlistService)
    MasintService.js(MasintService.js)
    TemplateValidator.js[TemplateValidator.js]
    StrategicPlanningService.test(StrategicPlanningService.test)
    oracle[oracle]
    webhook.service.js(webhook.service.js)
    GeoIntService(GeoIntService)
    PolicyService(PolicyService)
    EmailService(EmailService)
    safety[safety]
    evidenceRepo.js[(evidenceRepo.js)]
    RedTeamSimulator.test[RedTeamSimulator.test]
    SecretsService.js(SecretsService.js)
    premium-model-router.js[premium-model-router.js]
    QuotaService.test(QuotaService.test)
    IReportExporter.js[(IReportExporter.js)]
    neighborhood-cache.js[neighborhood-cache.js]
    provenance-service(provenance-service)
    services.js(services.js)
    governance-metrics-service.js(governance-metrics-service.js)
    ComplianceService(ComplianceService)
    TenantService.test(TenantService.test)
    UsageMeteringService(UsageMeteringService)
    strategicPlanningResolvers[strategicPlanningResolvers]
    QueryPreviewService.js(QueryPreviewService.js)
    StrategicMonitoringService(StrategicMonitoringService)
    middleware[middleware]
    risk[risk]
    provenance-enhancements.test[provenance-enhancements.test]
    webhooks[webhooks]
    GraphAnalyticsService(GraphAnalyticsService)
    pipeline[pipeline]
    HallucinationMitigationService(HallucinationMitigationService)
    securityService(securityService)
    ingestion[ingestion]
    tenants[tenants]
    index.js[index.js]
    apply_indexes[apply_indexes]
    taxii-e2e.test[taxii-e2e.test]
    RetrievalService(RetrievalService)
    InfluenceOperationsService.js(InfluenceOperationsService.js)
    ScimService.js(ScimService.js)
    nl-to-cypher.service.js(nl-to-cypher.service.js)
    VerificationSwarmService(VerificationSwarmService)
    ai-insights-schema[ai-insights-schema]
    er_admin[er_admin]
    financial-services.test(financial-services.test)
    executors-api[executors-api]
    semanticSearch.test[semanticSearch.test]
    GraphAnalyticsService.test(GraphAnalyticsService.test)
    copilot.service(copilot.service)
    docling-build-pipeline[docling-build-pipeline]
    ReportRequestValidator.js[(ReportRequestValidator.js)]
    Report.js[(Report.js)]
    BehavioralFingerprintService.js(BehavioralFingerprintService.js)
    CostOptimizationService.js(CostOptimizationService.js)
    dlpPlugin[dlpPlugin]
    MaestroService.test(MaestroService.test)
    GraphRAGQueryServiceEnhanced.test(GraphRAGQueryServiceEnhanced.test)
    aurora[aurora]
    RetrievalService.js(RetrievalService.js)
    proof-carrying-publishing.test[proof-carrying-publishing.test]
    watchlists[watchlists]
    ParticipantRepo.js[(ParticipantRepo.js)]
    SocialService.js(SocialService.js)
    NarrativePrioritizationService.test(NarrativePrioritizationService.test)
    GrowthPlaybookService.js(GrowthPlaybookService.js)
    ApprovalRepo.js[(ApprovalRepo.js)]
    delivery-service(delivery-service)
    GeolocationService.js(GeolocationService.js)
    GraphService(GraphService)
    provenance-service.js(provenance-service.js)
    SentimentGraphIntegration[SentimentGraphIntegration]
    NarrativeAnalysisService.js(NarrativeAnalysisService.js)
    QuotaService(QuotaService)
    slo-policy.test[slo-policy.test]
    IngestService.js(IngestService.js)
    ResourceTaggingService(ResourceTaggingService)
    GraphCompressionService.js(GraphCompressionService.js)
    CopilotIntegrationService(CopilotIntegrationService)
    AuditAccessLogRepo[(AuditAccessLogRepo)]
    eventRepository[(eventRepository)]
    PasswordResetService.js(PasswordResetService.js)
    xai-overlay[xai-overlay]
    MediaUploadService.js(MediaUploadService.js)
    GlassBoxRunService.js(GlassBoxRunService.js)
    RedTeamSimulator[RedTeamSimulator]
    entityResolution.guards.test[entityResolution.guards.test]
    cti.test[cti.test]
    GraphRAGQueryServiceEnhanced(GraphRAGQueryServiceEnhanced)
    servers-api[servers-api]
    mvp1-copilot[mvp1-copilot]
    PrivacyService.test(PrivacyService.test)
    llmAnalystService.test(llmAnalystService.test)
    IntelligenceAnalysisService.test(IntelligenceAnalysisService.test)
    trust-center-service(trust-center-service)
    storage-tier[storage-tier]
    interfaces[interfaces]
    XAIOverlayService.test(XAIOverlayService.test)
    AdversarialLabService.test(AdversarialLabService.test)
    PolicyEngine.test[PolicyEngine.test]
    sovereign-resolvers[sovereign-resolvers]
    replay-runner[replay-runner]
    dataRetentionEngine[dataRetentionEngine]
    InvestigationRepo.js[(InvestigationRepo.js)]
    SelectorMinimizationService.js(SelectorMinimizationService.js)
    doclingRepository.js[(doclingRepository.js)]
    necromancer[necromancer]
    reporting.test[(reporting.test)]
    SecureFusionService(SecureFusionService)
    rtbfOrchestrator.test[rtbfOrchestrator.test]
    phantom_limb[phantom_limb]
    VulnerabilityService(VulnerabilityService)
    RiskEngine[RiskEngine]
    slo-policy-engine[slo-policy-engine]
    EntityResolutionService.js(EntityResolutionService.js)
    ThreatModelingService.js(ThreatModelingService.js)
    signals.test[signals.test]
    ResourceCostAnalyzerService(ResourceCostAnalyzerService)
    SecuriteyesService(SecuriteyesService)
    IntelCorroborationService(IntelCorroborationService)
    PredictiveService.test(PredictiveService.test)
    registry[registry]
    auth[auth]
    rag[rag]
    graphragService.test(graphragService.test)
    CaseGraphRepository.js[(CaseGraphRepository.js)]
    app --> SummitInvestigate_js
    server_entry --> DataRetentionService_js
    index --> DataRetentionService_js
    index --> OSINTQueueService_js
    production_security --> AuthService_js
    safety --> FeatureFlagService_js
    llm_router_config --> interfaces
    secretRefs --> SecretsService_js
    distributed_config_service_test --> distributed_config_service
    distributed_config_service_test --> repository
    neo4j --> QueryReplayService
    SigIntManager --> SignalCollectionService_js
    SigIntManager --> SignalClassificationService_js
    SigIntManager --> SpectrumAnalysisService_js
    SigIntManager --> GeolocationService_js
    SigIntManager --> DecryptionService_js
    SigIntManager --> SigIntRepository_js
    types --> MediaUploadService_js
    ExtractionEngine --> EmbeddingService_js
    ExtractionEngine --> MediaUploadService_js
    nl_to_cypher_service --> model_adapter
    copilot_service --> nl_query_service_js
    nl_query_service_test --> nl_query_service_js
    guardrails_service_test --> redaction_service_js
    middleware --> cost_guard
    eventRepository --> sessionRepository
    eventRepository --> pageRepository
    pageRepository --> sessionRepository
    memoryRepositories_test --> sessionRepository
    memoryRepositories_test --> pageRepository
    memoryRepositories_test --> eventRepository
    KPIEngine_test --> SummitsightDataService
    ForecastingEngine --> SummitsightDataService
    RiskEngine --> SummitsightDataService
    CorrelationEngine --> SummitsightDataService
    KPIEngine --> SummitsightDataService
    SummitsightETLService --> SummitsightDataService
    rateLimit --> RateLimiter_js
    rbac --> AuthService_js
    siemMiddleware --> SIEMService_js
    unifiedAuth --> AuthService_js
    audit_event_capture_middleware --> EventSourcingService_js
    dpGate --> mechanisms
    dlpMiddleware --> DLPService_js
    TieredRateLimitMiddleware --> cost_guard
    governance --> WarrantService
    auth --> AuthService_js
    usage --> UsageMeteringService_js
    usage --> QuotaService_js
    rateLimit_test --> RateLimiter_js
    rbac_test --> AuthService
    audit_event_capture_middleware_test --> EventSourcingService_js
    auth_test --> AuthService
    webhook_worker --> webhook_service_js
    webhook_test --> webhook_service_js
    CrossDomainGuard --> EntityRepo_js
    index --> runs_repo_js
    index --> PolicyEngine_js
    registry --> report_executor
    advanced_routing_engine --> enhanced_premium_models_js
    orchestration_service --> premium_model_router_js
    conductor_routes --> orchestration_service_js
    conductor_routes --> premium_model_router_js
    cacheHelper --> cacheService_js
    proof_carrying_publisher --> model_card_generator
    proof_carrying_publishing_test --> model_card_generator
    CaseService --> CaseRepo_js
    CaseWorkflowService --> TaskRepo_js
    CaseWorkflowService --> ParticipantRepo_js
    CaseWorkflowService --> ApprovalRepo_js
    CaseWorkflowService --> CaseRepo_js
    CaseWorkflowService --> AuditAccessLogRepo_js
    GrowthPlaybookService --> LLMService_js
    RTBFJobService --> DatabaseService_js
    OSINTQueueService --> VeracityScoringService
    OSINTAggregator --> SecureFusionService_js
    QueueService --> SocialService_js
    LlmSecurityService --> PolicyService_js
    LlmSecurityService --> DLPService_js
    IntelGraphService_test --> IntelGraphService
    EdgeFleetService --> SovereignSafeguardsService_js
    EdgeFleetService --> DefensivePsyOpsService_js
    GraphRAGService --> PathRankingService_js
    DeepfakeHunterService --> LLMService_js
    SocialService --> KeyVaultService_js
    PredictiveScenarioSimulator --> LLMService_js
    SecurityIncidentPipeline --> AlertTriageV2Service
    NLToCypherService --> LLMService_js
    collaborationService --> cacheService
    investigationWorkflowService --> cacheService
    HallucinationMitigationService --> GraphRAGService_js
    HallucinationMitigationService --> IntelCorroborationService_js
    InfluenceOperationsService --> CIBDetectionService_js
    InfluenceOperationsService --> NarrativeAnalysisService_js
    InfluenceOperationsService --> CrossPlatformAttributionService_js
    InfluenceOperationsService --> GraphAnalyticsService_js
    CopilotIntegrationService --> MVP1RBACService
    cacheService_test --> cacheService
    QueryPreviewService --> nl_to_cypher_service_js
    QueryPreviewService --> GlassBoxRunService_js
    GovernanceDashboardService --> runs_repo_js
    GraphRAGQueryService --> GraphRAGService_js
    GraphRAGQueryService --> QueryPreviewService_js
    GraphRAGQueryService --> GlassBoxRunService_js
    GraphRAGQueryService --> nl_to_cypher_service_js
    AuthService --> SecretsService_js
    threatHuntingService --> cacheService
    StrategicPlanningService --> cacheService_js
    StrategicPlanningService --> StrategicPlanRepo_js
    ComplianceMonitoringService --> GDPRComplianceService_js
    ComplianceMonitoringService --> HIPAAComplianceService_js
    CSVConnector --> IngestService_js
    SOC2ComplianceService --> ComplianceMonitoringService
    SOC2ComplianceService --> EventSourcingService
    SOC2ComplianceService --> UserRepository
    CIBDetectionService --> BehavioralFingerprintService_js
    CIBDetectionService --> GraphAnalyticsService_js
    EvidenceFusionService --> LLMService_js
    ComplianceService --> DLPService_js
    CostAnomalyDetectionService --> ResourceTaggingService
    GraphRAGQueryServiceEnhanced --> GraphRAGService_js
    GraphRAGQueryServiceEnhanced --> QueryPreviewService_js
    GraphRAGQueryServiceEnhanced --> GlassBoxRunService_js
    GraphRAGQueryServiceEnhanced --> HallucinationMitigationService_js
    RedTeamSimulator --> SimulationEngineService
    ExtractionJobService --> MultimodalDataService_js
    ExtractionJobService --> EmbeddingService_js
    SecuredLLMService --> SecuredLLMService_js
    SecuredLLMService --> LLMService_js
    rag --> RetrievalService
    rag --> types
    ThreatModelingService --> SecuredLLMService_js
    DoclingService --> doclingRepository_js
    DoclingService --> doclingGraphRepository_js
    DoclingService --> TenantCostService_js
    MultimodalDataService --> ExtractionJobService_js
    RetrievalService --> types
    ExternalAPIService --> KeyVaultService_js
    neighborhood_cache --> GraphOpsService_js
    SecureFusionService --> EmbeddingService_js
    ResourceCostAnalyzerService --> TenantCostService_js
    ResourceCostAnalyzerService --> CostOptimizationService_js
    StrategicPlanningService_test --> StrategicPlanningService
    NarrativeAnalysisService --> GraphAnalyticsService_js
    IntelligenceAnalysisService --> mlAnalysisService
    IntelligenceAnalysisService --> LLMService
    IntelligenceAnalysisService --> AutoMLService
    TenantSLOService --> DatabaseService
    PredictiveRelationshipService --> RelationshipService_js
    PredictiveRelationshipService --> EmbeddingService_js
    TenantPartitioningService --> DatabaseService
    TenantPartitioningService --> TenantCostService
    SimilarityService --> EmbeddingService_js
    AICopilotOrchestrator --> GraphRAGQueryServiceEnhanced_js
    AICopilotOrchestrator --> NLToCypherService_js
    AICopilotOrchestrator --> QueryPreviewService_js
    AICopilotOrchestrator --> GlassBoxRunService_js
    LLMAnalystService --> LLMService_js
    VeracityScoringService --> IntelCorroborationService
    PipelineSmokeService --> runs_repo_js
    RTBFAuditService --> DatabaseService
    RTBFAuditService --> RTBFJobService
    mlAnalysisService --> cacheService
    securityService --> cacheService
    GACoremetricsService --> HybridEntityResolutionService
    persistenceService --> cacheService
    AdvancedMLService --> cacheService
    OSINTFeedService --> ExternalAPIService_js
    OSINTFeedService --> KeyVaultService_js
    OSINTFeedService --> MultimodalSentimentService_js
    KeyVaultService --> KeyService_js
    TenantCostService --> DatabaseService
    CyberDeceptionService --> BehavioralFingerprintService_js
    CIBudgetService --> DatabaseService
    VerificationSwarmService --> LLMService_js
    SemanticSearchService --> EmbeddingService_js
    SemanticSearchService --> SynonymService_js
    service --> models
    quality --> models
    scoring --> models
    scoring_test --> models
    service_test --> service
    service_test --> models
    ConsistencyStore --> GraphConsistencyService_js
    SemanticKGRAGService --> STIXTAXIIFusionService_js
    SemanticKGRAGService_test --> SemanticKGRAGService_js
    SemanticKGRAGService_test --> STIXTAXIIFusionService_js
    xai_integration --> XAIOverlayService_js
    GraphConsistencyReporter --> GraphConsistencyService
    IntelGraphService_test --> IntelGraphService
    NarrativePrioritizationService_test --> NarrativePrioritizationService
    GrowthPlaybookService_test --> GrowthPlaybookService
    UsageMeteringService_test --> UsageMeteringService
    GraphCompressionService_test --> GraphCompressionService
    GraphAnalyticsService_test --> GraphAnalyticsService
    CdnUploadService_test --> CdnUploadService_js
    PrivacyService_test --> PrivacyService_js
    GraphConsistencyService_test --> GraphConsistencyService_js
    InfluenceChannelService_test --> InfluenceChannelService
    PRRiskClassifierService_test --> PRRiskClassifierService
    RedTeamSimulator_test --> SimulationEngineService
    GraphRAGQueryService_test --> GraphRAGQueryService_js
    GraphRAGQueryService_test --> GraphRAGService_js
    GraphRAGQueryService_test --> QueryPreviewService_js
    GraphRAGQueryService_test --> GlassBoxRunService_js
    GraphRAGQueryService_test --> nl_to_cypher_service_js
    QuotaService_test --> QuotaService
    cti_test --> threatHuntingService
    CognitiveMapperService_test --> CognitiveMapperService
    EventSourcingService_test --> EventSourcingService
    HumintService_test --> HumintService_js
    NLToCypherService_test --> NLToCypherService
    NLToCypherService_test --> LLMService
    IngestService_test --> IngestService
    EntityResolutionService_test --> EntityResolutionService_js
    SOC2ComplianceService_test --> SOC2ComplianceService
    SOC2ComplianceService_test --> ComplianceMonitoringService
    SOC2ComplianceService_test --> EventSourcingService
    SOC2ComplianceService_test --> UserRepository
    GDPRComplianceService_test --> GDPRComplianceService
    SchemaCatalogService_test --> SchemaCatalogService_js
    IntelligenceAnalysisService_test --> IntelligenceAnalysisService
    DeceptionService_test --> DeceptionService_js
    PipelineSmokeService_test --> PipelineSmokeService_js
    PipelineSmokeService_test --> runs_repo_js
    StorageTierRecommenderService_test --> StorageTierRecommenderService_js
    TenantService_test --> TenantService_js
    GraphService_test --> GraphService
    FeatureFlagService_test --> FeatureFlagService
    FeatureFlagService_test --> FeatureFlagService_js
    AuthService_test --> AuthService
    PatternOfLifeService_test --> PatternOfLifeService
    index --> CaseGraphRepository_js
    index --> EvidenceRepository_js
    index --> service_js
    StrategicMonitoringService --> StrategicPlanningService_js
    PolicyService --> AuditService_js
    LLMSafetyService --> PolicyService_js
    LLMSafetyService --> AuditService_js
    SentimentGraphIntegration --> GraphOpsService_js
    PPTXExporter_test --> Report_js
    Template --> Report_js
    TemplateValidator --> ReportRequestValidator_js
    PDFExporter --> IReportExporter_js
    CSVExporter --> IReportExporter_js
    JSONExporter --> IReportExporter_js
    HTMLExporter --> IReportExporter_js
    ExporterFactory --> IReportExporter_js
    PPTXExporter --> IReportExporter_js
    XAIOverlayService_test --> XAIOverlayService_js
    PredictiveService --> GraphAnalyticsService
    PredictiveService_test --> PredictiveService
    multimodalResolvers --> MultimodalDataService_js
    resolvers_copilot_mvp --> NLToCypherService_js
    resolvers_copilot_mvp --> GraphRAGService_js
    resolvers_copilot_mvp --> LLMService_js
    attachments --> AttachmentService
    authDirective --> AuthService_js
    resolvers --> CausalGraphService
    resolvers_er --> HybridEntityResolutionService
    resolvers_combined --> AuthService_js
    ai_insights_schema --> ai_insights_client
    SafeMutations --> CustomSchemaService
    resolvers --> services_types
    resolvers --> graph_store
    resolvers --> ai
    ai --> services_types
    graph_store --> services_types
    resolvers --> cacheService_js
    selectorMinimizationMiddleware --> SelectorMinimizationService_js
    resolvers --> theme_service_js
    strategicPlanLoader --> StrategicPlanningService_js
    xai_overlay --> XAIOverlayService_js
    xai_overlay --> ExternalVerifier_js
    cti --> threatHuntingService
    adminPanelResolvers --> AdminPanelService_js
    governedInvestigation --> WarrantService
    docling --> DoclingService_js
    docling --> doclingRepository_js
    search --> ElasticsearchService
    search --> QueryBuilderService
    search --> SavedSearchService
    search --> SearchAnalyticsService
    search --> IndexingService
    tenantGraph --> EntityRepo_js
    tenantGraph --> ProvenanceRepo_js
    tenantGraph --> opa_client_js
    multimodalResolvers --> MultimodalDataService_js
    multimodalResolvers --> MediaUploadService_js
    multimodalResolvers --> ExtractionJobService_js
    core --> EntityRepo_js
    core --> RelationshipRepo_js
    core --> InvestigationRepo_js
    legacy --> AuthService_js
    similarity --> EmbeddingService_js
    crudResolvers --> neighborhood_cache_js
    aiAnalysis --> aiAnalysis_js
    evidence --> provenance_service
    evidence --> evidenceRepo_js
    graphragQueryResolvers --> GraphRAGQueryService_js
    graphragQueryResolvers --> GraphRAGService_js
    graphragQueryResolvers --> QueryPreviewService_js
    graphragQueryResolvers --> GlassBoxRunService_js
    graphragQueryResolvers --> nl_to_cypher_service_js
    strategicPlanningResolvers --> StrategicPlanningService_js
    graphragResolvers --> EmbeddingService_js
    graphragResolvers --> LLMService_js
    mvp1_copilot --> CopilotIntegrationService
    geoint --> GeoIntService_js
    evidenceOk --> evidenceRepo_js
    auth --> AuthService_js
    auth --> PasswordResetService_js
    sovereign_resolvers --> SovereignSafeguardsService
    docling_test --> DoclingService
    docling_test --> doclingRepository
    dlpPlugin --> DLPService_js
    pbac --> AccessControl_js
    queryComplexityPlugin --> RateLimiter_js
    FusionService --> LLMService_js
    FusionService --> EmbeddingService_js
    NormalizationService --> types
    ChunkingService --> types
    EnrichmentService --> types
    IndexingService --> types
    events --> types
    PipelineOrchestrator --> types
    PipelineOrchestrator --> NormalizationService
    PipelineOrchestrator --> EnrichmentService
    PipelineOrchestrator --> IndexingService
    PipelineOrchestrator --> ChunkingService
    PipelineOrchestrator --> DLQService
    DLQService --> types
    policyWrapper --> AccessControl_js
    watchlists --> WatchlistService
    risk --> RiskService
    advancedML --> AdvancedMLService
    provenance_ledger_beta_e2e_test --> provenance_ledger_beta
    provenance_ledger_beta_e2e_test --> evidence_registration_flow
    GraphRAGQueryServiceEnhanced_test --> GraphRAGQueryServiceEnhanced
    GraphRAGQueryServiceEnhanced_test --> GraphRAGService
    GraphRAGQueryServiceEnhanced_test --> QueryPreviewService
    GraphRAGQueryServiceEnhanced_test --> GlassBoxRunService
    DigitalTwinService_test --> DigitalTwinService
    provenance_enhancements_test --> provenance_ledger_beta_js
    RagContextBuilder --> RetrievalService_js
    RetrievalService --> KnowledgeRepository_js
    RetrievalService --> EmbeddingService_js
    RetrievalService_test --> RetrievalService_js
    RetrievalService_test --> KnowledgeRepository_js
    RagContextBuilder_test --> RetrievalService_js
    coherenceService --> narrativeImpactModel
    routes --> coherenceService
    index --> coherenceService
    resolvers --> narrativeImpactModel
    apply_indexes --> GraphIndexAdvisorService_js
    demo_cti --> threatHuntingService
    check_graph_drift --> GraphConsistencyReporter
    BackupManager --> BackupService_js
    n8n --> provenance_ledger_js
    dsl --> model
    MaestroService --> runs_repo_js
    security --> model
    agent_service --> model
    handlers --> model
    handlers --> agent_service
    runs_api --> runs_repo_js
    ReleaseGate --> DLPService_js
    index --> signals_service
    index --> experimentation_service
    index --> feedback_service
    loops_test --> signals_service
    signals_test --> signals_service
    feedback_test --> feedback_service
    slo_policy_engine --> signals_service
    slo_policy_test --> signals_service
    routes --> signals_service
    routes --> experimentation_service
    experiments_test --> experimentation_service
    MaestroService_test --> MaestroService
    MaestroService_test --> runs_repo
    integration_test --> provenance_service_js
    engine_test --> model
    Scheduler --> runs_repo_js
    Scheduler --> executors_repo_js
    pipelines_api --> pipelines_repo_js
    docling_build_pipeline --> DoclingService_js
    decision_analysis_pipeline --> IntelGraphService
    servers_api --> MCPServersRepo_js
    executors_api --> executors_repo_js
    dashboard_api --> runs_repo_js
    replay_runner --> llm_js
    EmailService --> EmailAnalyticsService_js
    usage --> EmailService_js
    behavioralFingerprintWorker --> EntityResolutionService_js
    behavioralFingerprintWorker --> BehavioralFingerprintService_js
    embeddingUpsertWorker --> EmbeddingService_js
    consistencyWorker --> GraphConsistencyService_js
    consistencyWorker --> ConsistencyStore_js
    trust_center_service --> provenance_service_js
    trust_center_service --> MVP1RBACService_js
    trust_center_service_test --> MVP1RBACService_js
    trust_center_service_test --> trust_center_service_js
    llm_guardrails --> guard_js
    byok_hsm_orchestrator_test --> services_js
    dlp --> DLPService_js
    streaming --> ingest_worker_js
    pm --> tickets_js
    oracle --> OracleService
    reporting --> ReportServiceV2_js
    supply_chain --> VendorService
    supply_chain --> VulnerabilityService
    assistant --> llm
    assistant --> coalescer
    assistant --> guard
    schema --> SchemaCatalogService_js
    billing --> PricingEngine_js
    graph_compression --> GraphCompressionService_js
    trust_center_api --> regulatory_pack_service_js
    trust_center_api --> trust_center_service_js
    ga_core_metrics --> GACoremetricsService
    zero_day --> ZeroDayService
    narrative_prioritization --> NarrativePrioritizationService_js
    consistency --> GraphConsistencyService_js
    consistency --> ConsistencyStore_js
    webhooks --> lifecycle_listeners_js
    webhooks --> webhook_service_js
    scim --> ScimService_js
    scim --> types_js
    graphrag --> index_js
    siem --> SIEMService_js
    aurelius --> IngestionService
    aurelius --> InventionService
    aurelius --> PriorArtService
    aurelius --> CompetitiveIntelligenceService
    aurelius --> ForesightService
    soar --> SoarService_js
    cyber_deception --> CyberDeceptionService_js
    data_platform --> service_js
    data_platform --> service_js
    data_platform --> service_js
    abyss --> AbyssService
    disclosures --> export_service_js
    docs --> openapi_js
    entity_resolution --> service
    entity_resolution --> quality
    graphAnalysis --> GraphAnalysisService_js
    admin_smoke --> PipelineSmokeService_js
    cognitive_mapper --> CognitiveMapperService_js
    intel_graph --> IntelGraphService
    phantom_limb --> PhantomLimbService
    ingestion --> RetrievalService
    ingestion --> rag
    ingestion --> types
    resource_costs --> ResourceCostAnalyzerService_js
    er_admin --> EntityResolutionService_js
    ai_copilot --> AICopilotOrchestrator_js
    tenant_admin --> TenantAdminService_js
    compliance --> SOC2ComplianceService
    compliance --> ComplianceMonitoringService
    compliance --> EventSourcingService
    compliance --> UserRepository
    compliance --> SigningService
    cases --> CaseService_js
    cases --> CaseRepo_js
    cases --> AuditAccessLogRepo_js
    influence_operations --> InfluenceOperationsService_js
    data_residency --> residency_service_js
    workspaces --> WorkspaceService_js
    ingest --> IngestService_js
    ingest --> opa_client_js
    copilot --> CopilotNLQueryService
    n8n --> provenance_ledger_js
    echelon2 --> Echelon2Service
    governance_dashboard --> GovernanceDashboardService_js
    osint --> OSINTPrioritizationService
    osint --> VeracityScoringService
    osint --> OSINTQueueService
    safety --> AdversarialLabService_js
    safety --> ModelAbuseWatch_js
    time_series_intelligence --> TimeSeriesIntelligenceService_js
    er --> EntityResolutionV2Service_js
    ai --> EntityLinkingService_js
    ai --> AdversaryAgentService_js
    ai --> MediaUploadService_js
    ai --> RateLimiter_js
    necromancer --> NecromancerService
    search_v1 --> RetrievalService_js
    tenants --> TenantService_js
    storage_tier --> StorageTierRecommenderService_js
    mnemosyne --> MnemosyneService
    aurora --> AuroraService
    deception --> DeceptionService_js
    masint --> MasintService_js
    governance --> SchemaRegistryService
    governance --> WorkflowService
    maestro --> model
    security --> ThreatModelingService_js
    intelgraph --> IntelGraphService_js
    humint --> HumintService_js
    audit_access --> AuditAccessLogRepo_js
    graph --> GraphService
    graph --> GraphAnalyticsService
    graph --> GraphPatternService
    graph --> InvestigationSessionService
    summit_investigate --> VerificationSwarmService_js
    summit_investigate --> EvidenceFusionService_js
    summit_investigate --> DeepfakeHunterService_js
    summit_investigate --> PredictiveScenarioSimulator_js
    geopolitics --> GeopoliticalOracleService
    ga_release --> GAReleaseService
    cds --> EntityRepo_js
    export_api --> opa_client
    export_api --> cost_guard
    trust_center --> trust_center_service_js
    trust_center --> MVP1RBACService_js
    growth --> GrowthPlaybookService_js
    auth --> AuthService_js
    export --> ProvenanceRepo_js
    authRoutes --> AuthService_js
    authRoutes --> PasswordResetService_js
    securiteyes --> SecuriteyesService_js
    securiteyes --> DetectionEngine_js
    securiteyes --> IncidentManager_js
    securiteyes --> IngestionService_js
    securiteyes --> RiskManager_js
    securiteyes --> PlaybookManager_js
    summitsight --> SummitsightDataService
    psyops --> DefensivePsyOpsService_js
    xai --> graph_explainer_js
    xai --> detectors_js
    provenance_beta --> provenance_ledger_beta_js
    provenance_beta --> evidence_registration_flow_js
    audit --> ProvenanceRepo_js
    usage --> PricingEngine_js
    identity --> AuthorizationService_js
    identity --> tenant_repository_js
    OSINTPrioritizer --> OSINTQueueService
    anomaly_detector --> alerting_service
    telemetry_test --> alerting_service
    service --> EmbeddingService_js
    service --> service_js
    service --> LLMService_js
    service --> EmbeddingService_js
    QuotaEnforcer --> RateLimiter_js
    QuotaEnforcer_test --> RateLimiter_js
    backupScheduler --> BackupService_js
    selectorMinimizationJobs --> TripwireMetricsService_js
    selectorMinimizationJobs --> ProofOfNonCollectionService_js
    graphConsistencyJob --> GraphConsistencyService_js
    soc2EvidenceJob --> SOC2ComplianceService
    soc2EvidenceJob --> SigningService
    soc2EvidenceJob --> WormStorageService
    soc2EvidenceJob --> ComplianceMonitoringService
    soc2EvidenceJob --> EventSourcingService
    soc2EvidenceJob --> UserRepository
    indexing --> types_js
    index --> TradeSurveillanceService_js
    index --> RiskAnalyticsService_js
    index --> FraudDetectionService_js
    index --> MarketDataService_js
    index --> RegulatoryReportingService_js
    financial_services_test --> TradeSurveillanceService_js
    financial_services_test --> RiskAnalyticsService_js
    financial_services_test --> FraudDetectionService_js
    financial_services_test --> MarketDataService_js
    financial_services_test --> RegulatoryReportingService_js
    service --> delivery_service
    scheduler --> service
    reporting_test --> delivery_service
    reporting_test --> service
    orchestrator --> service
    BaseConnector --> types
    HttpConnector --> types
    FileConnector --> types
    SchemaRegistryService --> models
    WorkflowService --> models
    WorkflowService --> SchemaRegistryService
    policyEvaluator --> repository_js
    dataRetentionEngine --> repository_js
    rtbfOrchestrator --> repository_js
    rtbfOrchestrator_test --> repository_js
    policyEvaluator_test --> repository_js
    routes --> governance_metrics_service_js
    EntityRepo_test --> EntityRepo
    opaFeatureFlagClient --> opa_client_js
    PriorArtService --> EmbeddingService
    InventionService --> PriorArtService
    InventionService --> LLMService
    IngestionService --> EmbeddingService
    InventionService_test --> InventionService
    ForesightService_test --> ForesightService
    BillingService --> TenantCostService_js
    BillingService --> DatabaseService_js
    search --> SemanticSearchService_js
    time_series_intelligence_test --> TimeSeriesIntelligenceService_js
    CausalGraphService_test --> CausalGraphService
    IntelGraphService_test --> IntelGraphService_js
    InvoiceService_test --> InvoiceService
    caseSpacesAuditWorkflow_integration_test --> CaseRepo
    caseSpacesAuditWorkflow_integration_test --> AuditAccessLogRepo
    caseSpacesAuditWorkflow_integration_test --> CaseService
    entityResolution_guards_test --> EntityResolutionService_js
    AuditAccessLogRepo_test --> AuditAccessLogRepo
    SecurityIncidentPipeline_test --> SecurityIncidentPipeline
    SecurityIncidentPipeline_test --> AlertTriageV2Service
    featurePlaceholders_test --> quantumModelEngine
    featurePlaceholders_test --> serviceContinuityOrchestrator
    semanticSearch_test --> SemanticSearchService
    NormalizationService_test --> NormalizationService
    NormalizationService_test --> types
    geoint_service_test --> GeoIntService
    graphragService_test --> GraphRAGService_js
    entityResolution_normalization_test --> EntityResolutionService
    llmAnalystService_test --> LLMAnalystService
    CaseRepo_test --> CaseRepo
    AdversarialLabService_test --> AdversarialLabService_js
    EntityResolutionV2Service_test --> EntityResolutionV2Service_js
    EntityResolutionV2Service_test --> soundex_js
    cds_test --> EntityRepo_js
    RelationshipShapeValidator_test --> RelationshipShapeValidator_js
    PolicyEngine_test --> PolicyEngine_js
    LLMService_test --> LLMService_js
    CopilotOrchestrationService_test --> CopilotOrchestrationService_js
    policy_guard_test --> types_js
    retrieval_test --> types_js
    service_test --> llm_adapter_js
    service_test --> policy_guard_js
    service_test --> audit_log_js
    TenantRepository_test --> tenant_repository_js
    AuthorizationService_test --> AuthorizationService_js
    TemplateValidator_test --> TemplateValidator_js
    TemplateValidator_test --> ReportRequestValidator_js
    ReportRequestValidator_test --> ReportRequestValidator_js
    ReportRequestValidator_test --> mock_templates_js
    ReportRequestValidator_test --> test_helpers_js
    ReportServiceV2_test --> ReportServiceV2_js
    mock_templates --> Template_js
    test_helpers --> index_js
    cti_routes --> taxii_service_js
    entity_mapper --> EntityRepo_js
    bundle_serializer --> EntityRepo_js
    taxii_e2e_test --> taxii_service_js
    IncidentManager --> SecuriteyesService_js
    IncidentManager --> types_js
    StatisticalDetector --> SecuriteyesService_js
    StatisticalDetector --> types_js
    DetectionEngine --> SecuriteyesService_js
    DetectionEngine --> types_js
    PlaybookManager --> SecuriteyesService_js
    PlaybookManager --> types_js
    RiskManager --> SecuriteyesService_js
    RiskManager --> types_js
    IngestionService --> SecuriteyesService_js
    IngestionService --> types_js
    SecuriteyesService_test --> SecuriteyesService
    SecuriteyesService_test --> types
    RiskManager_test --> SecuriteyesService
    DetectionEngine_test --> SecuriteyesService
    StatisticalDetector_test --> SecuriteyesService
    PlaybookManager_test --> SecuriteyesService
    dlq --> types_js
    orchestrator --> types_js
    pipeline --> types_js
    normalization --> types_js
    SupplyChain_test --> VulnerabilityService
```
