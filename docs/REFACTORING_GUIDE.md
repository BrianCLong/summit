# Code Refactoring Guide

This guide provides practical examples for refactoring common code quality issues found in the IntelGraph Platform codebase.

## Table of Contents

1. [Breaking Down Large Files](#breaking-down-large-files)
2. [Refactoring God Objects](#refactoring-god-objects)
3. [Reducing Complexity](#reducing-complexity)
4. [Eliminating Code Duplication](#eliminating-code-duplication)
5. [Reducing Function Length](#reducing-function-length)
6. [Managing Technical Debt](#managing-technical-debt)
7. [Before & After Examples](#before--after-examples)

---

## Breaking Down Large Files

### Problem: Files Over 500 Lines

**Identified Issues:**
- `EnhancedGraphExplorer.jsx` - 2,474 lines
- `ThreatHuntingDarkWeb.tsx` - 2,064 lines
- `VisualizationService.js` - 2,032 lines

### Strategy 1: Extract by Feature

**Before:**
```javascript
// client/src/components/graph/EnhancedGraphExplorer.jsx (2,474 lines)

const EnhancedGraphExplorer = () => {
  // 100+ lines of state management
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [filters, setFilters] = useState({});
  const [layout, setLayout] = useState('force');
  // ... 50 more state variables

  // 200+ lines of handlers
  const handleNodeClick = (node) => { /* ... */ };
  const handleEdgeClick = (edge) => { /* ... */ };
  const handleFilter = (filter) => { /* ... */ };
  // ... 30 more handlers

  // 300+ lines of effects
  useEffect(() => { /* load data */ }, []);
  useEffect(() => { /* update layout */ }, [layout]);
  // ... 20 more effects

  // 500+ lines of render logic
  return (
    <div>
      {/* massive nested JSX */}
    </div>
  );
};
```

**After (Modular Structure):**

```
client/src/components/graph/
├── EnhancedGraphExplorer.jsx (main component, 150 lines)
├── hooks/
│   ├── useGraphData.js (data fetching, 80 lines)
│   ├── useGraphLayout.js (layout management, 60 lines)
│   ├── useGraphFilters.js (filtering logic, 90 lines)
│   └── useGraphSelection.js (selection state, 50 lines)
├── components/
│   ├── GraphCanvas.jsx (rendering, 200 lines)
│   ├── GraphToolbar.jsx (controls, 120 lines)
│   ├── GraphSidebar.jsx (details panel, 150 lines)
│   ├── GraphLegend.jsx (legend, 80 lines)
│   └── FilterPanel.jsx (filters UI, 140 lines)
├── utils/
│   ├── graphTransforms.js (data transforms, 100 lines)
│   ├── graphLayouts.js (layout algorithms, 180 lines)
│   └── graphHelpers.js (utilities, 90 lines)
└── types/
    └── graphTypes.ts (type definitions, 60 lines)
```

**New Main Component:**
```javascript
// client/src/components/graph/EnhancedGraphExplorer.jsx (150 lines)

import { useGraphData } from './hooks/useGraphData';
import { useGraphLayout } from './hooks/useGraphLayout';
import { useGraphFilters } from './hooks/useGraphFilters';
import { useGraphSelection } from './hooks/useGraphSelection';
import { GraphCanvas } from './components/GraphCanvas';
import { GraphToolbar } from './components/GraphToolbar';
import { GraphSidebar } from './components/GraphSidebar';

const EnhancedGraphExplorer = ({ investigationId }) => {
  const { data, loading, error, refetch } = useGraphData(investigationId);
  const { layout, setLayout, layoutOptions } = useGraphLayout();
  const { filters, setFilters, filteredData } = useGraphFilters(data);
  const { selectedNode, selectedEdge, handleSelect } = useGraphSelection();

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error} />;

  return (
    <GraphContainer>
      <GraphToolbar
        layout={layout}
        onLayoutChange={setLayout}
        onRefresh={refetch}
      />
      <GraphCanvas
        data={filteredData}
        layout={layout}
        selectedNode={selectedNode}
        onNodeClick={handleSelect}
      />
      <GraphSidebar
        selectedNode={selectedNode}
        selectedEdge={selectedEdge}
      />
    </GraphContainer>
  );
};
```

**Example Custom Hook:**
```javascript
// client/src/components/graph/hooks/useGraphData.js (80 lines)

import { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { GET_GRAPH_DATA } from '../queries';

export const useGraphData = (investigationId) => {
  const { data, loading, error, refetch } = useQuery(GET_GRAPH_DATA, {
    variables: { investigationId },
    skip: !investigationId,
  });

  const [processedData, setProcessedData] = useState(null);

  useEffect(() => {
    if (data?.investigation?.graph) {
      const processed = processGraphData(data.investigation.graph);
      setProcessedData(processed);
    }
  }, [data]);

  return {
    data: processedData,
    loading,
    error,
    refetch,
  };
};

function processGraphData(rawData) {
  // Transform and enrich graph data
  return {
    nodes: rawData.nodes.map(enrichNode),
    edges: rawData.edges.map(enrichEdge),
  };
}
```

### Strategy 2: Extract by Responsibility (Services)

**Before:**
```javascript
// server/src/services/VisualizationService.js (2,032 lines)

class VisualizationService {
  // Theme management (300 lines)
  initializeThemes() { /* ... */ }
  getTheme() { /* ... */ }
  setTheme() { /* ... */ }
  customizeTheme() { /* ... */ }

  // Data transformation (400 lines)
  transformData() { /* ... */ }
  filterNodes() { /* ... */ }
  aggregateData() { /* ... */ }

  // Layout algorithms (500 lines)
  calculateForceLayout() { /* ... */ }
  calculateHierarchyLayout() { /* ... */ }
  calculateCircularLayout() { /* ... */ }

  // Rendering (400 lines)
  renderSVG() { /* ... */ }
  renderCanvas() { /* ... */ }
  exportImage() { /* ... */ }

  // Utilities (300+ lines)
  // ...
}
```

**After (Focused Services):**

```
server/src/services/visualization/
├── VisualizationService.js (facade, 100 lines)
├── ThemeService.js (300 lines)
├── DataTransformService.js (400 lines)
├── LayoutService.js (500 lines)
├── RenderService.js (400 lines)
└── utils/
    ├── colorUtils.js
    ├── layoutUtils.js
    └── exportUtils.js
```

**New Facade Service:**
```javascript
// server/src/services/visualization/VisualizationService.js (100 lines)

import { ThemeService } from './ThemeService';
import { DataTransformService } from './DataTransformService';
import { LayoutService } from './LayoutService';
import { RenderService } from './RenderService';

class VisualizationService {
  constructor() {
    this.themes = new ThemeService();
    this.transforms = new DataTransformService();
    this.layouts = new LayoutService();
    this.renderer = new RenderService();
  }

  async generateVisualization(data, options) {
    // Orchestrate the visualization pipeline
    const theme = this.themes.getTheme(options.theme);
    const transformedData = this.transforms.transform(data, options.filters);
    const layout = await this.layouts.calculate(transformedData, options.layout);
    const visualization = this.renderer.render(layout, theme, options.format);

    return visualization;
  }

  // Delegate other methods to specialized services
  getTheme(name) {
    return this.themes.get(name);
  }

  calculateLayout(data, type) {
    return this.layouts.calculate(data, type);
  }

  // ... minimal facade methods
}
```

**Focused Service Example:**
```javascript
// server/src/services/visualization/ThemeService.js (300 lines)

class ThemeService {
  constructor() {
    this.themes = new Map();
    this.initializeDefaultThemes();
  }

  initializeDefaultThemes() {
    this.themes.set('dark', {
      background: '#1a1a1a',
      nodeColors: ['#4a9eff', '#ff6b6b', '#4ecdc4'],
      edgeColor: '#666',
      textColor: '#fff',
    });

    this.themes.set('light', {
      background: '#ffffff',
      nodeColors: ['#2563eb', '#dc2626', '#059669'],
      edgeColor: '#ccc',
      textColor: '#000',
    });

    // ... more themes
  }

  get(name) {
    return this.themes.get(name) || this.themes.get('light');
  }

  create(name, config) {
    this.validate(config);
    this.themes.set(name, config);
    return config;
  }

  customize(name, overrides) {
    const base = this.get(name);
    return { ...base, ...overrides };
  }

  validate(config) {
    // Validation logic
    if (!config.background) throw new Error('Theme must have background');
    if (!config.nodeColors) throw new Error('Theme must have nodeColors');
    // ...
  }

  // ... theme-specific methods only
}
```

---

## Refactoring God Objects

### Problem: Classes with 50+ Methods

**Identified Issues:**
- `ReportingService.js` - 117 methods
- `AdvancedAnalyticsService.js` - 111 methods
- `VisualizationService.js` - 108 methods

### Strategy: Single Responsibility Principle

**Before:**
```javascript
// server/src/services/ReportingService.js (117 methods)

class ReportingService {
  // Report generation (30 methods)
  generatePDFReport() { }
  generateCSVReport() { }
  generateExcelReport() { }
  generateHTMLReport() { }
  generateJSONReport() { }
  // ... 25 more generation methods

  // Report scheduling (20 methods)
  scheduleReport() { }
  cancelScheduledReport() { }
  updateSchedule() { }
  getScheduledReports() { }
  // ... 16 more scheduling methods

  // Report delivery (25 methods)
  sendEmailReport() { }
  sendSlackReport() { }
  uploadToS3() { }
  uploadToGCS() { }
  // ... 21 more delivery methods

  // Report templates (20 methods)
  getTemplate() { }
  createTemplate() { }
  updateTemplate() { }
  deleteTemplate() { }
  // ... 16 more template methods

  // Report history (15 methods)
  getReportHistory() { }
  archiveReport() { }
  deleteOldReports() { }
  // ... 12 more history methods

  // Utilities (7 methods)
  // ...
}
```

**After (Composition Pattern):**

```
server/src/services/reporting/
├── ReportingService.js (facade, 80 lines)
├── ReportGenerator.js (250 lines)
├── ReportScheduler.js (200 lines)
├── ReportDelivery.js (220 lines)
├── ReportTemplates.js (180 lines)
├── ReportHistory.js (150 lines)
└── formats/
    ├── PDFGenerator.js
    ├── CSVGenerator.js
    ├── ExcelGenerator.js
    └── HTMLGenerator.js
```

**New Facade:**
```javascript
// server/src/services/reporting/ReportingService.js (80 lines)

class ReportingService {
  constructor(dependencies) {
    this.generator = new ReportGenerator(dependencies);
    this.scheduler = new ReportScheduler(dependencies);
    this.delivery = new ReportDelivery(dependencies);
    this.templates = new ReportTemplates(dependencies);
    this.history = new ReportHistory(dependencies);
  }

  // High-level orchestration methods
  async createAndDeliverReport(config) {
    const template = await this.templates.get(config.templateId);
    const report = await this.generator.generate(config.data, template);
    const result = await this.delivery.send(report, config.recipients);
    await this.history.record(config, result);
    return result;
  }

  async scheduleRecurringReport(config) {
    const job = await this.scheduler.schedule(config);
    return job;
  }

  // Delegate to specialized services
  generate(data, format) {
    return this.generator.generate(data, format);
  }

  schedule(config) {
    return this.scheduler.schedule(config);
  }

  send(report, recipients) {
    return this.delivery.send(report, recipients);
  }

  // ... other facade methods
}
```

**Focused Service Example:**
```javascript
// server/src/services/reporting/ReportGenerator.js (250 lines)

class ReportGenerator {
  constructor({ database, cache }) {
    this.db = database;
    this.cache = cache;

    // Initialize format-specific generators
    this.generators = {
      pdf: new PDFGenerator(),
      csv: new CSVGenerator(),
      excel: new ExcelGenerator(),
      html: new HTMLGenerator(),
      json: new JSONGenerator(),
    };
  }

  async generate(data, template, format = 'pdf') {
    // Validate inputs
    this.validate(data, template, format);

    // Check cache
    const cacheKey = this.getCacheKey(data, template, format);
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    // Prepare data
    const preparedData = await this.prepareData(data, template);

    // Generate using format-specific generator
    const generator = this.generators[format];
    const report = await generator.generate(preparedData, template);

    // Cache result
    await this.cache.set(cacheKey, report, { ttl: 3600 });

    return report;
  }

  async prepareData(data, template) {
    // Apply template filters
    const filtered = this.applyFilters(data, template.filters);

    // Apply aggregations
    const aggregated = this.applyAggregations(filtered, template.aggregations);

    // Apply sorting
    const sorted = this.applySorting(aggregated, template.sorting);

    return sorted;
  }

  validate(data, template, format) {
    if (!data) throw new Error('Data is required');
    if (!template) throw new Error('Template is required');
    if (!this.generators[format]) {
      throw new Error(`Unsupported format: ${format}`);
    }
  }

  applyFilters(data, filters) {
    // Filtering logic
  }

  applyAggregations(data, aggregations) {
    // Aggregation logic
  }

  applySorting(data, sorting) {
    // Sorting logic
  }

  getCacheKey(data, template, format) {
    return `report:${template.id}:${format}:${this.hashData(data)}`;
  }

  hashData(data) {
    // Create hash of data for cache key
  }
}
```

---

## Reducing Complexity

### Problem: High Cyclomatic Complexity

**Identified Issues:**
- `AdvancedAnalyticsService.js` - 110 conditionals
- `crudResolvers.ts` - 107 conditionals

### Strategy 1: Replace Large Switch Statements

**Before:**
```javascript
// High complexity: 32 cases
function handleDeploymentEvent(event) {
  switch (event.type) {
    case 'BLUE_DEPLOY_START':
      // 20 lines of logic
      break;
    case 'BLUE_DEPLOY_COMPLETE':
      // 20 lines of logic
      break;
    case 'GREEN_DEPLOY_START':
      // 20 lines of logic
      break;
    // ... 29 more cases
    case 'ROLLBACK_COMPLETE':
      // 20 lines of logic
      break;
    default:
      throw new Error(`Unknown event type: ${event.type}`);
  }
}
```

**After (Strategy Pattern):**
```javascript
// Low complexity: 3 conditionals

// Define handlers
const eventHandlers = {
  BLUE_DEPLOY_START: handleBlueDeployStart,
  BLUE_DEPLOY_COMPLETE: handleBlueDeployComplete,
  GREEN_DEPLOY_START: handleGreenDeployStart,
  // ... all handlers as functions
  ROLLBACK_COMPLETE: handleRollbackComplete,
};

function handleDeploymentEvent(event) {
  const handler = eventHandlers[event.type];

  if (!handler) {
    throw new Error(`Unknown event type: ${event.type}`);
  }

  return handler(event);
}

// Separate handler functions
function handleBlueDeployStart(event) {
  // 20 lines of focused logic
}

function handleBlueDeployComplete(event) {
  // 20 lines of focused logic
}

// ... etc
```

**Even Better (Class-Based Strategy):**
```javascript
// event-handlers/BaseEventHandler.js
class BaseEventHandler {
  constructor(dependencies) {
    this.logger = dependencies.logger;
    this.metrics = dependencies.metrics;
  }

  async handle(event) {
    this.validate(event);
    await this.execute(event);
    this.recordMetrics(event);
  }

  validate(event) {
    // Common validation
  }

  execute(event) {
    throw new Error('Subclasses must implement execute()');
  }

  recordMetrics(event) {
    // Common metrics recording
  }
}

// event-handlers/BlueDeployStartHandler.js
class BlueDeployStartHandler extends BaseEventHandler {
  execute(event) {
    // Focused logic for this event type
    this.logger.info('Starting blue deployment', event);
    // ...
  }
}

// Main event dispatcher
class EventDispatcher {
  constructor(dependencies) {
    this.handlers = new Map([
      ['BLUE_DEPLOY_START', new BlueDeployStartHandler(dependencies)],
      ['BLUE_DEPLOY_COMPLETE', new BlueDeployCompleteHandler(dependencies)],
      // ... register all handlers
    ]);
  }

  async dispatch(event) {
    const handler = this.handlers.get(event.type);

    if (!handler) {
      throw new Error(`No handler for event type: ${event.type}`);
    }

    return handler.handle(event);
  }
}
```

### Strategy 2: Extract Conditional Logic

**Before:**
```javascript
// High complexity: Nested conditionals
function processAnalytics(data, options) {
  if (data.type === 'timeseries') {
    if (options.aggregation === 'sum') {
      if (options.interval === 'hourly') {
        // complex logic
      } else if (options.interval === 'daily') {
        // complex logic
      } else if (options.interval === 'weekly') {
        // complex logic
      }
    } else if (options.aggregation === 'average') {
      if (options.interval === 'hourly') {
        // complex logic
      } else if (options.interval === 'daily') {
        // complex logic
      }
    } else if (options.aggregation === 'count') {
      // more nested logic
    }
  } else if (data.type === 'categorical') {
    // completely different nested logic
  } else if (data.type === 'geographical') {
    // more nested logic
  }
  // ... many more conditions
}
```

**After (Composition + Strategy):**
```javascript
// analytics/TimeseriesAnalyzer.js
class TimeseriesAnalyzer {
  constructor() {
    this.aggregators = {
      sum: new SumAggregator(),
      average: new AverageAggregator(),
      count: new CountAggregator(),
    };
  }

  analyze(data, options) {
    const aggregator = this.aggregators[options.aggregation];
    if (!aggregator) {
      throw new Error(`Unknown aggregation: ${options.aggregation}`);
    }

    return aggregator.aggregate(data, options.interval);
  }
}

// analytics/aggregators/SumAggregator.js
class SumAggregator {
  aggregate(data, interval) {
    const grouper = this.getGrouper(interval);
    return grouper.group(data, (items) => items.reduce((sum, item) => sum + item.value, 0));
  }

  getGrouper(interval) {
    const groupers = {
      hourly: new HourlyGrouper(),
      daily: new DailyGrouper(),
      weekly: new WeeklyGrouper(),
    };
    return groupers[interval] || groupers.daily;
  }
}

// Main function - much simpler!
function processAnalytics(data, options) {
  const analyzer = getAnalyzer(data.type);
  return analyzer.analyze(data, options);
}

function getAnalyzer(type) {
  const analyzers = {
    timeseries: new TimeseriesAnalyzer(),
    categorical: new CategoricalAnalyzer(),
    geographical: new GeographicalAnalyzer(),
  };

  const analyzer = analyzers[type];
  if (!analyzer) {
    throw new Error(`Unknown data type: ${type}`);
  }

  return analyzer;
}
```

### Strategy 3: Early Returns

**Before:**
```javascript
// Complex nested logic
function validateUser(user) {
  let isValid = false;

  if (user) {
    if (user.email) {
      if (user.email.includes('@')) {
        if (user.password) {
          if (user.password.length >= 8) {
            if (user.name) {
              if (user.name.length > 0) {
                isValid = true;
              }
            }
          }
        }
      }
    }
  }

  return isValid;
}
```

**After (Guard Clauses):**
```javascript
// Linear, easy to read
function validateUser(user) {
  if (!user) return false;
  if (!user.email) return false;
  if (!user.email.includes('@')) return false;
  if (!user.password) return false;
  if (user.password.length < 8) return false;
  if (!user.name) return false;
  if (user.name.length === 0) return false;

  return true;
}

// Even better: Extract validation rules
function validateUser(user) {
  const validations = [
    () => !!user,
    () => !!user.email,
    () => user.email.includes('@'),
    () => !!user.password,
    () => user.password.length >= 8,
    () => !!user.name && user.name.length > 0,
  ];

  return validations.every((validate) => validate());
}
```

---

## Eliminating Code Duplication

### Strategy 1: Extract Common Functions

**Before:**
```javascript
// client/src/components/ai/AIInsightsPanel.js (duplicate)
// client/src/components/graph/AIInsightsPanel.js (duplicate)

// Both files have nearly identical code
function AIInsightsPanel({ investigationId }) {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchInsights(investigationId).then(setInsights);
  }, [investigationId]);

  // ... 200 lines of identical logic
}
```

**After:**
```javascript
// client/src/components/shared/AIInsightsPanel.js (single source of truth)

export function AIInsightsPanel({ investigationId, context = 'graph' }) {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchInsights(investigationId, context).then(setInsights);
  }, [investigationId, context]);

  // ... all logic in one place
}

// Re-export with context presets if needed
// client/src/components/ai/index.js
export { AIInsightsPanel } from '../shared/AIInsightsPanel';

// client/src/components/graph/index.js
import { AIInsightsPanel as BasePanel } from '../shared/AIInsightsPanel';
export const AIInsightsPanel = (props) => <BasePanel {...props} context="graph" />;
```

### Strategy 2: Create Shared Utilities

**Before:**
```javascript
// Multiple services have duplicate code
// server/src/services/QueueService.js
// server/src/services/QueueService.ts

// Both implement the same queue logic differently
```

**After:**
```javascript
// server/src/utils/queue/QueueManager.ts (shared implementation)

export class QueueManager {
  constructor(config: QueueConfig) {
    this.config = config;
    this.queue = [];
  }

  async enqueue(item: any): Promise<void> {
    // Shared queue logic
  }

  async dequeue(): Promise<any> {
    // Shared queue logic
  }
}

// server/src/services/QueueService.ts (use shared implementation)
import { QueueManager } from '../utils/queue/QueueManager';

export class QueueService {
  private manager: QueueManager;

  constructor() {
    this.manager = new QueueManager(defaultConfig);
  }

  // Service-specific methods that use QueueManager
  async addJob(job: Job): Promise<void> {
    return this.manager.enqueue(job);
  }
}
```

---

## Reducing Function Length

### Strategy: Extract Helper Functions

**Before:**
```javascript
// 257-line function
function initializeReportTemplates() {
  // 50 lines of template 1
  const template1 = {
    name: 'Financial Report',
    sections: [
      { type: 'header', content: '...' },
      { type: 'summary', calculations: [...] },
      { type: 'details', fields: [...] },
      // ... many more lines
    ],
    formatting: { /* ... */ },
    validations: { /* ... */ },
  };

  // 50 lines of template 2
  const template2 = { /* ... */ };

  // 50 lines of template 3
  const template3 = { /* ... */ };

  // 50 lines of template 4
  const template4 = { /* ... */ };

  // 50 lines of template 5
  const template5 = { /* ... */ };

  return [template1, template2, template3, template4, template5];
}
```

**After:**
```javascript
// Main function: 20 lines
function initializeReportTemplates() {
  return [
    createFinancialReportTemplate(),
    createOperationalReportTemplate(),
    createSecurityReportTemplate(),
    createComplianceReportTemplate(),
    createExecutiveSummaryTemplate(),
  ];
}

// Separate template builders: 50 lines each
function createFinancialReportTemplate() {
  return {
    name: 'Financial Report',
    sections: [
      createHeaderSection('Financial Analysis'),
      createSummarySection(financialCalculations),
      createDetailsSection(financialFields),
      createChartsSection(financialCharts),
    ],
    formatting: createFinancialFormatting(),
    validations: createFinancialValidations(),
  };
}

// Reusable section builders
function createHeaderSection(title) {
  return {
    type: 'header',
    content: title,
    style: defaultHeaderStyle,
  };
}

function createSummarySection(calculations) {
  return {
    type: 'summary',
    calculations,
    layout: 'grid',
  };
}

// Configuration extracted to separate files
// templates/config/financial.js
export const financialCalculations = [
  { name: 'Total Revenue', formula: 'SUM(revenue)' },
  { name: 'Total Expenses', formula: 'SUM(expenses)' },
  // ...
];

export const financialFields = [
  { name: 'account_id', type: 'string', required: true },
  { name: 'amount', type: 'decimal', required: true },
  // ...
];
```

---

## Managing Technical Debt

### Strategy: Convert TODOs to Tracked Issues

**Before:**
```typescript
// server/src/services/MultimodalDataService.ts (17 TODOs)

class MultimodalDataService {
  async extractEntities(data: any): Promise<Entity[]> {
    // TODO: Implement cross-modal matching algorithm
    // TODO: Add entity merging logic
    // TODO: Implement duplicate detection
    return [];
  }

  async processImages(images: any[]): Promise<void> {
    // TODO: Add image preprocessing
    // TODO: Implement OCR extraction
    // TODO: Add face detection
  }

  async analyzeText(text: string): Promise<Analysis> {
    // TODO: Add NLP pipeline
    // TODO: Implement sentiment analysis
    // TODO: Add entity extraction
    return {};
  }

  // TODO: Implement video processing
  // TODO: Add audio transcription
  // TODO: Implement clustering algorithm
  // TODO: Add relationship detection
  // TODO: Implement indexing
}
```

**After:**
```typescript
// server/src/services/MultimodalDataService.ts (0 TODOs, tracked issues)

/**
 * MultimodalDataService
 *
 * Handles processing of multimodal data (text, images, video, audio).
 *
 * Planned enhancements tracked in GitHub:
 * - #1234: Implement cross-modal entity matching algorithm
 * - #1235: Add advanced image processing (OCR, face detection)
 * - #1236: Implement NLP pipeline with sentiment analysis
 * - #1237: Add video processing capabilities
 * - #1238: Implement audio transcription service
 * - #1239: Add clustering and relationship detection
 */
class MultimodalDataService {
  /**
   * Extracts entities from multimodal data.
   *
   * Current implementation: Basic text extraction only
   * See #1234 for cross-modal matching implementation plan
   */
  async extractEntities(data: MultimodalData): Promise<Entity[]> {
    // Current basic implementation
    const textEntities = await this.extractTextEntities(data.text);
    return textEntities;

    // Future: Will merge entities across modalities (see #1234)
  }

  /**
   * Processes image data.
   *
   * Current implementation: Metadata extraction only
   * See #1235 for advanced image processing (OCR, face detection)
   */
  async processImages(images: ImageData[]): Promise<ProcessedImage[]> {
    return images.map((img) => ({
      id: img.id,
      metadata: this.extractImageMetadata(img),
      // OCR and face detection will be added in #1235
    }));
  }

  /**
   * Analyzes text content.
   *
   * Current implementation: Basic keyword extraction
   * See #1236 for full NLP pipeline
   */
  async analyzeText(text: string): Promise<TextAnalysis> {
    return {
      keywords: this.extractKeywords(text),
      language: this.detectLanguage(text),
      // Sentiment analysis will be added in #1236
      // Entity extraction will be added in #1236
    };
  }

  // Placeholder methods with clear implementation status
  async processVideo(video: VideoData): Promise<ProcessedVideo> {
    throw new NotImplementedError(
      'Video processing not yet implemented. See issue #1237'
    );
  }

  async transcribeAudio(audio: AudioData): Promise<Transcription> {
    throw new NotImplementedError(
      'Audio transcription not yet implemented. See issue #1238'
    );
  }
}
```

**GitHub Issues Created:**
```markdown
# Issue #1234: Implement cross-modal entity matching

## Description
Implement algorithm to match and merge entities detected across different modalities (text, image, video).

## Acceptance Criteria
- [ ] Define entity matching confidence scores
- [ ] Implement fuzzy matching for entity names
- [ ] Add visual similarity matching for entities with images
- [ ] Create merge strategy for conflicting attributes
- [ ] Add deduplication logic

## Technical Design
See [ADR-0042-cross-modal-matching.md]

## Related Issues
- Blocked by #1235 (image processing)
- Blocked by #1236 (NLP pipeline)

## Estimate
8 story points (2 weeks)
```

---

## Before & After Examples

### Complete Example: Refactoring a Complex Component

**Before: 2,474 lines of chaos**
```javascript
// client/src/components/graph/EnhancedGraphExplorer.jsx

// ❌ Problems:
// - 2,474 lines in one file
// - 50+ state variables
// - 30+ handler functions
// - 20+ useEffect hooks
// - 500+ lines of JSX
// - High coupling
// - Difficult to test
// - Hard to understand

const EnhancedGraphExplorer = () => {
  // State management nightmare
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  // ... 48 more state variables

  // Handler function overload
  const handleNodeClick = (node) => { /* 50 lines */ };
  const handleEdgeClick = (edge) => { /* 40 lines */ };
  // ... 28 more handlers

  // Effect chaos
  useEffect(() => { /* load data */ }, []);
  useEffect(() => { /* update layout */ }, [layout]);
  // ... 18 more effects

  // Massive return statement
  return (
    <div>
      {/* 500 lines of nested JSX */}
    </div>
  );
};
```

**After: Clean, modular, maintainable**
```javascript
// ✅ Solutions applied:
// - Extracted custom hooks (4 files, 280 lines)
// - Created sub-components (5 files, 740 lines)
// - Extracted utilities (3 files, 370 lines)
// - Defined types (1 file, 60 lines)
// - Main component reduced to 150 lines
// - Easy to test each part
// - Clear separation of concerns

// client/src/components/graph/EnhancedGraphExplorer.jsx (150 lines)
const EnhancedGraphExplorer = ({ investigationId }) => {
  // Clean hook composition
  const graphData = useGraphData(investigationId);
  const graphLayout = useGraphLayout(graphData.data);
  const graphFilters = useGraphFilters(graphData.data);
  const graphSelection = useGraphSelection();

  // Simple derived state
  const displayData = useMemo(
    () => graphFilters.apply(graphData.data),
    [graphData.data, graphFilters]
  );

  // Loading/error states
  if (graphData.loading) return <GraphLoader />;
  if (graphData.error) return <GraphError error={graphData.error} />;
  if (!displayData) return <GraphEmpty />;

  // Clean, focused render
  return (
    <GraphProvider value={{ graphLayout, graphSelection }}>
      <GraphContainer>
        <GraphToolbar
          layout={graphLayout.current}
          onLayoutChange={graphLayout.setLayout}
          onRefresh={graphData.refetch}
        />
        <GraphCanvas
          data={displayData}
          onNodeClick={graphSelection.selectNode}
          onEdgeClick={graphSelection.selectEdge}
        />
        <FilterPanel
          filters={graphFilters.filters}
          onChange={graphFilters.setFilters}
        />
        <GraphSidebar
          selectedNode={graphSelection.selectedNode}
          selectedEdge={graphSelection.selectedEdge}
        />
      </GraphContainer>
    </GraphProvider>
  );
};
```

---

## Summary

### Key Refactoring Principles

1. **Single Responsibility** - Each module does one thing well
2. **Extract, Don't Extend** - Break down large functions/classes
3. **Composition Over Inheritance** - Build complex behavior from simple parts
4. **DRY (Don't Repeat Yourself)** - Eliminate duplication
5. **Clear Naming** - Names should reveal intent
6. **Early Returns** - Reduce nesting with guard clauses
7. **Strategy Pattern** - Replace conditionals with polymorphism
8. **Dependency Injection** - Make dependencies explicit
9. **Test First** - Refactor with tests in place
10. **Incremental Progress** - Small, safe changes

### Recommended Workflow

1. **Identify the problem** - Use metrics to find issues
2. **Write tests** - Ensure behavior is preserved
3. **Extract incrementally** - Small, safe refactorings
4. **Verify tests pass** - After each change
5. **Commit frequently** - Small, focused commits
6. **Update documentation** - Keep docs in sync
7. **Review changes** - Get feedback from team

### Tools to Help

- **ESLint** - Detect complexity and style issues
- **TypeScript** - Catch errors during refactoring
- **Jest** - Maintain test coverage
- **Git** - Safe, reversible changes
- **IDE Refactoring Tools** - Automated renames, extractions

---

*For questions about refactoring, consult the team or create a GitHub discussion.*
