# @summit/reporting

Comprehensive intelligence product generation and reporting platform for creating professional intelligence deliverables.

## Features

- **Report Generation**: Core engine for generating intelligence reports from templates
- **Workflow Management**: Approval workflows, peer review, and quality assurance
- **Analytics Tracking**: Usage metrics, engagement tracking, and feedback collection
- **Multi-format Support**: PDF, DOCX, PPTX, HTML, Excel, and more
- **Classification Handling**: Security markings, caveats, and dissemination controls
- **Natural Language Generation**: Automated summaries, findings, and recommendations

## Installation

```bash
pnpm add @summit/reporting
```

## Quick Start

```typescript
import { ReportGenerator } from '@summit/reporting';

const generator = new ReportGenerator({
  enableNLG: true,
  enableAutoSummary: true,
  enableChartGeneration: true
});

// Register a template
generator.registerTemplate(myTemplate);

// Generate a report
const report = await generator.generateReport({
  templateId: 'threat-assessment-v1',
  data: {
    threatActor: 'APT28',
    targets: ['Government', 'Military'],
    timeline: eventsData
  },
  format: 'PDF',
  metadata: {
    title: 'APT28 Threat Assessment',
    classification: {
      level: 'SECRET',
      caveats: ['NOFORN']
    },
    author: 'Analyst Name'
  }
});
```

## Report Types

The platform supports multiple intelligence product types:

- **Situational Awareness Reports**: Current operational picture
- **Threat Assessments**: Actor capabilities and intentions
- **Strategic Intelligence**: Long-term trends and forecasts
- **Tactical Intelligence**: Immediate operational intelligence
- **Indications & Warnings**: Early warning intelligence
- **Profile Dossiers**: Entity and actor profiles
- **Network Analysis**: Relationship and network reports
- **OSINT Reports**: Open source intelligence products

## Workflow Management

```typescript
import { WorkflowManager } from '@summit/reporting';

const workflowManager = new WorkflowManager();

// Create workflow
const workflow = workflowManager.createWorkflow(reportId, [
  { name: 'Draft Creation', assignee: 'analyst1' },
  { name: 'Peer Review', assignee: 'analyst2', requiredApprovals: 1 },
  { name: 'Quality Assurance', assignee: 'qa-team' },
  { name: 'Approval', assignee: 'manager', requiredApprovals: 1 }
]);

// Complete step
workflowManager.completeStep(workflow.id, 'analyst1', 'Draft completed');

// Add comments
workflowManager.addComment(
  reportId,
  'analyst2',
  'Please clarify the attribution section',
  'Section 3',
  42
);
```

## Analytics

```typescript
import { AnalyticsTracker } from '@summit/reporting';

const tracker = new AnalyticsTracker();

// Track views
tracker.trackView({
  reportId: 'report-123',
  userId: 'user-456',
  timestamp: new Date(),
  duration: 180,
  sectionsViewed: ['executive-summary', 'key-findings']
});

// Track downloads
tracker.trackDownload({
  reportId: 'report-123',
  userId: 'user-456',
  timestamp: new Date(),
  format: 'PDF'
});

// Get analytics
const analytics = tracker.getAnalytics('report-123');
console.log(`Views: ${analytics.views}, Downloads: ${analytics.downloads}`);
```

## Classification Handling

```typescript
const classifiedReport = {
  metadata: {
    classification: {
      level: 'TOP_SECRET',
      caveats: ['SCI', 'NOFORN'],
      sciControls: ['TK', 'SI'],
      disseminationControls: ['ORCON', 'IMCON'],
      releasability: ['USA'],
      derivedFrom: 'Multiple Sources',
      declassifyOn: '20450101'
    }
  }
};
```

## License

MIT
