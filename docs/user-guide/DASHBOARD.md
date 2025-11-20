# Intelligence Dashboard and Real-Time Collaboration Platform

## Table of Contents

1. [Overview](#overview)
2. [Workspace Manager](#workspace-manager)
3. [Mission-Focused Dashboards](#mission-focused-dashboards)
4. [Case Management](#case-management)
5. [Alert and Notification System](#alert-and-notification-system)
6. [Reporting and Export](#reporting-and-export)
7. [Access Control](#access-control)
8. [Real-Time Collaboration](#real-time-collaboration)

## Overview

The IntelGraph Intelligence Dashboard is a production-ready platform for real-time intelligence analysis and collaboration. It provides:

- **Customizable Workspaces**: Drag-and-drop widget system for personalized analyst environments
- **Mission-Focused Dashboards**: Specialized views for threat monitoring, geospatial intelligence, timeline analysis, and network analysis
- **Case Management**: Complete investigation workflow with evidence tracking and chain of custody
- **Real-Time Collaboration**: Live presence, shared workspaces, and team annotations
- **Advanced Alerting**: Priority-based routing with multi-channel notifications
- **Comprehensive Reporting**: Automated report generation in PDF, DOCX, and PPTX formats
- **Enterprise Security**: Role-based access control with data classification and need-to-know compartmentalization

## Workspace Manager

### Creating a Workspace

The Workspace Manager allows analysts to create customizable dashboards with drag-and-drop widgets.

#### Getting Started

1. **Access Workspace Manager**: Navigate to the Dashboard section
2. **Create Dashboard**: Click the "+" button to create a new dashboard
3. **Add Widgets**: Click "Add Widget" to open the widget palette
4. **Arrange Layout**: Drag widgets to position them and resize as needed
5. **Save Workspace**: Click "Save" to persist your configuration

#### Available Widgets

| Widget | Description | Use Case |
|--------|-------------|----------|
| **Threat Monitor** | Real-time threat intelligence monitoring | Active threat tracking and IOC detection |
| **Geospatial View** | Geographic intelligence visualization | Location-based entity mapping |
| **Timeline Analysis** | Temporal event analysis | Chronological investigation tracking |
| **Network Graph** | Entity relationship visualization | Link analysis and pattern detection |
| **Alerts** | Active alerts and notifications | Priority-based alert management |
| **Investigation List** | Current investigation cases | Case portfolio management |
| **Activity Feed** | Team activity stream | Collaboration awareness |
| **Metrics** | Key performance indicators | System and investigation metrics |
| **Entity Search** | Quick entity lookup | Rapid entity discovery |
| **Team Presence** | Active team members | Real-time presence awareness |

#### Workspace Configuration

```javascript
// Example workspace configuration
const workspace = {
  name: "Threat Analysis Workspace",
  theme: "dark", // or "light"
  layout: "single", // or "split-horizontal", "split-vertical", "quad"
  dashboards: [
    {
      name: "Overview",
      widgets: [
        {
          type: "threat-monitor",
          layout: { x: 0, y: 0, w: 6, h: 4 }
        },
        {
          type: "network-graph",
          layout: { x: 6, y: 0, w: 6, h: 4 }
        }
      ]
    }
  ]
};
```

### Multi-Monitor Support

The platform supports multi-monitor configurations for operational environments:

1. **Primary Monitor**: Main analysis dashboard
2. **Secondary Monitor**: Geospatial or network visualization
3. **Tertiary Monitor**: Alert monitoring and team presence
4. **Quaternary Monitor**: Investigation documentation

Configure monitor layout in Workspace Settings.

### Dark Mode

Optimized for operational environments with low-light conditions:

- **Dark Theme**: Full dark mode with high contrast
- **Auto Mode**: Automatically switches based on time of day
- **Custom Themes**: Create custom color schemes

## Mission-Focused Dashboards

### Threat Monitoring Dashboard

Real-time threat intelligence monitoring and correlation.

**Features:**
- Live IOC (Indicators of Compromise) tracking
- Threat severity classification
- APT (Advanced Persistent Threat) correlation
- Multi-source threat feeds integration
- Automatic threat scoring

**Usage:**
```typescript
// Filter threats by severity
const criticalThreats = threats.filter(t => t.severity === 'critical');

// Subscribe to real-time threat updates
wsService.on('threat:new', (threat) => {
  console.log('New threat detected:', threat);
});
```

### Geospatial Intelligence View

Geographic visualization of entities, events, and intelligence data.

**Features:**
- Interactive map with multiple base layers
- Entity clustering and heat maps
- Geographic correlation analysis
- Route and movement tracking
- Temporal-spatial analysis

**Supported Map Types:**
- Terrain
- Satellite
- Hybrid
- Street Map

### Timeline Analysis

Temporal analysis of events and activities.

**Features:**
- Interactive timeline visualization
- Event correlation
- Pattern detection
- Temporal filtering
- Export to various formats

### Network Analysis

Entity relationship and link analysis.

**Features:**
- Force-directed graph layouts
- Centrality metrics
- Community detection
- Path analysis
- Graph export and sharing

## Case Management

### Creating an Investigation

```typescript
import { caseManagementService } from '@intelgraph/case-management';

const investigation = caseManagementService.createInvestigation({
  title: "APT Operation Analysis",
  description: "Investigation into suspected APT29 activity",
  classification: "SECRET",
  priority: "high",
  leadInvestigator: "user-123",
  createdBy: "user-123"
});
```

### Evidence Management

All evidence is tracked with complete chain of custody:

```typescript
// Add evidence
const evidence = caseManagementService.addEvidence(investigationId, {
  type: "document",
  name: "Network Capture 2024-01-15",
  description: "PCAP file from suspicious network activity",
  classification: "SECRET",
  source: "Network Monitoring System",
  collectedBy: "analyst-456",
  tags: ["network", "c2", "apt29"]
});

// Add chain of custody entry
caseManagementService.addChainOfCustodyEntry(
  investigationId,
  evidence.id,
  {
    action: "analyzed",
    userId: "analyst-789",
    userName: "Jane Smith",
    location: "Forensics Lab",
    notes: "Analyzed for malware signatures"
  }
);
```

### Investigation Workflow

Standard investigation stages:

1. **Initiation**: Case created and resources assigned
2. **Collection**: Evidence and intelligence gathering
3. **Analysis**: Data analysis and correlation
4. **Findings**: Documentation of discoveries
5. **Review**: Peer review and validation
6. **Reporting**: Final report generation
7. **Closure**: Case resolution and archival

### Findings and Hypotheses

```typescript
// Add finding
const finding = caseManagementService.addFinding(investigationId, {
  title: "C2 Infrastructure Identified",
  description: "Identified command and control server infrastructure",
  type: "correlation",
  confidence: "high",
  severity: "critical",
  evidenceIds: ["evidence-001", "evidence-002"],
  discoveredBy: "analyst-456",
  tags: ["c2", "infrastructure"]
});
```

### Audit Trail

Every action is logged for compliance and forensic purposes:

- User actions
- Evidence access
- Data modifications
- Report generation
- Sharing and distribution

## Alert and Notification System

### Alert Priority Levels

| Priority | Description | Channels | Response Time |
|----------|-------------|----------|---------------|
| **Critical** | Immediate threat requiring urgent action | All channels | Immediate |
| **High** | Significant threat requiring prompt attention | In-app, Email, Push, Slack | < 15 min |
| **Medium** | Notable event requiring review | In-app, Email | < 1 hour |
| **Low** | Informational alert | In-app | Best effort |

### Creating Alerts

```typescript
import { alertService } from '@intelgraph/realtime';

const alert = alertService.createAlert({
  type: "threat",
  priority: "critical",
  title: "APT Activity Detected",
  message: "Suspicious C2 traffic detected from internal network",
  source: "SIEM",
  targetRoles: ["analyst", "investigator"],
  actions: [
    {
      id: "view-details",
      label: "View Details",
      type: "link",
      url: "/threats/threat-001"
    },
    {
      id: "create-investigation",
      label: "Create Investigation",
      type: "callback",
      callback: "createInvestigation"
    }
  ]
});
```

### Notification Rules

Create custom routing rules for alert distribution:

```typescript
const rule = alertService.createRule({
  name: "Critical Threat Routing",
  description: "Route critical threats to senior analysts",
  enabled: true,
  conditions: {
    alertTypes: ["threat"],
    priorities: ["critical"]
  },
  routing: {
    roles: ["senior-analyst", "team-lead"]
  },
  channels: ["in-app", "email", "sms", "slack"]
});
```

### Alert Acknowledgment Workflow

1. **Alert Created**: System generates alert
2. **Notification Sent**: Alert routed to appropriate users/roles
3. **Acknowledged**: Analyst acknowledges receipt
4. **Investigation**: Analyst investigates and takes action
5. **Resolved**: Alert resolved with documentation

## Reporting and Export

### Report Templates

Available templates:

1. **Executive Summary**: High-level briefing for leadership
2. **Technical Analysis**: Detailed technical findings
3. **Briefing Deck**: PowerPoint-style presentation
4. **Forensic Report**: Chain of custody and evidence analysis

### Generating Reports

```typescript
import { reportingService } from '@intelgraph/reporting';

// Executive summary
const executivePDF = await reportingService.generateExecutiveSummary(
  investigation,
  {
    format: 'pdf',
    includeClassification: true,
    watermark: 'CONFIDENTIAL'
  }
);

// Technical report
const technicalReport = await reportingService.generateTechnicalReport(
  investigation,
  {
    format: 'docx',
    includeTableOfContents: true,
    includeAppendices: true
  }
);

// Briefing deck
const briefing = await reportingService.generateBriefingDeck(
  investigation,
  {
    format: 'pptx'
  }
);
```

### Export Formats

- **PDF**: Portable Document Format with security features
- **DOCX**: Microsoft Word format for editing
- **PPTX**: PowerPoint presentation format
- **HTML**: Web-based report
- **Markdown**: Plain text markup for version control

### Report Security

All reports include:
- Classification markings
- Distribution limitations
- Watermarks
- Password protection (optional)
- Expiration dates

## Access Control

### Role-Based Access Control (RBAC)

#### System Roles

| Role | Permissions | Max Classification |
|------|-------------|-------------------|
| **Administrator** | Full system access | TS/SCI |
| **Investigator** | Lead investigations, manage evidence | SECRET |
| **Analyst** | Analyze data, create reports | SECRET |
| **Viewer** | Read-only access | CONFIDENTIAL |

#### Custom Roles

Create custom roles for specific needs:

```typescript
import { accessControlService } from '@intelgraph/collaboration';

const customRole = accessControlService.createRole({
  name: "Threat Hunter",
  description: "Specialized threat hunting role",
  permissions: [
    'investigations.create',
    'investigations.read',
    'evidence.read',
    'entities.read',
    'entities.create',
    'alerts.read'
  ],
  maxClassification: 'SECRET'
});
```

### Data Classification

Classification levels (in ascending order):

1. **UNCLASSIFIED**: Public information
2. **CONFIDENTIAL**: Limited distribution
3. **SECRET**: Requires clearance
4. **TOP SECRET**: Highest sensitivity
5. **TS/SCI**: Compartmented information

### Need-to-Know Compartmentalization

Grant access to specific compartments:

```typescript
// Grant compartment access
accessControlService.grantCompartmentAccess(
  userId,
  "ALPHA-PROJECT",
  grantedBy,
  "Required for current investigation",
  expiresAt // Optional expiration
);

// Check access
const hasAccess = accessControlService.hasNeedToKnow(
  userId,
  "ALPHA-PROJECT"
);
```

### Audit Logging

All access is logged:

```typescript
// Access logs are automatically created
const logs = accessControlService.getAccessLogs(userId, 100);

// Resource-specific logs
const resourceLogs = accessControlService.getResourceAccessLogs(
  'investigation',
  'inv-123',
  50
);
```

## Real-Time Collaboration

### WebSocket Connection

```typescript
import { wsService } from '../services/websocket';

// Connect with authentication
await wsService.connect(authToken);

// Subscribe to events
wsService.on('presence:update', (data) => {
  console.log('User presence updated:', data);
});

wsService.on('graph:update', (update) => {
  console.log('Graph updated:', update);
});

wsService.on('notification', (notification) => {
  console.log('New notification:', notification);
});
```

### Shared Workspaces

Collaborate in real-time with team members:

- **Live Presence**: See who's online and what they're working on
- **Shared Cursors**: View team members' cursor positions
- **Live Annotations**: Add comments and highlights visible to all
- **Co-editing**: Simultaneous editing with conflict resolution

### Team Presence

Monitor team activity in real-time:

```typescript
// Update your presence
wsService.updatePresence({
  status: 'active',
  location: {
    route: '/investigations/inv-123',
    investigationId: 'inv-123'
  }
});

// Listen for presence updates
wsService.on('presence:join', (data) => {
  console.log(`${data.userId} joined`);
});
```

### Chat Integration

Integrate with Slack or Microsoft Teams:

- Direct alerts to channels
- Share findings and reports
- Coordinate investigations
- Request reviews and approvals

## Best Practices

### Security

1. **Always classify data appropriately**
2. **Use need-to-know compartmentalization**
3. **Review access logs regularly**
4. **Rotate credentials periodically**
5. **Enable multi-factor authentication**

### Investigation Management

1. **Document all findings immediately**
2. **Maintain chain of custody for all evidence**
3. **Use standardized templates**
4. **Collaborate with team members**
5. **Regular peer reviews**

### Performance

1. **Use filters to limit data displayed**
2. **Archive old investigations**
3. **Optimize dashboard layouts**
4. **Use appropriate refresh intervals**
5. **Monitor system metrics**

### Collaboration

1. **Share workspaces for team investigations**
2. **Use annotations for key findings**
3. **Acknowledge alerts promptly**
4. **Provide context in notes**
5. **Use chat for urgent communications**

## Troubleshooting

### Connection Issues

If WebSocket connection fails:

1. Check network connectivity
2. Verify authentication token
3. Check firewall settings
4. Review browser console for errors
5. Contact system administrator

### Performance Issues

If dashboard is slow:

1. Reduce number of widgets
2. Increase refresh intervals
3. Clear browser cache
4. Check system resources
5. Optimize queries

### Access Denied Errors

If you receive access denied:

1. Verify your clearance level
2. Check need-to-know access
3. Request additional permissions
4. Contact investigation lead
5. Review audit logs

## Support

For additional assistance:

- **Documentation**: `/docs`
- **Help System**: Press `?` for keyboard shortcuts
- **System Status**: `/status`
- **Contact Support**: support@intelgraph.com

## Version History

- **v1.0.0** (2024-01-15): Initial release
  - Customizable workspace manager
  - Mission-focused dashboards
  - Case management system
  - Real-time collaboration
  - Alert and notification system
  - Reporting and export
  - Access control and RBAC
