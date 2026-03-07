# Sprint 12K Learnings

## Mastery Framework

- Implemented `MasteryService` for managing Analyst Labs.
- Labs are defined in code (`definitions/`) but runs are persisted via `provenanceLedger`.
- **State Reconstruction**: To avoid in-memory state loss, `checkCertification` queries the ledger for `LAB_COMPLETE` events.
- **Immutability**: All significant events (Lab Start, Lab Complete, Certificate Issued) are logged to the immutable ledger.

## Testing

- Mocking `provenanceLedger` requires careful typing of `jest.Mock` and using `mockImplementation` to return Promises.
