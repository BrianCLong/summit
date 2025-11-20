# Risk Assessment Service

Risk assessment, monitoring, and analytics service for supply chain intelligence.

## Features

- Supplier risk assessment (financial, cyber, ESG, geopolitical)
- Third-party vendor risk management
- Compliance monitoring and screening
- Incident and alert management
- Predictive disruption analytics
- Risk reporting and dashboards

## API Endpoints

### Supplier Risk Assessment

- `POST /api/risk/supplier/:nodeId/assess` - Comprehensive risk assessment
- `GET /api/risk/supplier/:nodeId` - Get risk assessments
- `POST /api/risk/financial/:nodeId` - Assess financial health
- `POST /api/risk/cybersecurity/:nodeId` - Assess cybersecurity posture

### Vendor Management

- `POST /api/vendor/onboard` - Initiate vendor onboarding
- `POST /api/vendor/:vendorId/assess` - Conduct vendor assessment
- `POST /api/vendor/:vendorId/monitor` - Monitor vendor continuously

### Compliance

- `POST /api/compliance/:nodeId/check` - Check compliance status
- `POST /api/compliance/export-control/screen` - Export control screening
- `POST /api/compliance/conflict-minerals/:componentId` - Conflict minerals assessment
- `GET /api/compliance/regulatory-changes?jurisdiction=US` - Track regulatory changes

### Incident Management

- `POST /api/incidents` - Create incident
- `GET /api/incidents?status=open&severity=critical` - List incidents
- `GET /api/incidents/:id` - Get incident details
- `PUT /api/incidents/:id` - Update incident

### Alert Management

- `POST /api/alerts` - Create alert
- `GET /api/alerts?severity=high&resolved=false` - List alerts
- `POST /api/alerts/:id/acknowledge` - Acknowledge alert
- `POST /api/alerts/:id/resolve` - Resolve alert

### Predictive Analytics

- `GET /api/predictions/disruptions?nodeId=xxx` - Get disruption predictions
- `POST /api/predictions` - Create prediction

### Analytics & Reporting

- `GET /api/analytics/risk-summary` - Risk summary statistics
- `GET /api/analytics/incident-stats` - Incident statistics

## Running

```bash
# Development
pnpm dev

# Production
pnpm build
pnpm start
```

## Environment Variables

- `PORT` - Server port (default: 4021)
- `LOG_LEVEL` - Logging level (default: info)

## License

Proprietary - IntelGraph
