<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# [https://github.com/BrianCLong/summit](https://github.com/BrianCLong/summit)

The current project, IntelGraph, is an advanced AI-augmented intelligence analysis platform with key features that include:

- Deployable-first mantra with robust developer onboarding and easy startup via Docker.
- Multi-database architecture combining Neo4j graph database, PostgreSQL relational DB, TimescaleDB for time-series data, and Redis cache.
- Core platform capabilities like JWT-based authentication, RBAC, OPA policies, graph analytics, real-time collaboration, AI-powered Copilot for investigative insights, and multi-modal data ingestion.
- Advanced AI/ML capabilities including OCR, object detection, face recognition, speech-to-text, NLP, semantic vector search, and cross-modal intelligence.
- Rich front-end React client with real-time UI and graph visualization using Cytoscape.js.
- Observability stack with OpenTelemetry, Prometheus, and Grafana.
- Security hardened with audit logging, rate limiting, encryption, GDPR readiness, and compliance alignment.
- Production-ready deployment using Docker and Kubernetes with CI/CD automation.

The above baseline represents the current state. The next step is to analyze this feature set against Maltego’s state and roadmap (recently reviewed) to identify gaps and opportunities for MVP-2 and General Availability (GA) that will measurably exceed Maltego’s platform.

I will now create a detailed gap analysis comparing IntelGraph features to Maltego’s current and upcoming capabilities, to inform the MVP-2 and GA PRD, focusing on measurable enhancement targets.Here is the gap analysis between IntelGraph (current project state) and Maltego (current and near-future state), followed by a PRD outline for MVP-2 and GA aimed at exceeding all Maltego features measurably.

***

## Gap Analysis: IntelGraph vs. Maltego

| Feature Area | IntelGraph (Current) | Maltego (Current and Roadmap) | Gap / Opportunity for IntelGraph MVP-2/GA |
| :-- | :-- | :-- | :-- |
| **Platform Focus** | AI-augmented intelligence analysis platform with graph analytics, real-time collaboration | OSINT \& cyber investigations platform with graph-based link analysis and monitoring | IntelGraph broader ML pipeline + multi-modal AI exceeds Maltego's OSINT-centric scope |
| **Data Sources \& Ingestion** | CSV, STIX/TAXII, external federated sources + multimodal AI extraction (OCR, speech, vision) | Social media, dark web, CTI feeds, commercial vendors, expanding with new integrations | Expand IntelGraph data connectors (e.g. social platform APIs, dark web, Hunchly integration) |
| **Graph \& Analytics** | Neo4j + PostgreSQL + TimescaleDB + Redis with LOD rendering, clustering, centrality, pathfinding | Neo4j-based graph analytics, entity modeling, smart clustering, temporal analysis | Enhance cross-database graph queries and real-time temporal analytics with LOD and AI inference |
| **AI/ML Extraction \& Analysis** | Multimodal AI pipeline: OCR, NLP (NER, sentiment), object detection, speech-to-text, semantic search | Focused on graph-based entity extraction and correlation; some new AI-driven automation planned | Broaden AI features with deeper multi-modal and semantic AI insights, real-time extraction |
| **User Interface \& Collaboration** | React app with Material-UI, real-time multi-user collaboration, accessibility, mobile responsive | Desktop client + browser tool + organization plans; UI workflow \& case management improvements | Lead with highly responsive web app, live multi-user graph editing, mobile-friendly, WCAG AA |
| **Investigation Workflow** | End-to-end investigation management with entity/relationship versioning and AI Copilot | Consolidated case management for cross-correlation, workflow enhancements | Deliver unified investigation dashboards with AI-driven recommendations, version history, branching |
| **Security \& Compliance** | JWT, RBAC, OPA policies, audit logging, encryption, GDPR ready, SOC 2 type II alignment | Enterprise security features, audit/admin tools, credit usage transparency | Expand governance with fine-grained policies, detailed audit trails, encrypted backups, SOC 2+ compliance |
| **Real-Time and Monitoring** | Real-time updates with Socket.io, Prometheus/Grafana observability, alerting | Maltego Monitor for alerting and continuous monitoring | Deliver integrated monitoring with AI anomaly detection, customizable alerts, seamless workflow integration |
| **Workflow Automation \& Orchestration** | Goal-driven AI query orchestration, Kafka streaming for data ingestion | Planned new transforms \& automation | Expand orchestration for automated data federation, transform chaining, event-driven workflows with user scripting |
| **Extensibility \& Integrations** | Modular design, rich API (GraphQL/REST), extensive AI model plugins | Multiple data sources via Transform Hub and integrations | Provide easy integration SDKs, plugin marketplace, advanced API capabilities exceeding transform hub |
| **Deployment \& DevOps** | Docker, Kubernetes Helm, CI/CD GitHub Actions, monitored health checks | Cloud and on-premises deployment plans | Maintain deployable-first mantra with automation entailing self-healing, blue-green deployments, full observability |
| **Analytics \& Business Metrics** | Built-in dashboards for system and user metrics | Usage metrics, credit tracking | Provide customizable business intelligence dashboards with AI-powered insights and reports |


***

## PRD for MVP-2 and General Availability (GA)

### Objectives

- Surpass Maltego's OSINT and investigation capabilities measurably.
- Deliver the most advanced multi-modal AI-enhanced intelligence platform.
- Enable seamless collaboration and scalability for enterprise and government users.
- Achieve best-in-class security, compliance, and observability.
- Ensure deployability-first with full automation and operational excellence.


### MVP-2 Features \& Deliverables

1. **Expanded Data Ingestion \& Integration**
    - Social media API connectors (Twitter, LinkedIn, Bluesky, WhatsApp)
    - Dark web crawler integration (including Hunchly support)
    - Automated federated ingestion pipeline with Kafka
2. **Advanced AI/ML Analytics**
    - Real-time multi-modal extraction (OCR, NLP, vision, speech) update cadence
    - Semantic search improvements and vector similarity for cross-media correlation
    - AI-driven entity deduplication and relationship inference
3. **Real-Time Collaboration \& Investigation Enhancements**
    - Live multi-user graph editing with conflict resolution
    - Unified case management dashboard with investigation branching/versioning
    - AI Copilot insights with natural language querying enhancements
4. **Security \& Governance**
    - Enhanced OPA policy engine with custom rule creation
    - Detailed audit logs with full actionable trails
    - Encryption-at-rest and in-transit hardened to enterprise standards
    - GDPR and SOC 2 Type II compliance certification preparation
5. **Operations \& Monitoring**
    - AI anomaly detection on data and system metrics
    - Extend Prometheus/Grafana dashboards with business KPI views
    - Advanced alerting with incident management integrations

### General Availability (GA) Features

1. **Workflow Automation \& Orchestration**
    - User-configurable transform pipelines with event triggers
    - Scripting and plugin SDK to extend integration ecosystem
2. **Performance \& Scalability**
    - Optimized LOD and graph clustering for large datasets
    - Horizontal scaling on Kubernetes with dynamic resource management
3. **User Experience \& Accessibility**
    - Mobile-optimized responsive UI with offline mode
    - WCAG 2.1 AA compliance certified
4. **Enterprise \& Cloud Deployment**
    - Hardened Kubernetes Helm charts for multi-cloud support
    - Blue-green deployment, canary releases, and automated rollback
5. **Extensive Reporting \& Analytics**
    - Custom BI dashboards with AI-powered insight generation
    - Export to multiple formats including real-time API feeds for external use

### Measurable Exceedance Criteria

- Support at least 30% more native data connectors/integrations than Maltego.
- Deliver >20% improvement in AI extraction accuracy and entity disambiguation rates.
- 100% web-based real-time multi-user collaboration, vs. Maltego’s desktop/browser split.
- Compliance certified at SOC 2 Type II or equivalent at GA.
- Demonstrated sub-second graph update latency at scale (100k+ entities).
- Provide end-to-end encrypted data pipelines and immutable audit logs.
- Offer at least three unique AI-powered automation features absent in Maltego roadmap.

***

This PRD sets the foundation to measurably outperform Maltego on capability, AI integration, UI/UX, scalable deployment, and security compliance for the next product milestones.

Would you like me to help draft detailed user stories, epics, or technical specs next?
<span style="display:none">[^1]</span>

<div align="center">⁂</div>

[^1]: https://github.com/BrianCLong/summit

