# IntelGraph Platform API Documentation

> **Next-generation intelligence analysis platform with AI-augmented graph analytics**

## 📚 Table of Contents

- [Overview](#overview)
- [Quick Start](QUICKSTART.md)
- [Authentication](AUTHENTICATION.md)
- [API Reference](#api-reference)
  - [REST API Reference](REST_REFERENCE.md)
  - [GraphRAG API Reference](GRAPHRAG_API.md)
  - [Ingestion API Reference](INGESTION_API.md)
  - [Admin API Reference](ADMIN_API.md)
- [Error Handling](ERRORS.md)
- [SDK Usage Examples](SDK_EXAMPLES.md)
- [Best Practices](BEST_PRACTICES.md)

---

## Overview

The IntelGraph Platform (Summit) provides a comprehensive set of APIs for intelligence analysis, knowledge graph management, and AI-powered reasoning.

### REST API

- **Base URL**: `https://api.summit.io/api/v1`
- **Format**: JSON
- **Documentation**: [REST API Reference](REST_REFERENCE.md)

### GraphQL API

- **Endpoint**: `https://api.summit.io/graphql`
- **Use Cases**: Complex graph queries, GraphRAG, real-time subscriptions
- **Documentation**: [GraphRAG API Reference](GRAPHRAG_API.md)

---

## API Reference

The API is divided into several functional areas:

### [REST API Reference](REST_REFERENCE.md)

Covers core intelligence objects (Cases, Evidence), graph entities and relationships, and Maestro orchestration (Runs, Pipelines, Budgets).

### [GraphRAG API Reference](GRAPHRAG_API.md)

Details the AI-augmented graph retrieval and reasoning API, including natural language querying, confidence scores, and explainable why-paths.

### [Ingestion API Reference](INGESTION_API.md)

Information on submitting data to the platform, canonical ingestion envelopes, and monitoring ingestion jobs.

### [Admin API Reference](ADMIN_API.md)

Endpoints for system health monitoring, audit logs, metrics, and user management.

---

## Error Handling

All APIs follow a consistent error format and standard HTTP status codes. See the [Error Reference](ERRORS.md) for details.

---

## SDKs

Official SDKs are available for Python and JavaScript. See [SDK Usage Examples](SDK_EXAMPLES.md) for quick start guides.

---

## Support & Resources

- **Interactive API Docs**: [/api/docs](https://api.summit.io/api/docs)
- **OpenAPI Specification**: [/api/docs/openapi.json](https://api.summit.io/api/docs/openapi.json)
- **Health Status**: [/health](https://api.summit.io/health)

---

**License**: MIT
**Version**: 1.1.0
**Last Updated**: January 2025
