import { persistedQueryService } from '../src/graphql/persisted-query-service.js';
import { persistedQueriesPlugin } from '../src/graphql/plugins/persistedQueries.js';
import { backpressureMiddleware } from '../src/middleware/graphql-backpressure.js';
import resolvers from '../src/graphql/resolvers/system.js';

console.log('Successfully imported Sprint 24 Step 1 artifacts');
