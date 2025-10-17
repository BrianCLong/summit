Makefile:52: *** missing separator. Stop.
---
make smoke (after Makefile fix)
- jest duplicate manual mock: server/dist/__mocks__/utils/logger.js vs src/__mocks__/utils/logger.ts
- failures: server/tests/graph-operations (content-type expectations relaxed); ticket-links requires rows mock
- TypeError reading rows in ticket-links
