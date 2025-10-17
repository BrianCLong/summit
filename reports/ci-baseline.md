## make smoke baseline (Oct 16)
- jest duplicate manual mock: server/dist/__mocks__/utils/logger.js vs src/__mocks__/utils/logger.ts
- GraphQL integration suite gated behind RUN_GRAPHQL_INTEGRATION; current setup still fails TS checks in server/tests/setup.ts mocks
- Client suites excluded by jest config still error with missing jest-dom matchers when enabled (TODO: re-enable incrementally)
- Distributed config tests require prop typing updates for enableCaching/enableStreaming combo
- Ticket link integration still expects seeded runs; mocks guard undefined pools but real data absent during smoke
