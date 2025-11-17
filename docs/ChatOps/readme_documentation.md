# IntelGraph Platform

Next-Generation Intelligence Graph Platform for advanced link analysis, AI-powered investigations, and real-time collaboration.

![IntelGraph Platform](https://img.shields.io/badge/IntelGraph-Intelligence%20Platform-blue)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![React](https://img.shields.io/badge/React-18+-blue)
![Neo4j](https://img.shields.io/badge/Neo4j-5.15+-red)
![License](https://img.shields.io/badge/License-MIT-yellow)

## 🚀 Features

### Core Capabilities

- **Advanced Graph Analysis**: Interactive graph visualization with Neo4j backend
- **AI/ML-Powered Analytics**: Link prediction, anomaly detection, and community discovery
- **Real-time Collaboration**: Multi-user investigations with live updates
- **Automated Data Ingestion**: Connect to multiple data sources and APIs
- **Comprehensive Security**: RBAC, encryption, and audit trails
- **Extensible Architecture**: Plugin system for custom transforms and visualizations

### AI/ML Features

- **Link Prediction**: GNN-based relationship inference
- **Anomaly Detection**: Autoencoder-based outlier identification
- **Community Detection**: Louvain and Leiden algorithms
- **Entity Extraction**: NLP-powered entity recognition from text
- **Automated Investigation**: AI copilot for investigation suggestions
- **Cross-modal Analysis**: Text, image, and structured data fusion

### Enterprise Features

- **Multi-tenant Architecture**: Isolated investigations per organization
- **API Integration**: 50+ public APIs with automated key management
- **Export & Reporting**: PDF, DOCX, GraphML export capabilities
- **Audit & Compliance**: GDPR, CCPA, FISMA compliance support
- **High Availability**: Kubernetes-native deployment with auto-scaling

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    User Interface                       │
│  React + Material-UI + Cytoscape.js + D3.js           │
└─────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────┐
│                  Application Layer                      │
│     GraphQL API + REST API + WebSocket (Socket.IO)     │
└─────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────┐
│                    Services Layer                       │
│  Neo4j Service │ AI/ML Service │ Auth Service │ API Mgmt │
└─────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────┐
│                   Data Layer                            │
│     Neo4j Graph DB │ Redis Cache │ Elasticsearch       │
└─────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Git

### 1. Clone Repository

```bash
git clone https://github.com/your-org/summit.git
cd intelgraph-platform
```

### 2. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit configuration
nano .env
```

### 3. Development Setup

```bash
# Install dependencies
npm install
cd client && npm install && cd ..

# Start development services
docker-compose -f docker-compose.dev.yml up -d

# Start development server
npm run dev
```

The application will be available at:

- Frontend: http://localhost:3000
- Backend: http://localhost:4000
- GraphQL Playground: http://localhost:4000/graphql
- Neo4j Browser: http://localhost:7474

### 4. Production Deployment

```bash
# Build and deploy with Docker
docker-compose up -d

# Or deploy to Kubernetes
helm install intelgraph ./deploy/helm/
```

## 📊 Usage Examples

### Creating an Investigation

```javascript
// GraphQL mutation
mutation CreateInvestigation {
  createInvestigation(input: {
    title: "Cyber Threat Analysis"
    description: "Investigating APT group activities"
    tags: ["cybersecurity", "apt", "threat-hunting"]
  }) {
    id
    title
    status
    created_at
  }
}
```

### Adding Entities and Relationships

```javascript
// Create Person entity
const person = await createEntity({
  type: 'Person',
  attributes: {
    name: 'John Doe',
    email: 'john@example.com',
    role: 'Software Engineer',
  },
  confidence: 0.95,
});

// Create relationship
await createRelationship({
  from_entity_id: person.id,
  to_entity_id: organization.id,
  type: 'WORKS_FOR',
  confidence: 0.9,
});
```

### AI-Powered Analysis

```javascript
// Predict missing links
const predictions = await predictLinks({
  entity_ids: selectedNodeIds,
  confidence_threshold: 0.7,
});

// Detect anomalies
const anomalies = await detectAnomalies({
  entity_ids: allNodeIds,
  algorithm: 'autoencoder',
});

// Find communities
const communities = await detectCommunities({
  entity_ids: allNodeIds,
  algorithm: 'louvain',
  resolution: 1.0,
});
```

### Plugin Development

```javascript
// Custom transform plugin
export function enrichEntity(entity) {
  if (entity.type === "Person" && entity.attributes.email) {
    // Enrich with external API data
    const socialData = await fetchSocialData(entity.attributes.email);
    return {
      ...entity,
      attributes: {
        ...entity.attributes,
        ...socialData
      }
    };
  }
  return entity;
}

// Register plugin
registerTransform('person_enrichment', enrichEntity);
```

## 🛠️ Development

### Project Structure

```
intelgraph-platform/
├── server/                 # Backend Node.js application
│   ├── graphql/           # GraphQL schema and resolvers
│   ├── services/          # Business logic services
│   ├── middleware/        # Express middleware
│   ├── routes/            # REST API routes
│   └── utils/             # Utility functions
├── client/                # React frontend application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom hooks
│   │   ├── store/         # Redux store and slices
│   │   ├── graphql/       # GraphQL queries/mutations
│   │   └── utils/         # Frontend utilities
├── deploy/                # Deployment configurations
│   ├── helm/              # Helm charts
│   ├── k8s/               # Kubernetes manifests
│   └── terraform/         # Infrastructure as Code
├── docs/                  # Documentation
├── plugins/               # Plugin examples
└── tests/                 # Test suites
```

### Available Scripts

#### Backend

```bash
npm run dev          # Start development server
npm run start        # Start production server
npm run test         # Run test suite
npm run lint         # Lint code
```

#### Frontend

```bash
cd client
npm start           # Start development server
npm run build       # Build for production
npm test            # Run tests
npm run type-check  # TypeScript type checking
```

### Testing

```bash
# Run all tests
npm test

# Run backend tests only
npm run test:server

# Run frontend tests only
npm run test:client

# Run with coverage
npm run test:coverage
```

## 🔧 Configuration

### Environment Variables

| Variable         | Description             | Default                  |
| ---------------- | ----------------------- | ------------------------ |
| `NODE_ENV`       | Environment mode        | `development`            |
| `PORT`           | Server port             | `4000`                   |
| `NEO4J_URI`      | Neo4j connection string | `bolt://localhost:7687`  |
| `NEO4J_USERNAME` | Neo4j username          | `neo4j`                  |
| `NEO4J_PASSWORD` | Neo4j password          | `password`               |
| `REDIS_URL`      | Redis connection string | `redis://localhost:6379` |
| `JWT_SECRET`     | JWT signing secret      | Required                 |
| `API_RATE_LIMIT` | API requests per hour   | `1000`                   |

### Neo4j Configuration

```cypher
// Create indexes for better performance
CREATE INDEX entity_id_index FOR (e:Entity) ON (e.id);
CREATE INDEX entity_type_index FOR (e:Entity) ON (e.type);
CREATE INDEX relationship_type_index FOR ()-[r:RELATES_TO]-() ON (r.type);

// Create constraints
CREATE CONSTRAINT entity_id_unique FOR (e:Entity) REQUIRE e.id IS UNIQUE;
CREATE CONSTRAINT user_email_unique FOR (u:User) REQUIRE u.email IS UNIQUE;
```

## 🔐 Security

### Authentication & Authorization

- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- Attribute-based access control (ABAC)
- Multi-factor authentication support
- SSO integration (SAML, OAuth2)

### Data Protection

- End-to-end encryption for sensitive data
- Field-level encryption in database
- Secure API key management with auto-rotation
- Audit logs for all operations
- GDPR compliance with data anonymization

### Network Security

- Rate limiting on all endpoints
- CORS protection
- Helmet.js security headers
- Input validation and sanitization
- SQL/NoSQL injection prevention

## 📈 Monitoring & Observability

### Metrics

- Application performance metrics with Prometheus
- Custom business metrics dashboard
- Real-time health checks
- Error tracking with Sentry

### Logging

- Structured logging with Winston
- Centralized log aggregation with ELK stack
- Request tracing with OpenTelemetry
- Audit trail for compliance

### Alerting

- Real-time alerts for system anomalies
- Investigation-specific notifications
- Slack/Teams integration
- Email notifications

## 🚀 Deployment

### Docker Deployment

```bash
# Build and run
docker-compose up -d

# Scale services
docker-compose up -d --scale app=3

# Update deployment
docker-compose pull && docker-compose up -d
```

### Kubernetes Deployment

```bash
# Install with Helm
helm repo add intelgraph https://charts.intelgraph.com
helm install intelgraph intelgraph/intelgraph-platform

# Custom values
helm install intelgraph intelgraph/intelgraph-platform -f values.yaml
```

### AWS/Azure/GCP

- Terraform modules for cloud deployment
- Auto-scaling groups and load balancers
- Managed databases (RDS, CosmosDB, CloudSQL)
- Container orchestration (EKS, AKS, GKE)

## 🔌 API Documentation

### GraphQL API

- **Endpoint**: `/graphql`
- **Playground**: Available in development mode
- **Schema**: Auto-generated documentation

### REST API

- **Base URL**: `/api/v1`
- **Documentation**: OpenAPI/Swagger at `/api/docs`
- **Rate Limits**: 1000 requests/hour per user

### WebSocket API

- **Endpoint**: `/socket.io`
- **Events**: Real-time graph updates, comments, notifications
- **Authentication**: JWT token in connection auth

## 🧩 Plugins & Extensions

### Plugin Types

- **Transforms**: Data enrichment and processing
- **Visualizations**: Custom graph layouts and views
- **Connectors**: External data source integrations
- **Analytics**: Custom AI/ML algorithms

### Plugin Development

```javascript
// Plugin manifest
{
  "name": "custom-enrichment",
  "version": "1.0.0",
  "type": "transform",
  "entry": "index.js",
  "config": {
    "apiKey": "required",
    "endpoint": "optional"
  }
}

// Plugin implementation
export default class CustomEnrichment {
  constructor(config) {
    this.config = config;
  }

  async transform(entity) {
    // Custom enrichment logic
    return enrichedEntity;
  }
}
```

## 🤝 Contributing

### Development Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Standards

- ESLint configuration for JavaScript/TypeScript
- Prettier for code formatting
- Conventional Commits for commit messages
- Jest for testing with >90% coverage requirement

### Pull Request Process

- All tests must pass
- Code coverage must not decrease
- Documentation updates required for new features
- Two reviewer approvals required
- Automated security scanning must pass

## 📞 Support

### Documentation

- **API Docs**: [https://docs.intelgraph.com/api](https://docs.intelgraph.com/api)
- **User Guide**: [https://docs.intelgraph.com/guide](https://docs.intelgraph.com/guide)
- **Developer Docs**: [https://docs.intelgraph.com/dev](https://docs.intelgraph.com/dev)

### Community

- **Discord**: [https://discord.gg/intelgraph](https://discord.gg/intelgraph)
- **GitHub Issues**: [Report bugs and request features](https://github.com/your-org/intelgraph-platform/issues)
- **Stack Overflow**: Tag questions with `intelgraph`

### Enterprise Support

- **Email**: enterprise@intelgraph.com
- **Phone**: +1-555-INTEL-00
- **SLA**: 24/7 support with 4-hour response time

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Neo4j team for excellent graph database technology
- Cytoscape.js community for powerful graph visualization
- TensorFlow.js team for client-side machine learning
- All open-source contributors who made this possible

---

**Built with ❤️ for the intelligence community**

![IntelGraph Architecture](https://via.placeholder.com/800x400/0a0e1a/ffffff?text=IntelGraph+Platform+Architecture)
