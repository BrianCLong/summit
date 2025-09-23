# Billing Export Specification

## CSV
`tenant,cost,usageType,value`

## Parquet
Fields mirror CSV with schema annotations. All subject identifiers are masked and tenant IDs hashed.

