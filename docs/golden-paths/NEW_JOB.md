# Golden Path: New Job

## Checklist

- [ ] **File Location**: Processor created in `server/src/jobs/processors/<name>.processor.ts`.
- [ ] **Definition**: Job definition added to `server/src/jobs/job.definitions.ts`.
- [ ] **Registration**: Processor registered in `server/src/services/BatchJobService.ts` or `Worker` setup.
- [ ] **Idempotency**: Job logic handles retries gracefully (idempotent operations).
- [ ] **Logging**: Logs start, completion, and failure events.
- [ ] **Error Handling**: Throws errors explicitly to trigger retry mechanism (if applicable).
