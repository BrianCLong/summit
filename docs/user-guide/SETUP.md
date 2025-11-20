# Intelligence Dashboard Setup Guide

## Installation

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- PostgreSQL >= 14
- Redis (optional, for WebSocket scaling)

### Package Installation

The intelligence dashboard system consists of several packages:

```bash
# Install all dependencies
pnpm install

# Build packages
cd packages/case-management && pnpm run build
cd packages/realtime && pnpm run build
cd packages/reporting && pnpm run build
cd packages/collaboration && pnpm run build
```

### Client Setup

```bash
cd client
pnpm install
pnpm run build
```

### Server Setup

```bash
cd server
pnpm install
pnpm run build
```

## Configuration

### Environment Variables

#### Client (.env)

```env
VITE_API_URL=http://localhost:4000
VITE_WS_URL=ws://localhost:4000
```

#### Server (.env)

```env
PORT=4000
NODE_ENV=production

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/intelgraph

# Redis (optional)
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-secret-key-here
JWT_EXPIRATION=24h

# CORS
CORS_ORIGIN=http://localhost:3000

# WebSocket
WS_PATH=/ws

# File Storage
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=100MB

# Email (for notifications)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=notifications@example.com
SMTP_PASS=your-password

# Slack Integration (optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Report Generation
REPORT_STORAGE_PATH=./reports
REPORT_EXPIRATION_DAYS=7
```

## Running the System

### Development Mode

```bash
# Terminal 1: Start server
cd server
pnpm run dev

# Terminal 2: Start client
cd client
pnpm run dev
```

### Production Mode

```bash
# Build everything
pnpm run build

# Start server
cd server
pnpm start

# Serve client (use nginx or similar)
cd client
pnpm run preview
```

## Database Setup

### Initial Migration

```bash
cd server
pnpm run db:migrate
```

### Seed Data (optional)

```bash
# Small dataset for testing
pnpm run seed:small

# Demo data
pnpm run seed:demo
```

## WebSocket Configuration

The system uses Socket.io for real-time communication. For production deployments:

### Single Server

Default configuration works out of the box.

### Multiple Servers (Load Balanced)

Use Redis adapter for WebSocket synchronization:

```typescript
// server/src/realtime/collab.ts
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';

const pubClient = new Redis(process.env.REDIS_URL);
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));
```

## Security Configuration

### SSL/TLS

For production, use HTTPS and WSS:

```nginx
server {
    listen 443 ssl http2;
    server_name intelgraph.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
    }

    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
    }

    location /ws {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### Authentication

Configure JWT authentication in server:

```typescript
// server/src/config/auth.ts
export const authConfig = {
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiration: process.env.JWT_EXPIRATION || '24h',
  passwordMinLength: 12,
  mfaEnabled: true,
  sessionTimeout: 3600000, // 1 hour
};
```

## Package Usage

### Case Management

```typescript
import { caseManagementService } from '@intelgraph/case-management';

// Create investigation
const investigation = caseManagementService.createInvestigation({
  title: "Operation Analysis",
  description: "Intelligence investigation",
  classification: "SECRET",
  priority: "high",
  leadInvestigator: "user-123",
  createdBy: "user-123"
});

// Add evidence
const evidence = caseManagementService.addEvidence(investigation.id, {
  type: "document",
  name: "Evidence Item",
  classification: "SECRET",
  source: "Collection System",
  collectedBy: "user-123"
});
```

### Real-time Alerts

```typescript
import { alertService } from '@intelgraph/realtime';

// Create alert
const alert = alertService.createAlert({
  type: "threat",
  priority: "critical",
  title: "Threat Detected",
  message: "Suspicious activity detected",
  source: "SIEM",
  targetRoles: ["analyst"]
});

// Acknowledge alert
alertService.acknowledgeAlert(alert.id, "user-123");
```

### Reporting

```typescript
import { reportingService } from '@intelgraph/reporting';

// Generate executive summary
const report = await reportingService.generateExecutiveSummary(
  investigation,
  { format: 'pdf' }
);

// Generate technical report
const techReport = await reportingService.generateTechnicalReport(
  investigation,
  {
    format: 'docx',
    includeAppendices: true
  }
);
```

### Access Control

```typescript
import { accessControlService } from '@intelgraph/collaboration';

// Create user
const user = accessControlService.createUser({
  email: "analyst@example.com",
  name: "Jane Analyst",
  roles: ["role-analyst"],
  clearanceLevel: "SECRET"
});

// Check permission
const canCreate = accessControlService.hasPermission(
  user.id,
  'investigations.create'
);

// Grant compartment access
accessControlService.grantCompartmentAccess(
  user.id,
  "ALPHA-PROJECT",
  "admin-123",
  "Required for investigation"
);
```

## Monitoring

### Health Checks

```bash
# API health
curl http://localhost:4000/health

# WebSocket health
curl http://localhost:4000/ws/health
```

### Metrics

System exposes Prometheus metrics at `/metrics`:

- `websocket_connections_total`
- `investigations_total`
- `alerts_created_total`
- `reports_generated_total`

### Logging

Logs are written to:
- `logs/app.log` - Application logs
- `logs/access.log` - Access logs
- `logs/error.log` - Error logs
- `logs/audit.log` - Audit trail

## Troubleshooting

### WebSocket Connection Fails

1. Check CORS configuration
2. Verify WebSocket path (`/realtime`)
3. Check firewall rules
4. Verify authentication token

### Database Connection Issues

1. Verify DATABASE_URL
2. Check PostgreSQL is running
3. Verify network connectivity
4. Check credentials

### Build Errors

```bash
# Clean and rebuild
rm -rf node_modules dist
pnpm install
pnpm run build
```

## Performance Tuning

### Database

```sql
-- Add indexes for common queries
CREATE INDEX idx_investigations_status ON investigations(status);
CREATE INDEX idx_evidence_investigation ON evidence(investigation_id);
CREATE INDEX idx_alerts_priority ON alerts(priority, created_at DESC);
```

### Redis Caching

```typescript
// Cache frequently accessed data
const cache = new Redis(process.env.REDIS_URL);
await cache.setex(`investigation:${id}`, 3600, JSON.stringify(investigation));
```

### WebSocket Scaling

For high-load environments:

1. Use Redis adapter for multi-server deployments
2. Increase WebSocket connection limits
3. Implement connection pooling
4. Use sticky sessions in load balancer

## Backup and Recovery

### Database Backup

```bash
# Backup
pg_dump intelgraph > backup.sql

# Restore
psql intelgraph < backup.sql
```

### File Storage Backup

```bash
# Backup uploads and reports
tar -czf storage-backup.tar.gz uploads/ reports/
```

## Support

For issues and questions:

- GitHub Issues: https://github.com/your-org/intelgraph/issues
- Documentation: /docs
- Email: support@intelgraph.com
