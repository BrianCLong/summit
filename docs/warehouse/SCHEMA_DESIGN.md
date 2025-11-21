# Data Warehouse Schema Design Guide

## Dimensional Modeling Best Practices

### Star Schema Design

Star schemas are optimal for most analytical workloads:

```
┌─────────────────┐
│   Fact Table    │
│   fact_sales    │
├─────────────────┤
│ date_key   (FK) │──┐
│ product_key(FK) │──┼──┐
│ customer_key(FK)│──┼──┼──┐
│ store_key  (FK) │──┼──┼──┼──┐
│ quantity        │  │  │  │  │
│ revenue         │  │  │  │  │
│ cost            │  │  │  │  │
└─────────────────┘  │  │  │  │
                     │  │  │  │
                     ▼  ▼  ▼  ▼
     ┌──────────┬───────────┬────────────┬───────────┐
     │dim_date  │dim_product│dim_customer│dim_store  │
     └──────────┴───────────┴────────────┴───────────┘
```

### Snowflake Schema Design

Use when normalization reduces storage significantly:

```
fact_sales ──┬──> dim_product ──> dim_category
             ├──> dim_date
             ├──> dim_customer ──┬──> dim_region
             │                   └──> dim_segment
             └──> dim_store ────> dim_city
```

## Slowly Changing Dimensions

### SCD Type Selection Matrix

| Scenario | SCD Type | Use Case |
|----------|----------|----------|
| Overwrite old values | Type 1 | Current state only, history not needed |
| Track full history | Type 2 | Audit trail, historical reporting |
| Track current + previous | Type 3 | Limited history, fast queries |
| Separate history table | Type 4 | High-volume dimensions |
| Mini-dimension | Type 5 | Rapidly changing attributes |
| Hybrid approach | Type 6 | Best of Type 1, 2, and 3 |

### Implementation Examples

See [GUIDE.md](./GUIDE.md) for detailed implementation examples.

## Fact Table Design

### Grain Definition

Always define the grain (level of detail) explicitly:

- **Transaction grain**: One row per transaction
- **Periodic snapshot**: One row per time period
- **Accumulating snapshot**: One row per process instance

### Measure Types

1. **Additive**: Can be summed across all dimensions (e.g., revenue, quantity)
2. **Semi-additive**: Can be summed across some dimensions (e.g., account balance)
3. **Non-additive**: Cannot be summed (e.g., ratios, percentages)

## Partitioning Strategy

### Time-Based Partitioning

Recommended for:
- Time-series data
- Append-only workloads
- Regular data archival

```typescript
await warehouse.createTable({
  name: 'fact_sales',
  partitionStrategy: 'TIME',
  partitionKey: 'sale_date',
  partitionInterval: '1 month'
});
```

### Hash Partitioning

Recommended for:
- Even data distribution
- High-cardinality keys
- Point queries

```typescript
await warehouse.createTable({
  name: 'fact_transactions',
  partitionStrategy: 'HASH',
  partitionKey: 'transaction_id',
  partitionCount: 64
});
```

## Indexing Strategy

### Zone Maps

Automatically created for:
- Partition keys
- Sort keys
- Frequently filtered columns

### Sort Keys

Define sort keys that match query patterns:

```typescript
await warehouse.createTable({
  name: 'fact_events',
  sortKeys: ['event_date', 'event_type', 'user_id']
});
```

## Performance Optimization

### 1. Denormalization

Denormalize when:
- Join cost > storage cost
- Dimension changes rarely
- Query performance is critical

### 2. Pre-Aggregation

Create aggregate tables for:
- Common query patterns
- Dashboard metrics
- Real-time reporting

### 3. Columnar Encoding

Optimal encoding by data type:

| Data Type | Recommended Encoding |
|-----------|---------------------|
| Low cardinality strings | Dictionary |
| Sorted integers | Delta |
| Boolean/small integers | Bit-packing |
| High null percentage | Sparse |
| General purpose | RLE |

## Schema Evolution

### Adding Columns

```sql
ALTER TABLE fact_sales ADD COLUMN discount NUMERIC DEFAULT 0;
```

### Changing SCD Type

Migrate from Type 1 to Type 2:

```typescript
// 1. Add versioning columns
ALTER TABLE dim_product
  ADD COLUMN effective_date TIMESTAMP,
  ADD COLUMN expiry_date TIMESTAMP,
  ADD COLUMN is_current BOOLEAN;

// 2. Update existing rows
UPDATE dim_product
  SET effective_date = CURRENT_TIMESTAMP,
      is_current = TRUE;

// 3. Switch to Type 2 handling
await modeling.scdHandler.handleType2(...);
```

## Common Patterns

### Date Dimension

```typescript
await modeling.dimensionManager.createDimension('date', [
  'date_key',
  'full_date',
  'day_of_week',
  'day_of_month',
  'day_of_year',
  'week_of_year',
  'month',
  'quarter',
  'year',
  'is_weekend',
  'is_holiday'
]);
```

### Customer Dimension

```typescript
await modeling.dimensionManager.createDimension('customer', [
  'customer_key',
  'customer_id',
  'customer_name',
  'email',
  'segment',
  'region',
  'signup_date',
  'lifetime_value'
]);
```

### Product Dimension

```typescript
await modeling.dimensionManager.createDimension('product', [
  'product_key',
  'product_id',
  'product_name',
  'category',
  'subcategory',
  'brand',
  'unit_price',
  'unit_cost'
]);
```
