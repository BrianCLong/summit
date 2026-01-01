# Progress Log

## 2026-01-01

### Completed

- Implemented durable PostgreSQL writes for usage events with batch support and regression tests.
- Added quota evaluation against plan limits with database-backed usage totals and assertion coverage.
- Tracked OPA decision cache hits/misses and exposed hit rate metrics with tests.
- Protected the monthly billing close job with PostgreSQL advisory locking and accompanying tests.

### Deferred / Notes

- Current quota enforcement maps only core dimensions (API requests, runtime, tokens, storage) to plan limits; extend mapping if additional dimensions become billable.
