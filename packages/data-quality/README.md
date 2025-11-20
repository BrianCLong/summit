# @intelgraph/data-quality

Advanced data quality and profiling engine for analyzing datasets and generating statistical profiles.

## Features

- **Data Profiling**: Generate comprehensive statistical profiles of datasets
- **Column Analysis**: Analyze each column's data type, distribution, and quality
- **Quality Scoring**: Calculate overall data quality scores
- **Schema Comparison**: Compare profiles to detect schema changes
- **Statistics**: Min, max, mean, median, standard deviation
- **Top Values**: Most frequent values with counts and percentages
- **Histograms**: Distribution analysis for numeric data

## Installation

```bash
pnpm add @intelgraph/data-quality
```

## Quick Start

```typescript
import { DataProfiler } from '@intelgraph/data-quality';
import { createLogger } from 'winston';

const logger = createLogger();
const profiler = new DataProfiler(logger);

const data = [
  { name: 'John', age: 30, email: 'john@example.com' },
  { name: 'Jane', age: 25, email: 'jane@example.com' },
  { name: 'Bob', age: 35, email: 'bob@example.com' }
];

// Profile the dataset
const profile = await profiler.profileDataset(data, 'customers');

console.log('Quality Score:', profile.qualityScore);
console.log('Row Count:', profile.rowCount);
console.log('Columns:', profile.columns.length);

// Examine column profiles
for (const column of profile.columns) {
  console.log(`\nColumn: ${column.name}`);
  console.log(`  Type: ${column.dataType}`);
  console.log(`  Null Count: ${column.nullCount}`);
  console.log(`  Distinct Count: ${column.distinctCount}`);
  console.log(`  Completeness: ${(column.completeness * 100).toFixed(2)}%`);

  if (column.topValues) {
    console.log('  Top Values:', column.topValues);
  }
}
```

## Column Profile

Each column profile includes:

```typescript
interface ColumnProfile {
  name: string;
  dataType: string;  // inferred type
  nullCount: number;
  distinctCount: number;
  uniqueCount: number;
  min?: any;  // for numeric/date fields
  max?: any;
  mean?: number;  // for numeric fields
  median?: number;
  stdDev?: number;
  topValues?: Array<{ value: any; count: number; percentage: number }>;
  histogram?: Array<{ bin: string; count: number }>;
  completeness: number;  // 0-1 ratio
  uniqueness: number;  // 0-1 ratio
  examples: any[];  // sample values
}
```

## Dataset Profile

```typescript
interface DatasetProfile {
  tableName: string;
  rowCount: number;
  columnCount: number;
  totalSize: number;  // estimated bytes
  columns: ColumnProfile[];
  correlations?: Map<string, Map<string, number>>;
  profiledAt: Date;
  qualityScore: number;  // 0-100 score
}
```

## Schema Change Detection

Compare two profiles to detect schema changes:

```typescript
const oldProfile = await profiler.profileDataset(oldData, 'customers');
const newProfile = await profiler.profileDataset(newData, 'customers');

const changes = await profiler.compareProfiles(oldProfile, newProfile);

console.log('Column Changes:', changes.columnChanges);
console.log('Schema Changes:', changes.schemaChanges);
console.log('Data Changes:', changes.dataChanges);
```

## License

MIT
