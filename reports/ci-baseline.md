## make smoke baseline (Oct 16)
- jest duplicate manual mock: server/dist/__mocks__/utils/logger.js vs src/__mocks__/utils/logger.ts
- GraphQL integration suite gated behind RUN_GRAPHQL_INTEGRATION; setup.ts mocks still need stricter typing to avoid `never` warnings when re-enabled
- Client suites excluded in jest config (ModelManagementDashboard, etc.) still error on jest-dom matchers once re-enabled
- Distributed config tests require enableCaching typing updates
