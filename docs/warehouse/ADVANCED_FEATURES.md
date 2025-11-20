# Advanced Data Warehouse Features

## Table of Contents

1. [Security & Governance](#security--governance)
2. [Time-Travel Queries](#time-travel-queries)
3. [BI Tool Integration](#bi-tool-integration)
4. [Data Catalog & Lineage](#data-catalog--lineage)
5. [Monitoring & Observability](#monitoring--observability)
6. [Complete Example](#complete-example)

## Security & Governance

Summit provides enterprise-grade security with multiple layers of protection.

### Role-Based Access Control (RBAC)

```typescript
import { SecurityManager } from '@summit/warehouse-security';

const security = new SecurityManager(pool);

// Initialize security infrastructure
await security.initialize();

// Create roles
const analystRoleId = await security.rbac.createRole({
  name: 'data_analyst',
  description: 'Read-only access to approved datasets',
  permissions: [
    { resource: 'sales_data', action: 'SELECT' },
    { resource: 'customer_data', action: 'SELECT' }
  ]
});

// Create user
const userId = await security.rbac.createUser({
  username: 'john.doe',
  email: 'john@company.com',
  roles: [analystRoleId],
  attributes: {
    department: 'Marketing',
    region: 'North America'
  }
});
```

### Row-Level Security (RLS)

```typescript
// Create RLS policy for department-based access
await security.rls.createPolicy({
  tableName: 'sales_data',
  policyName: 'department_access',
  operation: 'SELECT',
  roles: ['data_analyst'],
  predicate: "department = '{user.department}'",
  enabled: true
});

// Query automatically applies RLS
const results = await security.executeSecureQuery(
  'SELECT * FROM sales_data',
  {
    userId: userId,
    username: 'john.doe',
    roles: ['data_analyst'],
    attributes: { department: 'Marketing' }
  }
);
// Only sees Marketing department data
```

### Column-Level Security

```typescript
// Restrict sensitive columns
await security.columnAccess.createColumnPolicy({
  tableName: 'customers',
  columnName: 'ssn',
  allowedRoles: ['hr_admin'],
  maskingFunction: "CONCAT('XXX-XX-', RIGHT(ssn, 4))"
});

await security.columnAccess.createColumnPolicy({
  tableName: 'customers',
  columnName: 'salary',
  allowedRoles: ['hr_admin', 'manager'],
  maskingFunction: 'NULL' // Completely hidden for others
});

// Analysts see masked data automatically
const query = 'SELECT * FROM customers';
const filtered = await security.columnAccess.filterQueryColumns(
  query,
  'customers',
  ['data_analyst']
);
// Query rewritten to: SELECT name, email, CONCAT('XXX-XX-', RIGHT(ssn, 4)) as ssn FROM customers
```

### Data Masking

```typescript
import { DataMasking } from '@summit/warehouse-security';

// Various masking functions
const maskedEmail = DataMasking.maskEmail('john.doe@company.com');
// Result: j*******@company.com

const maskedPhone = DataMasking.maskPhone('555-123-4567');
// Result: XXX-XXX-4567

const maskedCard = DataMasking.maskCreditCard('4111-1111-1111-1111');
// Result: XXXX-XXXX-XXXX-1111

const maskedSSN = DataMasking.maskSSN('123-45-6789');
// Result: XXX-XX-6789

// Install masking functions in database
await DataMasking.installMaskingFunctions(pool);
```

### Audit Logging

```typescript
// All queries are automatically logged
const logs = await security.auditLogger.getLogs({
  userId: userId,
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31'),
  status: 'success'
});

// Get audit statistics
const stats = await security.auditLogger.getAuditStats('week');
console.log(`Total queries: ${stats.totalQueries}`);
console.log(`Failed access: ${stats.failedQueries}`);
console.log(`Unique users: ${stats.uniqueUsers}`);

// Generate compliance report
const complianceReport = await security.auditLogger.generateComplianceReport(
  new Date('2024-01-01'),
  new Date('2024-01-31')
);

console.log(`Sensitive data access: ${complianceReport.summary.sensitiveDataAccess}`);
console.log(`Suspicious activity: ${complianceReport.summary.suspiciousActivity}`);
```

## Time-Travel Queries

Query historical data and track changes over time.

### Enable Time-Travel

```typescript
import { TemporalEngine } from '@summit/time-travel';

const temporal = new TemporalEngine(pool);

// Enable time-travel for a table
await temporal.enableTimeTravelForTable({
  tableName: 'products',
  temporalColumn: 'valid_time',
  retentionDays: 365,
  snapshotInterval: 'day'
});
```

### Query Historical Data

```typescript
// Query data as it was on January 1, 2024
const historicalData = await temporal.queryAsOf(
  'products',
  new Date('2024-01-01')
);

// Query data between two dates
const changes = await temporal.queryBetween(
  'products',
  new Date('2024-01-01'),
  new Date('2024-01-31')
);

// Get complete history of a record
const history = await temporal.getRecordHistory(
  'products',
  { product_id: 123 }
);

console.log(`Product had ${history.length} versions`);
```

### Compare Timestamps

```typescript
// Find what changed between two points in time
const diff = await temporal.compareTimestamps(
  'products',
  new Date('2024-01-01'),
  new Date('2024-02-01')
);

console.log(`Added: ${diff.added.length} products`);
console.log(`Removed: ${diff.removed.length} products`);
console.log(`Modified: ${diff.modified.length} products`);
```

### Restore from History

```typescript
// Restore table to a previous state
const restored = await temporal.restoreFromTimestamp(
  'products',
  new Date('2024-01-15')
);

console.log(`Restored ${restored} records`);
```

## BI Tool Integration

Connect to Tableau, Power BI, Looker, and other BI tools.

### Semantic Layer

```typescript
import { SemanticLayer } from '@summit/bi-connectors';

const semantic = new SemanticLayer(pool);

// Define business-friendly model
const model = {
  name: 'Sales Analytics',
  description: 'Comprehensive sales reporting',
  tables: [
    {
      logicalName: 'Sales',
      physicalName: 'fact_sales',
      description: 'Sales transactions',
      columns: [
        {
          logicalName: 'Sale Date',
          physicalName: 'sale_date',
          dataType: 'DATE',
          description: 'Date of sale'
        },
        {
          logicalName: 'Total Revenue',
          physicalName: 'revenue',
          dataType: 'DECIMAL',
          description: 'Total revenue amount',
          aggregation: 'SUM',
          format: '$#,##0.00'
        }
      ]
    }
  ],
  relationships: [
    {
      fromTable: 'Sales',
      fromColumn: 'product_key',
      toTable: 'Products',
      toColumn: 'product_key',
      cardinality: 'N:1'
    }
  ],
  measures: [
    {
      name: 'Total Revenue',
      expression: 'SUM(revenue)',
      format: '$#,##0.00',
      description: 'Sum of all sales revenue'
    },
    {
      name: 'Average Order Value',
      expression: 'SUM(revenue) / COUNT(DISTINCT order_id)',
      format: '$#,##0.00',
      description: 'Average revenue per order'
    }
  ]
};

await semantic.createModel(model);
```

### Generate BI Tool Configurations

```typescript
// Generate Tableau TDS file
const tableauTDS = semantic.generateTableauTDS(model);
// Save to file: sales_analytics.tds

// Generate Looker LookML
const lookML = semantic.generateLookML(model);
// Save to file: sales_analytics.lkml

// Generate Power BI M Query
const powerBIM = semantic.generatePowerBIM(model);
// Use in Power BI Get Data > Blank Query
```

### Example Tableau Connection

1. Save the generated TDS file
2. Open Tableau
3. Connect to Data Source > More... > PostgreSQL
4. Or open the TDS file directly

### Example Looker Connection

1. Save the LookML file in your Looker project
2. Create explore based on the model
3. Deploy to production

## Data Catalog & Lineage

Comprehensive metadata management and data lineage tracking.

### Register Data Assets

```typescript
import { CatalogManager, LineageTracker } from '@summit/data-catalog';

const catalog = new CatalogManager(pool);
const lineage = new LineageTracker(pool);

// Register table in catalog
await catalog.registerAsset({
  name: 'fact_sales',
  type: 'table',
  schema: 'public',
  description: 'Daily sales transactions',
  owner: 'data-engineering-team',
  tags: ['sales', 'revenue', 'core'],
  classification: 'internal',
  columns: [
    {
      name: 'sale_date',
      dataType: 'DATE',
      nullable: false,
      description: 'Date of transaction',
      businessName: 'Transaction Date'
    },
    {
      name: 'customer_id',
      dataType: 'INTEGER',
      nullable: false,
      description: 'Customer identifier',
      piiType: undefined
    },
    {
      name: 'revenue',
      dataType: 'DECIMAL',
      nullable: false,
      description: 'Total revenue',
      statistics: {
        distinctCount: 50000,
        nullCount: 0,
        minValue: 0,
        maxValue: 100000
      }
    }
  ]
});
```

### Search Catalog

```typescript
// Search for assets
const results = await catalog.searchCatalog('sales');

// Find PII assets
const piiAssets = await catalog.findPIIAssets();

// Find by classification
const confidential = await catalog.findByClassification('confidential');

// Generate data dictionary
const dictionary = await catalog.generateDataDictionary('public');
// Returns markdown documentation
```

### Track Data Lineage

```typescript
// Record lineage relationships
await lineage.recordLineage(
  'raw_sales',
  'fact_sales',
  'SELECT ... FROM raw_sales JOIN dim_product ...'
);

await lineage.recordLineage(
  'fact_sales',
  'monthly_revenue_summary',
  'SELECT date_trunc(month, sale_date), SUM(revenue) ...'
);

// Get upstream sources
const upstream = await lineage.getUpstreamLineage('monthly_revenue_summary');
// Returns: ['fact_sales', 'raw_sales', ...]

// Get downstream dependencies
const downstream = await lineage.getDownstreamLineage('fact_sales');
// Returns: ['monthly_revenue_summary', 'sales_dashboard', ...]

// Get complete lineage graph
const graph = await lineage.getLineageGraph('fact_sales');
console.log(`Nodes: ${graph.nodes.length}, Edges: ${graph.edges.length}`);

// Analyze impact of changes
const impact = await lineage.analyzeImpact('fact_sales');
console.log(`Changing fact_sales will affect ${impact.totalAffected} assets`);
console.log(`Direct impact: ${impact.directImpact.join(', ')}`);
```

## Monitoring & Observability

Real-time monitoring and performance analytics.

### Metrics Collection

```typescript
import { MetricsCollector } from '@summit/warehouse-monitoring';

const metrics = new MetricsCollector(pool);

// Collect current metrics
const current = await metrics.collectMetrics();
console.log(`Current query count: ${current.queryCount}`);
console.log(`Average query time: ${current.avgQueryTime}ms`);
console.log(`Cache hit rate: ${(current.cacheHitRate * 100).toFixed(2)}%`);
console.log(`Storage used: ${(current.storageUsed / 1024 / 1024 / 1024).toFixed(2)}GB`);

// Store metrics for historical analysis
await metrics.storeMetrics(current);

// Get historical trends
const historical = await metrics.getHistoricalMetrics(
  new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
  new Date()
);

// Get summary
const summary = await metrics.getMetricsSummary('day');
console.log(`Total queries today: ${summary.totalQueries}`);
console.log(`Average query time: ${summary.avgQueryTime}ms`);
console.log(`Slow query rate: ${(summary.slowQueryRate * 100).toFixed(2)}%`);
console.log(`Peak connections: ${summary.peakConnections}`);
```

### Automated Monitoring

```typescript
// Set up continuous monitoring
setInterval(async () => {
  const metrics = await metricsCollector.collectMetrics();

  // Store metrics
  await metricsCollector.storeMetrics(metrics);

  // Alert on anomalies
  if (metrics.slowQueries > 10) {
    console.log('⚠️  High number of slow queries detected!');
    // Send alert to monitoring system
  }

  if (metrics.cacheHitRate < 0.5) {
    console.log('⚠️  Low cache hit rate!');
    // Consider warming cache
  }

  if (metrics.cpuUsage > 0.9) {
    console.log('⚠️  High CPU usage!');
    // Consider scaling up
  }
}, 60000); // Every minute
```

## Complete Example

Here's a complete example bringing together all advanced features:

```typescript
import { Pool } from 'pg';
import { WarehouseManager } from '@summit/data-warehouse';
import { SecurityManager } from '@summit/warehouse-security';
import { TemporalEngine } from '@summit/time-travel';
import { CatalogManager, LineageTracker } from '@summit/data-catalog';
import { SemanticLayer } from '@summit/bi-connectors';
import { MetricsCollector } from '@summit/warehouse-monitoring';

// Initialize
const pool = new Pool({ /* config */ });

const warehouse = new WarehouseManager({ pools: [pool] });
const security = new SecurityManager(pool);
const temporal = new TemporalEngine(pool);
const catalog = new CatalogManager(pool);
const lineage = new LineageTracker(pool);
const semantic = new SemanticLayer(pool);
const metrics = new MetricsCollector(pool);

// 1. Initialize all systems
await security.initialize();
await catalog.initializeTables();
await lineage.initializeTables();
await semantic.initializeTables();
await metrics.initializeTables();

// 2. Create secure table with time-travel
await warehouse.createTable({
  name: 'sensitive_sales_data',
  columns: [
    { name: 'sale_id', type: 'SERIAL', primaryKey: true },
    { name: 'sale_date', type: 'DATE', nullable: false },
    { name: 'customer_id', type: 'INTEGER', nullable: false },
    { name: 'revenue', type: 'DECIMAL', nullable: false },
    { name: 'department', type: 'VARCHAR(100)', nullable: false }
  ],
  sortKeys: ['sale_date', 'department']
});

// 3. Enable time-travel
await temporal.enableTimeTravelForTable({
  tableName: 'sensitive_sales_data',
  temporalColumn: 'valid_time',
  retentionDays: 365
});

// 4. Set up security
await security.rls.createPolicy({
  tableName: 'sensitive_sales_data',
  policyName: 'department_access',
  operation: 'SELECT',
  roles: ['analyst'],
  predicate: "department = '{user.department}'",
  enabled: true
});

// 5. Register in catalog
const assetId = await catalog.registerAsset({
  name: 'sensitive_sales_data',
  type: 'table',
  schema: 'public',
  description: 'Sensitive sales data with department-level access control',
  owner: 'data-team',
  tags: ['sales', 'sensitive', 'departmental'],
  classification: 'internal',
  columns: [/* ... */]
});

// 6. Track lineage
await lineage.recordLineage(
  'raw_sales',
  'sensitive_sales_data',
  'ETL transformation with department assignment'
);

// 7. Create semantic model for BI tools
await semantic.createModel({
  name: 'Departmental Sales',
  description: 'Sales data by department',
  tables: [/* ... */],
  relationships: [/* ... */],
  measures: [/* ... */]
});

// 8. Load data securely
await warehouse.insertData(
  'sensitive_sales_data',
  ['sale_date', 'customer_id', 'revenue', 'department'],
  [
    ['2024-01-01', 1, 1000, 'Marketing'],
    ['2024-01-02', 2, 1500, 'Sales']
  ]
);

// 9. Query with all security checks
const results = await security.executeSecureQuery(
  `
    SELECT
      sale_date,
      SUM(revenue) as total_revenue
    FROM sensitive_sales_data
    WHERE sale_date >= '2024-01-01'
    GROUP BY sale_date
  `,
  {
    userId: 'user-123',
    username: 'john.doe',
    roles: ['analyst'],
    attributes: { department: 'Marketing' },
    ipAddress: '192.168.1.100'
  }
);

// User only sees Marketing department data
// All access is logged for compliance
// Query performance is monitored
// Historical versions are tracked

// 10. Collect metrics
const currentMetrics = await metrics.collectMetrics();
await metrics.storeMetrics(currentMetrics);

// 11. Generate reports
const securityReport = await security.generateSecurityReport(
  new Date('2024-01-01'),
  new Date('2024-01-31')
);

const dataDictionary = await catalog.generateDataDictionary();

const lineageGraph = await lineage.getLineageGraph('sensitive_sales_data');

console.log('✅ Complete enterprise data warehouse deployed!');
console.log(`   - Security: ${securityReport.recommendations.length} recommendations`);
console.log(`   - Catalog: ${dataDictionary.length} chars documentation`);
console.log(`   - Lineage: ${lineageGraph.nodes.length} connected assets`);
console.log(`   - Metrics: ${currentMetrics.cacheHitRate * 100}% cache hit rate`);
```

## Best Practices

1. **Always use security.executeSecureQuery()** instead of direct pool.query()
2. **Enable time-travel on critical tables** for audit and recovery
3. **Register all assets in the catalog** for discoverability
4. **Track lineage for all transformations** to understand impact
5. **Create semantic models** for business users
6. **Monitor metrics continuously** and set up alerts
7. **Review security reports regularly** for compliance
8. **Use RLS and column security** instead of multiple physical tables
9. **Archive old audit logs** to manage storage
10. **Test security policies** before deploying to production

## Performance Tips

1. **Security adds ~5-10% overhead** - acceptable for compliance
2. **Time-travel uses ~2x storage** - plan capacity accordingly
3. **Catalog queries are fast** - metadata is indexed
4. **Lineage graphs scale** - use depth limits for large graphs
5. **Metrics collection is lightweight** - run every 1-5 minutes

## Compliance & Certifications

Summit Data Warehouse helps achieve:

- **SOC 2 Type II**: Comprehensive audit logging
- **GDPR**: Data masking, right to be forgotten, access logs
- **HIPAA**: Row/column security, encryption, audit trails
- **PCI DSS**: Credit card masking, access control
- **ISO 27001**: Security policies, monitoring, incident response
