# @summit/templates

Template management, storage, versioning, and rendering system for intelligence reports and briefings.

## Features

- **Template Library**: Pre-built templates for various intelligence products
- **Template Designer**: Create and customize report templates
- **Variable Placeholders**: Dynamic content insertion with Handlebars/Mustache
- **Conditional Content**: Show/hide sections based on data
- **Template Inheritance**: Extend and customize existing templates
- **Version Control**: Track template changes over time
- **Template Marketplace**: Share and discover templates

## Installation

```bash
pnpm add @summit/templates
```

## Quick Start

```typescript
import { TemplateManager } from '@summit/templates';

const manager = new TemplateManager('handlebars');

// Create a template
const template = manager.createTemplate({
  name: 'Threat Assessment Template',
  description: 'Standard threat assessment report',
  format: 'DOCX',
  content: `
    # {{title}}

    **Classification**: {{classification.level}}
    **Date**: {{date}}

    ## Executive Summary
    {{executiveSummary}}

    ## Threat Actor: {{threatActor.name}}

    {{#if threatActor.aliases}}
    **Also known as**: {{join threatActor.aliases ", "}}
    {{/if}}

    ## Capabilities
    {{#each capabilities}}
    - {{this}}
    {{/each}}
  `,
  variables: [
    { name: 'title', type: 'STRING', required: true },
    { name: 'threatActor', type: 'OBJECT', required: true },
    { name: 'capabilities', type: 'ARRAY', required: false, defaultValue: [] }
  ],
  sections: [],
  version: '1.0.0',
  category: 'threat-intelligence',
  tags: ['threat', 'assessment', 'actor'],
  createdBy: 'analyst-1',
  isPublic: true
});

// Render template
const rendered = manager.renderTemplate(template.id, {
  title: 'APT28 Threat Assessment',
  date: new Date().toISOString(),
  classification: { level: 'SECRET' },
  executiveSummary: 'This report assesses the capabilities...',
  threatActor: {
    name: 'APT28',
    aliases: ['Fancy Bear', 'Sofacy', 'Pawn Storm']
  },
  capabilities: [
    'Advanced persistent threats',
    'Spear phishing campaigns',
    'Zero-day exploitation'
  ]
});
```

## Template Variables

Templates support multiple variable types:

```typescript
const variables: TemplateVariable[] = [
  {
    name: 'title',
    type: 'STRING',
    required: true,
    description: 'Report title'
  },
  {
    name: 'confidence',
    type: 'NUMBER',
    required: false,
    defaultValue: 50,
    validation: { min: 0, max: 100 }
  },
  {
    name: 'reportDate',
    type: 'DATE',
    required: true
  },
  {
    name: 'includeAppendix',
    type: 'BOOLEAN',
    required: false,
    defaultValue: false
  },
  {
    name: 'targets',
    type: 'ARRAY',
    required: false,
    defaultValue: []
  }
];
```

## Template Inheritance

Extend existing templates:

```typescript
// Clone a template
const cloned = manager.cloneTemplate(
  'base-template-id',
  'My Custom Template',
  'user-123'
);

// Extend with modifications
const extended = manager.extendTemplate(
  'base-template-id',
  {
    name: 'Extended Threat Assessment',
    sections: [
      ...parentTemplate.sections,
      {
        id: 'new-section',
        name: 'Custom Analysis',
        title: 'Additional Analysis',
        content: '{{customAnalysis}}',
        type: 'TEXT',
        order: 10
      }
    ]
  },
  'user-123'
);
```

## Version Control

```typescript
import { TemplateStorage } from '@summit/templates';

const storage = new TemplateStorage();

// Save version
storage.saveVersion(
  template,
  'Added new threat indicators section',
  'analyst-1'
);

// Get version history
const history = storage.getVersionHistory(template.id);

// Restore previous version
const restored = storage.restoreVersion(template.id, '1.2.0');

// Compare versions
const diff = storage.compareVersions(template.id, '1.0.0', '2.0.0');
console.log('Added:', diff.added);
console.log('Removed:', diff.removed);
```

## Template Styling

```typescript
const styling: TemplateStyling = {
  theme: 'professional',
  colors: {
    primary: '#003366',
    secondary: '#6699CC',
    accent: '#FF6600',
    text: '#333333',
    background: '#FFFFFF'
  },
  fonts: {
    heading: 'Arial Black, sans-serif',
    body: 'Arial, sans-serif',
    code: 'Courier New, monospace'
  },
  logo: 'https://example.com/logo.png',
  headerFooter: true,
  pageNumbers: true,
  toc: true,
  coverPage: true
};
```

## License

MIT
