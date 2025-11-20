# Advanced Reporting and Intelligence Products Platform - Complete Guide

## Overview

The Advanced Reporting and Intelligence Products Platform provides comprehensive capabilities for generating, managing, and disseminating professional intelligence deliverables. This system integrates automated report generation, natural language generation, multi-format export, classification handling, and secure dissemination.

## Architecture

### Core Components

1. **@summit/reporting** - Core report generation engine
2. **@summit/templates** - Template management and rendering
3. **@summit/nlg** - Natural language generation
4. **@summit/briefing-generation** - Slide deck creation
5. **@summit/classification** - Classification marking system
6. **@summit/dissemination** - Distribution and tracking
7. **@summit/export-formats** - Multi-format export

### Backend Services

1. **report-generator** (Port 3010) - Report generation API
2. **publication-service** (Port 3011) - Workflow and dissemination API

## Getting Started

### Installation

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm -w -r run build

# Start services
cd services/report-generator && pnpm dev
cd services/publication-service && pnpm dev
```

### Quick Start Example

```typescript
import { ReportGenerator } from '@summit/reporting';
import { TemplateManager } from '@summit/templates';
import { NarrativeGenerator } from '@summit/nlg';

// Initialize services
const generator = new ReportGenerator({
  enableNLG: true,
  enableAutoSummary: true
});

const templateManager = new TemplateManager('handlebars');

// Create a template
const template = templateManager.createTemplate({
  name: 'Threat Assessment',
  format: 'DOCX',
  content: `
    # {{title}}

    **Classification**: {{classification.level}}
    **Date**: {{date}}

    ## Executive Summary
    {{executiveSummary}}

    ## Threat Actor Profile
    **Name**: {{threatActor.name}}
    **Aliases**: {{join threatActor.aliases ", "}}

    ## Capabilities
    {{#each capabilities}}
    - {{this}}
    {{/each}}
  `,
  variables: [
    { name: 'title', type: 'STRING', required: true },
    { name: 'threatActor', type: 'OBJECT', required: true }
  ],
  sections: [],
  version: '1.0.0',
  category: 'threat-intelligence',
  tags: ['threat', 'assessment'],
  createdBy: 'system',
  isPublic: true
});

// Register template
generator.registerTemplate(template);

// Generate report
const report = await generator.generateReport({
  templateId: template.id,
  data: {
    title: 'APT28 Threat Assessment',
    date: new Date().toISOString(),
    classification: {
      level: 'SECRET',
      caveats: ['NOFORN']
    },
    threatActor: {
      name: 'APT28',
      aliases: ['Fancy Bear', 'Sofacy', 'Pawn Storm']
    },
    capabilities: [
      'Advanced persistent threats',
      'Spear phishing',
      'Zero-day exploitation'
    ]
  },
  format: 'PDF',
  metadata: {
    author: 'Intelligence Team',
    classification: {
      level: 'SECRET',
      caveats: ['NOFORN']
    }
  }
});

console.log('Report generated:', report.metadata.id);
```

## Report Generation Workflow

### 1. Template Creation

Templates define the structure and styling of reports:

```typescript
import { TemplateManager } from '@summit/templates';

const manager = new TemplateManager('handlebars');

const template = manager.createTemplate({
  name: 'Strategic Intelligence Report',
  description: 'Long-form strategic intelligence analysis',
  format: 'PDF',
  content: templateContent,
  variables: [
    { name: 'reportTitle', type: 'STRING', required: true },
    { name: 'timeframe', type: 'STRING', required: true },
    { name: 'regions', type: 'ARRAY', required: false }
  ],
  sections: [
    {
      id: 'exec-summary',
      name: 'Executive Summary',
      title: 'Executive Summary',
      content: '{{executiveSummary}}',
      type: 'TEXT',
      order: 0
    },
    {
      id: 'key-findings',
      name: 'Key Findings',
      title: 'Key Findings',
      content: '{{#each findings}}• {{this}}\n{{/each}}',
      type: 'TEXT',
      order: 1
    }
  ],
  styling: {
    theme: 'professional',
    colors: {
      primary: '#003366',
      secondary: '#6699CC'
    },
    fonts: {
      heading: 'Arial Black',
      body: 'Arial'
    },
    headerFooter: true,
    pageNumbers: true,
    toc: true
  },
  version: '1.0.0',
  category: 'strategic',
  tags: ['strategic', 'analysis', 'long-form'],
  createdBy: 'template-designer',
  isPublic: false
});
```

### 2. Report Generation

Generate reports from templates with dynamic data:

```typescript
import { ReportGenerator } from '@summit/reporting';

const generator = new ReportGenerator({
  enableNLG: true,
  enableAutoSummary: true,
  enableChartGeneration: true,
  enableVisualization: true
});

const report = await generator.generateReport({
  templateId: 'strategic-intel-template-id',
  data: {
    reportTitle: 'Asia-Pacific Cyber Threat Landscape Q1 2025',
    timeframe: 'Q1 2025',
    regions: ['East Asia', 'Southeast Asia', 'South Asia'],
    findings: [
      'Significant increase in APT activity targeting financial sector',
      'Emergence of new ransomware variants',
      'State-sponsored operations against critical infrastructure'
    ],
    executiveSummary: 'This report analyzes...'
  },
  format: 'PDF',
  metadata: {
    title: 'Asia-Pacific Cyber Threat Landscape Q1 2025',
    author: 'Regional Threat Analysis Team',
    classification: {
      level: 'SECRET',
      caveats: ['NOFORN'],
      derivedFrom: 'Multiple Sources',
      declassifyOn: '20450101'
    },
    keywords: ['cyber', 'APT', 'Asia-Pacific'],
    geographicFocus: ['Asia-Pacific']
  },
  options: {
    includeExecutiveSummary: true,
    includeKeyFindings: true,
    includeRecommendations: true,
    includeCharts: true,
    language: 'en',
    pageSize: 'LETTER',
    orientation: 'PORTRAIT'
  }
});
```

### 3. Natural Language Generation

Automatically generate narratives, summaries, and findings:

```typescript
import { NarrativeGenerator, TextSummarizer } from '@summit/nlg';

const narrativeGen = new NarrativeGenerator();
const summarizer = new TextSummarizer();

// Generate narrative
const narrative = await narrativeGen.generateNarrative({
  data: {
    threatActor: 'APT29',
    severity: 'high',
    targets: ['Government', 'Healthcare', 'Research']
  },
  context: 'threat-assessment',
  tone: 'formal',
  audience: 'executives',
  purpose: 'threat-assessment'
});

// Generate executive summary
const summary = await summarizer.generateExecutiveSummary(
  longReportText,
  {
    style: 'abstractive',
    maxLength: 500,
    includeKeywords: true
  }
);

// Generate findings
const findings = await narrativeGen.generateFindings(analysisData, 5);

// Generate recommendations
const recommendations = await narrativeGen.generateRecommendations(
  assessmentData,
  'threat-mitigation'
);
```

### 4. Workflow Management

Implement approval workflows:

```typescript
import { WorkflowManager } from '@summit/reporting';

const workflowMgr = new WorkflowManager();

// Create workflow
const workflow = workflowMgr.createWorkflow(report.metadata.id, [
  {
    name: 'Analyst Review',
    assignee: 'senior-analyst-1',
    requiredApprovals: 1
  },
  {
    name: 'Quality Assurance',
    assignee: 'qa-team',
    requiredApprovals: 1
  },
  {
    name: 'Management Approval',
    assignee: 'intelligence-manager',
    requiredApprovals: 2
  },
  {
    name: 'Publication',
    assignee: 'publisher'
  }
]);

// Add comments
workflowMgr.addComment(
  report.metadata.id,
  'analyst-2',
  'Attribution section needs additional sourcing',
  'Section 3',
  42
);

// Complete step
workflowMgr.completeStep(
  workflow.id,
  'senior-analyst-1',
  'Review complete, approved for QA'
);

// Add approval
workflowMgr.addApproval(
  workflow.id,
  workflow.steps[2].id,
  'manager-1',
  true,
  'Approved for publication'
);
```

### 5. Dissemination

Distribute reports securely:

```typescript
import { DistributionManager } from '@summit/dissemination';

const distMgr = new DistributionManager();

// Create distribution list
const distList = distMgr.createDistributionList({
  name: 'Cyber Threat Intel Recipients',
  description: 'Distribution list for cyber threat intelligence',
  recipients: [
    {
      userId: 'user-1',
      email: 'analyst1@example.com',
      name: 'Senior Analyst',
      clearanceLevel: 'SECRET'
    }
  ],
  autoDistribute: true,
  conditions: {
    minClassification: 'CONFIDENTIAL',
    maxClassification: 'SECRET',
    tags: ['cyber', 'threat-intelligence']
  }
});

// Distribute report
const distRecord = distMgr.distribute(
  report.metadata.id,
  'user-1',
  'EMAIL',
  {
    watermark: true,
    expiresIn: 30,
    recipientEmail: 'analyst1@example.com'
  }
);

// Track access
distMgr.trackAccess(
  distRecord.trackingId,
  '192.168.1.100',
  'Mozilla/5.0...'
);

// Get statistics
const stats = distMgr.getDistributionStats(report.metadata.id);
console.log(`Distributed to ${stats.totalDistributed} recipients`);
console.log(`Accessed by ${stats.totalAccessed} users`);
console.log(`Downloaded ${stats.totalDownloaded} times`);
```

## API Reference

### Report Generator Service (Port 3010)

#### Generate Report
```
POST /api/reports/generate
```

#### Track View
```
POST /api/reports/:id/view
```

#### Track Download
```
POST /api/reports/:id/download
```

#### Get Analytics
```
GET /api/reports/:id/analytics
```

#### Create Template
```
POST /api/templates
```

#### List Templates
```
GET /api/templates
```

### Publication Service (Port 3011)

#### Create Workflow
```
POST /api/workflows
```

#### Complete Step
```
POST /api/workflows/:id/complete
```

#### Distribute Report
```
POST /api/dissemination/distribute
```

#### Get Distribution Stats
```
GET /api/dissemination/:reportId/stats
```

## Classification Handling

### Marking Reports

```typescript
import { ClassificationMarker } from '@summit/classification';

const marker = new ClassificationMarker();

const classification = {
  level: 'TOP_SECRET',
  caveats: ['NOFORN'],
  sciControls: ['TK', 'SI'],
  disseminationControls: ['ORCON'],
  releasability: ['USA'],
  derivedFrom: 'Multiple Intelligence Sources',
  declassifyOn: '20450101'
};

// Generate banner
const banner = marker.generateBanner(classification);
console.log(banner); // "TOP_SECRET//TK/SI//NOFORN//ORCON"

// Validate marking
const validation = marker.validateMarking(classification);
if (!validation.valid) {
  console.error('Invalid classification:', validation.errors);
}

// Compare classifications
const isHigher = marker.compareClassifications('SECRET', 'CONFIDENTIAL');
console.log(isHigher > 0); // true
```

## Export Formats

### PDF Export

```typescript
import { PDFExporter } from '@summit/export-formats';

const exporter = new PDFExporter();

const pdf = await exporter.exportToPDF(report, {
  pageSize: 'LETTER',
  orientation: 'PORTRAIT',
  includeClassificationBanner: true,
  includePageNumbers: true,
  includeTOC: true,
  watermark: 'DRAFT'
});

// Save or send PDF
fs.writeFileSync('report.pdf', pdf);
```

## Analytics and Metrics

```typescript
import { AnalyticsTracker } from '@summit/reporting';

const tracker = new AnalyticsTracker();

// Initialize tracking
tracker.initializeAnalytics(reportId);

// Track engagement
tracker.trackView({
  reportId,
  userId: 'user-123',
  timestamp: new Date(),
  duration: 320,
  sectionsViewed: ['executive-summary', 'key-findings', 'recommendations']
});

// Get analytics
const analytics = tracker.getAnalytics(reportId);
console.log('Total views:', analytics.views);
console.log('Unique viewers:', analytics.uniqueViewers);
console.log('Average time:', analytics.averageTimeSpent);

// Get engagement metrics
const engagement = tracker.getEngagementMetrics(reportId);
console.log('View rate:', engagement.viewRate);
console.log('Download rate:', engagement.downloadRate);
console.log('Average rating:', engagement.averageRating);
```

## Best Practices

### 1. Template Design
- Use semantic variable names
- Include comprehensive metadata
- Design for multiple output formats
- Test with various data sets

### 2. Classification
- Always validate classification markings
- Use proper portion marking
- Include source attribution
- Set appropriate declassification dates

### 3. Workflows
- Define clear approval stages
- Set required approver counts
- Enable commenting and collaboration
- Track all changes

### 4. Dissemination
- Use distribution lists for regular recipients
- Enable watermarking for sensitive reports
- Set expiration dates
- Track access and downloads

### 5. Analytics
- Monitor engagement metrics
- Collect user feedback
- Track popular report types
- Analyze usage patterns

## Security Considerations

1. **Access Control**: Implement role-based access control
2. **Encryption**: Encrypt reports at rest and in transit
3. **Audit Logging**: Log all access and modifications
4. **Classification Enforcement**: Validate clearance levels
5. **Watermarking**: Apply dynamic watermarks to distributed reports
6. **Expiration**: Set time-based access expiration

## Troubleshooting

### Common Issues

**Templates not rendering**
- Check variable names match data keys
- Validate template syntax
- Ensure all required variables are provided

**Classification validation errors**
- Verify SCI controls are only on TS/TS-SCI
- Check for conflicting markings (NOFORN + releasability)
- Validate caveat syntax

**Export failures**
- Ensure all dependencies are installed
- Check file size limits
- Verify export format is supported

## Support

For issues, questions, or contributions:
- GitHub Issues: https://github.com/your-org/summit/issues
- Documentation: https://docs.summit.example.com
- Email: support@summit.example.com

## License

MIT
