## make bootstrap
==> bootstrap: node, python, envs
# Node: prefer corepack/pnpm if present, else npm
Scope: all 67 workspace projects
Lockfile is up to date, resolution step is skipped
Progress: resolved 1, reused 0, downloaded 0, added 0
Packages: +2699
++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
Progress: resolved 2699, reused 1033, downloaded 0, added 0
Progress: resolved 2699, reused 2666, downloaded 0, added 0
Progress: resolved 2699, reused 2666, downloaded 0, added 11, done
 ERR_PNPM_BAD_PACKAGE_JSON  /Users/brianlong/Developer/summit/node_modules/.pnpm/jest-config@29.7.0_@types+node@22.18.10_babel-plugin-macros@3.1.0_ts-node@10.9.2_@swc+core@1._2px3ac3jdlysrxpsw23vkamm2q/node_modules/@types/node/package.json: Unexpected non-whitespace character after JSON at position 4270 while parsing '{    "name": "@types/node",    "versio' in node_modules/.pnpm/jest-config@29.7.0_@types+node@22.18.10_babel-plugin-macros@3.1.0_ts-node@10.9.2_@swc+core@1._2px3ac3jdlysrxpsw23vkamm2q/node_modules/@types/node/package.json
Scope: all 67 workspace projects
Progress: resolved 0, reused 1, downloaded 0, added 0
apps/analytics-engine                    |  WARN  deprecated eslint@8.57.1
apps/intelgraph-api                      |  WARN  deprecated apollo-server-express@3.13.0
apps/mobile-interface                    |  WARN  deprecated @types/cytoscape@3.31.0
apps/mobile-interface                    |  WARN  deprecated @storybook/testing-library@0.2.2
apps/mobile-interface                    |  WARN  deprecated react-use-gesture@9.1.3
apps/search-engine                       |  WARN  deprecated elasticsearch@16.7.3
apps/server                              |  WARN  deprecated apollo-server@3.13.0
packages/maestro-core                    |  WARN  deprecated @opentelemetry/api-metrics@0.33.0
packages/maestro-core                    |  WARN  deprecated @opentelemetry/exporter-jaeger@1.17.0
packages/maestro-core                    |  WARN  deprecated crypto@1.0.1
server                                   |  WARN  deprecated @playwright/test@1.40.1
server                                   |  WARN  deprecated supertest@6.3.3
server                                   |  WARN  deprecated fluent-ffmpeg@2.1.3
server                                   |  WARN  deprecated json2csv@5.0.7
server                                   |  WARN  deprecated puppeteer@22.15.0
services/agent-runtime                   |  WARN  deprecated @types/bull@4.10.4
services/exporter                        |  WARN  deprecated supertest@6.3.4
services/api-gateway                     |  WARN  deprecated @apollo/server@4.12.2
Progress: resolved 322, reused 322, downloaded 0, added 0
services/authz-gateway                   |  WARN  deprecated @types/http-proxy-middleware@1.0.0
Progress: resolved 732, reused 667, downloaded 0, added 0
Progress: resolved 2064, reused 1883, downloaded 0, added 0
Progress: resolved 3219, reused 3044, downloaded 0, added 0
Progress: resolved 3750, reused 3581, downloaded 0, added 0
Progress: resolved 3788, reused 3619, downloaded 0, added 0
 WARN  39 deprecated subdependencies found: @apollo/server-gateway-interface@1.1.1, @graphql-tools/prisma-loader@8.0.17, @humanwhocodes/config-array@0.13.0, @humanwhocodes/object-schema@2.0.3, @opentelemetry/otlp-proto-exporter-base@0.48.0, @types/minimatch@6.0.0, @types/pino-pretty@5.0.0, @types/pino-std-serializers@4.0.0, abab@2.0.6, acorn-import-assertions@1.9.0, apollo-datasource@3.3.2, apollo-reporting-protobuf@3.4.0, apollo-server-core@3.13.0, apollo-server-env@4.2.1, apollo-server-errors@3.3.1, apollo-server-plugin-base@3.7.2, apollo-server-types@3.8.0, are-we-there-yet@2.0.0, domexception@4.0.0, gauge@3.0.2, glob@7.2.3, glob@8.1.0, inflight@1.0.6, lodash.get@4.4.2, lodash.isequal@4.5.0, node-domexception@1.0.0, npmlog@5.0.1, q@1.5.1, querystring@0.2.0, rimraf@2.6.3, rimraf@2.7.1, rimraf@3.0.2, rollup-plugin-terser@7.0.2, semver-diff@5.0.0, source-map@0.8.0-beta.0, sourcemap-codec@1.4.8, superagent@8.1.2, workbox-cacheable-response@6.6.0, workbox-google-analytics@6.6.0
Packages: +2699
++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
Progress: resolved 3788, reused 3619, downloaded 0, added 1
Progress: resolved 3788, reused 3619, downloaded 0, added 1, done
 ERR_PNPM_BAD_PACKAGE_JSON  /Users/brianlong/Developer/summit/node_modules/.pnpm/@types+node@22.18.10/node_modules/@types/node/package.json: Unexpected non-whitespace character after JSON at position 4270 while parsing '{    "name": "@types/node",    "versio' in node_modules/.pnpm/@types+node@22.18.10/node_modules/@types/node/package.json
make: *** [bootstrap] Error 1

## make up
==> up: best-effort bring-up (no-op if stack not containerized)
 opa Pulling 
 opa Error failed to resolve reference "docker.io/openpolicyagent/opa:0.65.0-rootless": docker.io/openpolicyagent/opa:0.65.0-rootless: not found
Error response from daemon: failed to resolve reference "docker.io/openpolicyagent/opa:0.65.0-rootless": docker.io/openpolicyagent/opa:0.65.0-rootless: not found
 opa Pulling 
 opa Error failed to resolve reference "docker.io/openpolicyagent/opa:0.65.0-rootless": docker.io/openpolicyagent/opa:0.65.0-rootless: not found
Error response from daemon: failed to resolve reference "docker.io/openpolicyagent/opa:0.65.0-rootless": docker.io/openpolicyagent/opa:0.65.0-rootless: not found
make: *** [up] Error 1

## make smoke
==> smoke: lightweight sanity checks
# JS/TS tests if present

> intelgraph-platform@1.0.0 test:jest /Users/brianlong/Developer/summit
> jest --config jest.projects.cjs --maxWorkers=50% --detectOpenHandles

jest-haste-map: duplicate manual mock found: utils/logger
  The following files share their name; please delete one of them:
    * <rootDir>/server/dist/__mocks__/utils/logger.js
    * <rootDir>/server/src/__mocks__/utils/logger.ts

PASS server server/src/tests/integrationService.test.js
PASS server server/src/tests/simulationEngine.test.js
PASS server server/src/tests/pluginService.test.js
PASS server server/src/tests/mobileService.test.js
PASS server server/src/tests/visualizationService.test.js
PASS server server/src/tests/reportingService.test.js
PASS server server/src/tests/copilotOrchestration.test.js (10.103 s)
PASS server server/src/tests/enterpriseSecurity.test.js
PASS server server/src/tests/advancedAnalytics.test.js
PASS server server/src/tests/aiExtraction.test.js (8.61 s)
PASS server server/src/tests/copilot.persistence.test.js
FAIL server server/tests/graph-operations.test.js (10.766 s)
  ● Graph Operations Tests › Graph Export Functionality › should export graph as CSV

    expect(received).toBe(expected) // Object.is equality

    Expected: "text/csv; charset=utf-8"
    Received: "text/csv"

      183 |         .expect(200);
      184 |
    > 185 |       expect(response.type).toBe('text/csv; charset=utf-8');
          |                             ^
      186 |       expect(response.text).toContain('Nodes');
      187 |       expect(response.text).toContain('Edges');
      188 |       expect(response.text).toContain('id,label,type');

      at Object.<anonymous> (server/tests/graph-operations.test.js:185:29)

  ● Graph Operations Tests › Graph Export Functionality › should export graph as GraphML

    expect(received).toBe(expected) // Object.is equality

    Expected: "application/xml; charset=utf-8"
    Received: "application/xml"

      195 |         .expect(200);
      196 |
    > 197 |       expect(response.type).toBe('application/xml; charset=utf-8');
          |                             ^
      198 |       expect(response.text).toContain('<?xml');
      199 |       expect(response.text).toContain('<graphml');
      200 |       expect(response.text).toContain('<node id=');

      at Object.<anonymous> (server/tests/graph-operations.test.js:197:29)

  ● Graph Operations Tests › Graph Export Functionality › should stream large graph exports

    expect(received).toBe(expected) // Object.is equality

    Expected: "chunked"
    Received: undefined

      222 |           // We can't check the full body because it's a stream
      223 |           // but we can check that the response is chunked
    > 224 |           expect(res.headers['transfer-encoding']).toBe('chunked');
          |                                                    ^
      225 |           done();
      226 |         });
      227 |     });

      at Test.<anonymous> (server/tests/graph-operations.test.js:224:52)
      at Test.assert (node_modules/.pnpm/supertest@6.3.3/node_modules/supertest/lib/test.js:172:8)
      at Server.localAssert (node_modules/.pnpm/supertest@6.3.3/node_modules/supertest/lib/test.js:120:14)

  ● Graph Operations Tests › Graph Export Functionality › should stream large graph exports

    thrown: "Exceeded timeout of 5000 ms for a test while waiting for `done()` to be called.
    Add a timeout value to this test to increase the timeout, if this is a long-running test. See https://jestjs.io/docs/api#testname-fn-timeout."

      27 | globalThis.it = Object.assign((name, fn, t) => {
      28 |   if (q.some((s) => name.includes(s))) return orig.skip(name, fn, t);
    > 29 |   return orig(name, fn, t);
         |          ^
      30 | }, orig);
      31 |
      32 | try {

      at jest.setup.js:29:10
      at server/tests/graph-operations.test.js:212:5
      at server/tests/graph-operations.test.js:165:3
      at Object.<anonymous> (server/tests/graph-operations.test.js:158:1)

  ● Graph Operations Tests › Performance and Stress Tests › should stream large graph exports

    expect(received).toBe(expected) // Object.is equality

    Expected: "chunked"
    Received: undefined

      507 |           // We can't check the full body because it's a stream
      508 |           // but we can check that the response is chunked
    > 509 |           expect(res.headers['transfer-encoding']).toBe('chunked');
          |                                                    ^
      510 |           done();
      511 |         });
      512 |     });

      at Test.<anonymous> (server/tests/graph-operations.test.js:509:52)
      at Test.assert (node_modules/.pnpm/supertest@6.3.3/node_modules/supertest/lib/test.js:172:8)
      at Server.localAssert (node_modules/.pnpm/supertest@6.3.3/node_modules/supertest/lib/test.js:120:14)

  ● Graph Operations Tests › Performance and Stress Tests › should stream large graph exports

    thrown: "Exceeded timeout of 5000 ms for a test while waiting for `done()` to be called.
    Add a timeout value to this test to increase the timeout, if this is a long-running test. See https://jestjs.io/docs/api#testname-fn-timeout."

      27 | globalThis.it = Object.assign((name, fn, t) => {
      28 |   if (q.some((s) => name.includes(s))) return orig.skip(name, fn, t);
    > 29 |   return orig(name, fn, t);
         |          ^
      30 | }, orig);
      31 |
      32 | try {

      at jest.setup.js:29:10
      at server/tests/graph-operations.test.js:497:5
      at server/tests/graph-operations.test.js:438:3
      at Object.<anonymous> (server/tests/graph-operations.test.js:158:1)

  ● Graph Operations Tests › Error Handling › should handle invalid filter parameters

    expect(received).toContain(expected) // indexOf

    Expected value: 500
    Received array: [200, 400]

      534 |
      535 |       // Should handle gracefully
    > 536 |       expect([200, 400]).toContain(response.status);
          |                          ^
      537 |     });
      538 |
      539 |     it('should handle negative pagination parameters', async () => {

      at Object.<anonymous> (server/tests/graph-operations.test.js:536:26)

ts-jest[ts-jest-transformer] (WARN) Define `ts-jest` config under `globals` is deprecated. Please do
transform: {
    <transform_regex>: ['ts-jest', { /* ts-jest config goes here in Jest */ }],
},
See more at https://kulshekhar.github.io/ts-jest/docs/getting-started/presets#advanced
FAIL server server/tests/integration/graphql.test.ts
  ● Test suite failed to run

    [96mserver/tests/integration/graphql.test.ts[0m:[93m2[0m:[93m30[0m - [91merror[0m[90m TS2307: [0mCannot find module '../../src/server' or its corresponding type declarations.

    [7m2[0m import { createServer } from '../../src/server';
    [7m [0m [91m                             ~~~~~~~~~~~~~~~~~~[0m
    [96mserver/tests/integration/graphql.test.ts[0m:[93m157[0m:[93m64[0m - [91merror[0m[90m TS2345: [0mArgument of type 'any' is not assignable to parameter of type 'never'.

    [7m157[0m       jest.spyOn(global.testDb, 'query').mockResolvedValueOnce({
    [7m   [0m [91m                                                               ~[0m
    [7m158[0m         rows: [testCase1, testCase2],
    [7m   [0m [91m~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
    [7m159[0m         rowCount: 2,
    [7m   [0m [91m~~~~~~~~~~~~~~~~~~~~[0m
    [7m160[0m       } as any);
    [7m   [0m [91m~~~~~~~~~~~~~~[0m
    [96mserver/tests/integration/graphql.test.ts[0m:[93m496[0m:[93m32[0m - [91merror[0m[90m TS2345: [0mArgument of type 'Error' is not assignable to parameter of type 'never'.

    [7m496[0m         .mockRejectedValueOnce(new Error('Database connection failed'));
    [7m   [0m [91m                               ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m

PASS server server/src/tests/dockerSecurity.test.js
  ● Console

    console.log
      Info: Could add docker:security script to package.json

      at Object.<anonymous> (server/src/tests/dockerSecurity.test.js:299:17)

ts-jest[ts-jest-transformer] (WARN) Define `ts-jest` config under `globals` is deprecated. Please do
transform: {
    <transform_regex>: ['ts-jest', { /* ts-jest config goes here in Jest */ }],
},
See more at https://kulshekhar.github.io/ts-jest/docs/getting-started/presets#advanced
FAIL client client/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx
  ● Test suite failed to run

    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m24[0m:[93m59[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m24[0m     expect(screen.getByText(/🤖 MLOps Model Management/)).toBeInTheDocument();
    [7m  [0m [91m                                                          ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m30[0m:[93m43[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m30[0m     expect(screen.getByText(/🎯 Models/)).toBeInTheDocument();
    [7m  [0m [91m                                          ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m31[0m:[93m51[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m31[0m     expect(screen.getByText(/🏋️ Training Jobs/)).toBeInTheDocument();
    [7m  [0m [91m                                                  ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m32[0m:[93m48[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m32[0m     expect(screen.getByText(/🧪 Experiments/)).toBeInTheDocument();
    [7m  [0m [91m                                               ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m33[0m:[93m47[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m33[0m     expect(screen.getByText(/📊 Monitoring/)).toBeInTheDocument();
    [7m  [0m [91m                                              ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m41[0m:[93m7[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m41[0m     ).toBeInTheDocument();
    [7m  [0m [91m      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m42[0m:[93m52[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m42[0m     expect(screen.getByDisplayValue('All Status')).toBeInTheDocument();
    [7m  [0m [91m                                                   ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m48[0m:[93m43[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m48[0m     expect(screen.getByText(/ML Models/)).toBeInTheDocument();
    [7m  [0m [91m                                          ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m52[0m:[93m7[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m52[0m     ).toBeInTheDocument();
    [7m  [0m [91m      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m53[0m:[93m60[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m53[0m     expect(screen.getByText('Anomaly Detection Ensemble')).toBeInTheDocument();
    [7m  [0m [91m                                                           ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m56[0m:[93m7[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m56[0m     ).toBeInTheDocument();
    [7m  [0m [91m      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m67[0m:[93m7[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m67[0m     ).toBeInTheDocument();
    [7m  [0m [91m      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m68[0m:[93m54[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m68[0m     expect(screen.getByText(/Training Job job-001/)).toBeInTheDocument();
    [7m  [0m [91m                                                     ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m72[0m:[93m48[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m72[0m     expect(screen.getByText(/ML Experiments/)).toBeInTheDocument();
    [7m  [0m [91m                                               ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m75[0m:[93m7[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m75[0m     ).toBeInTheDocument();
    [7m  [0m [91m      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m81[0m:[93m7[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m81[0m     ).toBeInTheDocument();
    [7m  [0m [91m      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m96[0m:[93m7[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m96[0m     ).toBeInTheDocument();
    [7m  [0m [91m      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m99[0m:[93m11[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'Matchers<void, HTMLElement>'.

    [7m99[0m     ).not.toBeInTheDocument();
    [7m  [0m [91m          ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m109[0m:[93m26[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveValue' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m109[0m     expect(statusSelect).toHaveValue('production');
    [7m   [0m [91m                         ~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m113[0m:[93m7[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m113[0m     ).toBeInTheDocument();
    [7m   [0m [91m      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m130[0m:[93m47[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m130[0m     expect(screen.getByText('Model Details')).toBeInTheDocument();
    [7m   [0m [91m                                              ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m131[0m:[93m53[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m131[0m     expect(screen.getByText(/Performance Metrics/)).toBeInTheDocument();
    [7m   [0m [91m                                                    ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m132[0m:[93m51[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m132[0m     expect(screen.getByText(/Model Information/)).toBeInTheDocument();
    [7m   [0m [91m                                                  ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m164[0m:[93m43[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m164[0m     expect(screen.getByText(/🚀 Deploy/)).toBeInTheDocument();
    [7m   [0m [91m                                          ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m175[0m:[93m49[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'Matchers<void, HTMLElement>'.

    [7m175[0m     expect(screen.queryByText(/🚀 Deploy/)).not.toBeInTheDocument();
    [7m   [0m [91m                                                ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m197[0m:[93m48[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m197[0m       expect(screen.getByText(/Deploying.../)).toBeInTheDocument();
    [7m   [0m [91m                                               ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m213[0m:[93m58[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m213[0m     expect(screen.getByText(hasText('Accuracy: 94.2%'))).toBeInTheDocument();
    [7m   [0m [91m                                                         ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m214[0m:[93m59[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m214[0m     expect(screen.getByText(hasText('Precision: 92.8%'))).toBeInTheDocument();
    [7m   [0m [91m                                                          ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m215[0m:[93m56[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m215[0m     expect(screen.getByText(hasText('Recall: 95.6%'))).toBeInTheDocument();
    [7m   [0m [91m                                                       ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m216[0m:[93m58[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m216[0m     expect(screen.getByText(hasText('F1 Score: 94.2%'))).toBeInTheDocument();
    [7m   [0m [91m                                                         ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m227[0m:[93m47[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m227[0m     expect(screen.getByText(/Python: 3.9.7/)).toBeInTheDocument();
    [7m   [0m [91m                                              ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m228[0m:[93m55[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m228[0m     expect(screen.getByText(/Hardware: NVIDIA V100/)).toBeInTheDocument();
    [7m   [0m [91m                                                      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m229[0m:[93m51[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m229[0m     expect(screen.getByText(/tensorflow: 2.8.0/)).toBeInTheDocument();
    [7m   [0m [91m                                                  ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m240[0m:[93m37[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m240[0m     expect(screen.getByText(/67%/)).toBeInTheDocument();
    [7m   [0m [91m                                    ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m241[0m:[93m41[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m241[0m     expect(screen.getByText(/RUNNING/)).toBeInTheDocument();
    [7m   [0m [91m                                        ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m242[0m:[93m43[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m242[0m     expect(screen.getByText(/COMPLETED/)).toBeInTheDocument();
    [7m   [0m [91m                                          ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m253[0m:[93m42[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m253[0m     expect(screen.getByText(/GPU: 87%/)).toBeInTheDocument();
    [7m   [0m [91m                                         ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m254[0m:[93m42[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m254[0m     expect(screen.getByText(/CPU: 34%/)).toBeInTheDocument();
    [7m   [0m [91m                                         ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m255[0m:[93m45[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m255[0m     expect(screen.getByText(/Memory: 78%/)).toBeInTheDocument();
    [7m   [0m [91m                                            ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m270[0m:[93m46[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m270[0m     expect(screen.getByText(/Epoch 33\/50/)).toBeInTheDocument();
    [7m   [0m [91m                                             ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m305[0m:[93m55[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m305[0m     expect(screen.getByText(/Best Model: model-001/)).toBeInTheDocument();
    [7m   [0m [91m                                                      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m306[0m:[93m54[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m306[0m     expect(screen.getByText(/Improvement: \+12.3%/)).toBeInTheDocument();
    [7m   [0m [91m                                                     ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m307[0m:[93m47[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m307[0m     expect(screen.getByText(/Key Insights:/)).toBeInTheDocument();
    [7m   [0m [91m                                              ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m320[0m:[93m7[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m320[0m     ).toBeInTheDocument();
    [7m   [0m [91m      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m323[0m:[93m7[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m323[0m     ).toBeInTheDocument();
    [7m   [0m [91m      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m331[0m:[93m43[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m331[0m     expect(screen.getByText(/ML Models/)).toBeInTheDocument();
    [7m   [0m [91m                                          ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m345[0m:[93m23[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveClass' does not exist on type 'JestMatchers<Element>'.

    [7m345[0m     expect(container).toHaveClass('custom-mlops-class');
    [7m   [0m [91m                      ~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m352[0m:[93m44[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m352[0m     expect(screen.getByText(/PRODUCTION/)).toBeInTheDocument();
    [7m   [0m [91m                                           ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m353[0m:[93m41[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m353[0m     expect(screen.getByText(/STAGING/)).toBeInTheDocument();
    [7m   [0m [91m                                        ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m354[0m:[93m45[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m354[0m     expect(screen.getByText(/DEVELOPMENT/)).toBeInTheDocument();
    [7m   [0m [91m                                            ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m361[0m:[93m51[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m361[0m     expect(screen.getByText('entity-resolution')).toBeInTheDocument();
    [7m   [0m [91m                                                  ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m362[0m:[93m48[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m362[0m     expect(screen.getByText('neural-network')).toBeInTheDocument();
    [7m   [0m [91m                                               ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m363[0m:[93m44[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m363[0m     expect(screen.getByText('production')).toBeInTheDocument();
    [7m   [0m [91m                                           ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m376[0m:[93m49[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m376[0m     expect(screen.getByText(/ML Models \(0\)/)).toBeInTheDocument();
    [7m   [0m [91m                                                ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m384[0m:[93m51[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m384[0m     expect(screen.getByText(/🎯 Models \(\d+\)/)).toBeInTheDocument();
    [7m   [0m [91m                                                  ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m393[0m:[93m51[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m393[0m     expect(screen.getByText(/🎯 Models \(\d+\)/)).toBeInTheDocument();
    [7m   [0m [91m                                                  ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m404[0m:[93m43[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m404[0m     expect(screen.getByText(/Endpoints/)).toBeInTheDocument();
    [7m   [0m [91m                                          ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m407[0m:[93m7[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m407[0m     ).toBeInTheDocument();
    [7m   [0m [91m      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m426[0m:[93m7[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m426[0m     ).toBeInTheDocument();
    [7m   [0m [91m      ~~~~~~~~~~~~~~~~~[0m

FAIL client client/src/components/ai-enhanced/__tests__/EnhancedAIAssistant.test.tsx
  ● Test suite failed to run

    [96mclient/src/components/ai-enhanced/__tests__/EnhancedAIAssistant.test.tsx[0m:[93m63[0m:[93m53[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m63[0m     expect(screen.getByText(/Hello! I'm IntelBot/)).toBeInTheDocument();
    [7m  [0m [91m                                                    ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/ai-enhanced/__tests__/EnhancedAIAssistant.test.tsx[0m:[93m66[0m:[93m7[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveTextContent' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m66[0m     ).toHaveTextContent(/Online/);
    [7m  [0m [91m      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/ai-enhanced/__tests__/EnhancedAIAssistant.test.tsx[0m:[93m72[0m:[93m42[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m72[0m     expect(screen.getByText('IntelBot')).toBeInTheDocument();
    [7m  [0m [91m                                         ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/ai-enhanced/__tests__/EnhancedAIAssistant.test.tsx[0m:[93m75[0m:[93m7[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveTextContent' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m75[0m     ).toHaveTextContent(/Intelligence Analysis Assistant • Online/);
    [7m  [0m [91m      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/ai-enhanced/__tests__/EnhancedAIAssistant.test.tsx[0m:[93m147[0m:[93m47[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveTextContent' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m147[0m     expect(await screen.findByRole('status')).toHaveTextContent(/Online/);
    [7m   [0m [91m                                              ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/ai-enhanced/__tests__/EnhancedAIAssistant.test.tsx[0m:[93m188[0m:[93m24[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeDisabled' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m188[0m     expect(sendButton).toBeDisabled();
    [7m   [0m [91m                       ~~~~~~~~~~~~[0m
    [96mclient/src/components/ai-enhanced/__tests__/EnhancedAIAssistant.test.tsx[0m:[93m248[0m:[93m23[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveAttribute' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m248[0m     expect(micButton).toHaveAttribute('aria-label', 'Start Voice');
    [7m   [0m [91m                      ~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/ai-enhanced/__tests__/EnhancedAIAssistant.test.tsx[0m:[93m255[0m:[93m57[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m255[0m     expect(await screen.findByLabelText(/stop voice/i)).toBeInTheDocument();
    [7m   [0m [91m                                                        ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/ai-enhanced/__tests__/EnhancedAIAssistant.test.tsx[0m:[93m264[0m:[93m23[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeDisabled' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m264[0m     expect(micButton).toBeDisabled();
    [7m   [0m [91m                      ~~~~~~~~~~~~[0m
    [96mclient/src/components/ai-enhanced/__tests__/EnhancedAIAssistant.test.tsx[0m:[93m277[0m:[93m26[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeDisabled' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m277[0m       expect(sendButton).toBeDisabled();
    [7m   [0m [91m                         ~~~~~~~~~~~~[0m
    [96mclient/src/components/ai-enhanced/__tests__/EnhancedAIAssistant.test.tsx[0m:[93m284[0m:[93m53[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m284[0m     expect(screen.getByText(/Hello! I'm IntelBot/)).toBeInTheDocument();
    [7m   [0m [91m                                                    ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/ai-enhanced/__tests__/EnhancedAIAssistant.test.tsx[0m:[93m285[0m:[93m43[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'Matchers<void, HTMLElement>'.

    [7m285[0m     expect(screen.queryByText('   ')).not.toBeInTheDocument();
    [7m   [0m [91m                                          ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/ai-enhanced/__tests__/EnhancedAIAssistant.test.tsx[0m:[93m310[0m:[93m19[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveValue' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m310[0m     expect(input).toHaveValue(expect.stringContaining('This is line one'));
    [7m   [0m [91m                  ~~~~~~~~~~~[0m
    [96mclient/src/components/ai-enhanced/__tests__/EnhancedAIAssistant.test.tsx[0m:[93m311[0m:[93m19[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveValue' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m311[0m     expect(input).toHaveValue(expect.stringContaining('This is line two'));
    [7m   [0m [91m                  ~~~~~~~~~~~[0m
    [96mclient/src/components/ai-enhanced/__tests__/EnhancedAIAssistant.test.tsx[0m:[93m344[0m:[93m19[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m344[0m     expect(input).toBeInTheDocument();
    [7m   [0m [91m                  ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/ai-enhanced/__tests__/EnhancedAIAssistant.test.tsx[0m:[93m347[0m:[93m51[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m347[0m     expect(screen.getByLabelText(/start voice/i)).toBeInTheDocument();
    [7m   [0m [91m                                                  ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/ai-enhanced/__tests__/EnhancedAIAssistant.test.tsx[0m:[93m348[0m:[93m47[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m348[0m     expect(screen.getByLabelText('Settings')).toBeInTheDocument();
    [7m   [0m [91m                                              ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/ai-enhanced/__tests__/EnhancedAIAssistant.test.tsx[0m:[93m349[0m:[93m44[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m349[0m     expect(screen.getByLabelText(/send/i)).toBeInTheDocument();
    [7m   [0m [91m                                           ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/ai-enhanced/__tests__/EnhancedAIAssistant.test.tsx[0m:[93m352[0m:[93m47[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveAttribute' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m352[0m     expect(screen.getByTestId('message-log')).toHaveAttribute('role', 'log');
    [7m   [0m [91m                                              ~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/ai-enhanced/__tests__/EnhancedAIAssistant.test.tsx[0m:[93m355[0m:[93m7[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m355[0m     ).toBeInTheDocument();
    [7m   [0m [91m      ~~~~~~~~~~~~~~~~~[0m

FAIL server server/src/tests/warRoomSync.test.js (5.118 s)
  ● War Room Graph Sync - P0 Critical MVP1 › P0 Requirement: <300ms Latency › should initialize war room in under 50ms

    thrown: "Exceeded timeout of 5000 ms for a hook while waiting for `done()` to be called.
    Add a timeout value to this test to increase the timeout, if this is a long-running test. See https://jestjs.io/docs/api#testname-fn-timeout."

      14 |   let httpServer;
      15 |
    > 16 |   beforeAll((done) => {
         |   ^
      17 |     httpServer = createServer();
      18 |     io = new Server(httpServer);
      19 |

      at server/src/tests/warRoomSync.test.js:16:3
      at Object.<anonymous> (server/src/tests/warRoomSync.test.js:11:1)

  ● War Room Graph Sync - P0 Critical MVP1 › P0 Requirement: <300ms Latency › should handle graph operations with <300ms latency

    thrown: "Exceeded timeout of 5000 ms for a hook while waiting for `done()` to be called.
    Add a timeout value to this test to increase the timeout, if this is a long-running test. See https://jestjs.io/docs/api#testname-fn-timeout."

      14 |   let httpServer;
      15 |
    > 16 |   beforeAll((done) => {
         |   ^
      17 |     httpServer = createServer();
      18 |     io = new Server(httpServer);
      19 |

      at server/src/tests/warRoomSync.test.js:16:3
      at Object.<anonymous> (server/src/tests/warRoomSync.test.js:11:1)

  ● War Room Graph Sync - P0 Critical MVP1 › P0 Requirement: <300ms Latency › should handle concurrent operations without conflicts

    thrown: "Exceeded timeout of 5000 ms for a hook while waiting for `done()` to be called.
    Add a timeout value to this test to increase the timeout, if this is a long-running test. See https://jestjs.io/docs/api#testname-fn-timeout."

      14 |   let httpServer;
      15 |
    > 16 |   beforeAll((done) => {
         |   ^
      17 |     httpServer = createServer();
      18 |     io = new Server(httpServer);
      19 |

      at server/src/tests/warRoomSync.test.js:16:3
      at Object.<anonymous> (server/src/tests/warRoomSync.test.js:11:1)

  ● War Room Graph Sync - P0 Critical MVP1 › P0 Requirement: <300ms Latency › should resolve conflicts quickly

    thrown: "Exceeded timeout of 5000 ms for a hook while waiting for `done()` to be called.
    Add a timeout value to this test to increase the timeout, if this is a long-running test. See https://jestjs.io/docs/api#testname-fn-timeout."

      14 |   let httpServer;
      15 |
    > 16 |   beforeAll((done) => {
         |   ^
      17 |     httpServer = createServer();
      18 |     io = new Server(httpServer);
      19 |

      at server/src/tests/warRoomSync.test.js:16:3
      at Object.<anonymous> (server/src/tests/warRoomSync.test.js:11:1)

  ● War Room Graph Sync - P0 Critical MVP1 › Operational Transform › should transform concurrent operations correctly

    thrown: "Exceeded timeout of 5000 ms for a hook while waiting for `done()` to be called.
    Add a timeout value to this test to increase the timeout, if this is a long-running test. See https://jestjs.io/docs/api#testname-fn-timeout."

      14 |   let httpServer;
      15 |
    > 16 |   beforeAll((done) => {
         |   ^
      17 |     httpServer = createServer();
      18 |     io = new Server(httpServer);
      19 |

      at server/src/tests/warRoomSync.test.js:16:3
      at Object.<anonymous> (server/src/tests/warRoomSync.test.js:11:1)

  ● War Room Graph Sync - P0 Critical MVP1 › Performance Metrics › should track performance metrics accurately

    thrown: "Exceeded timeout of 5000 ms for a hook while waiting for `done()` to be called.
    Add a timeout value to this test to increase the timeout, if this is a long-running test. See https://jestjs.io/docs/api#testname-fn-timeout."

      14 |   let httpServer;
      15 |
    > 16 |   beforeAll((done) => {
         |   ^
      17 |     httpServer = createServer();
      18 |     io = new Server(httpServer);
      19 |

      at server/src/tests/warRoomSync.test.js:16:3
      at Object.<anonymous> (server/src/tests/warRoomSync.test.js:11:1)

  ● War Room Graph Sync - P0 Critical MVP1 › Performance Metrics › should provide room statistics

    thrown: "Exceeded timeout of 5000 ms for a hook while waiting for `done()` to be called.
    Add a timeout value to this test to increase the timeout, if this is a long-running test. See https://jestjs.io/docs/api#testname-fn-timeout."

      14 |   let httpServer;
      15 |
    > 16 |   beforeAll((done) => {
         |   ^
      17 |     httpServer = createServer();
      18 |     io = new Server(httpServer);
      19 |

      at server/src/tests/warRoomSync.test.js:16:3
      at Object.<anonymous> (server/src/tests/warRoomSync.test.js:11:1)

  ● War Room Graph Sync - P0 Critical MVP1 › Error Handling › should handle invalid operations gracefully

    thrown: "Exceeded timeout of 5000 ms for a hook while waiting for `done()` to be called.
    Add a timeout value to this test to increase the timeout, if this is a long-running test. See https://jestjs.io/docs/api#testname-fn-timeout."

      14 |   let httpServer;
      15 |
    > 16 |   beforeAll((done) => {
         |   ^
      17 |     httpServer = createServer();
      18 |     io = new Server(httpServer);
      19 |

      at server/src/tests/warRoomSync.test.js:16:3
      at Object.<anonymous> (server/src/tests/warRoomSync.test.js:11:1)

  ● War Room Graph Sync - P0 Critical MVP1 › Error Handling › should handle user permission violations

    thrown: "Exceeded timeout of 5000 ms for a hook while waiting for `done()` to be called.
    Add a timeout value to this test to increase the timeout, if this is a long-running test. See https://jestjs.io/docs/api#testname-fn-timeout."

      14 |   let httpServer;
      15 |
    > 16 |   beforeAll((done) => {
         |   ^
      17 |     httpServer = createServer();
      18 |     io = new Server(httpServer);
      19 |

      at server/src/tests/warRoomSync.test.js:16:3
      at Object.<anonymous> (server/src/tests/warRoomSync.test.js:11:1)

PASS server server/src/tests/multimodalData.test.js
FAIL server server/tests/graphql.test.ts
  ● Test suite failed to run

    [96mserver/src/app.ts[0m:[93m30[0m:[93m36[0m - [91merror[0m[90m TS1343: [0mThe 'import.meta' meta-property is only allowed when the '--module' option is 'es2020', 'es2022', 'esnext', 'system', 'node16', 'node18', 'node20', or 'nodenext'.

    [7m30[0m   const __filename = fileURLToPath(import.meta.url);
    [7m  [0m [91m                                   ~~~~~~~~~~~[0m

FAIL server server/tests/ai-integration.test.js
  ● AI Integration Tests › Performance Tests › should handle large webhook payloads

    expected 200 "OK", got 413 "Payload Too Large"

      437 |         .post('/ai/webhook')
      438 |         .send(largePayload)
    > 439 |         .expect(200);
          |          ^
      440 |
      441 |       expect(response.body.ok).toBe(true);
      442 |       expect(response.body.kind).toBe('nlp_entities');

      at Object.<anonymous> (server/tests/ai-integration.test.js:439:10)
      ----
      at Test._assertStatus (node_modules/.pnpm/supertest@6.3.3/node_modules/supertest/lib/test.js:252:14)
      at node_modules/.pnpm/supertest@6.3.3/node_modules/supertest/lib/test.js:308:13
      at Test._assertFunction (node_modules/.pnpm/supertest@6.3.3/node_modules/supertest/lib/test.js:285:13)
      at Test.assert (node_modules/.pnpm/supertest@6.3.3/node_modules/supertest/lib/test.js:164:23)
      at Server.localAssert (node_modules/.pnpm/supertest@6.3.3/node_modules/supertest/lib/test.js:120:14)

FAIL server server/src/conductor/__tests__/conductor.integration.test.ts
  ● Test suite failed to run

    [96mserver/src/conductor/index.ts[0m:[93m136[0m:[93m17[0m - [91merror[0m[90m TS2339: [0mProperty 'runId' does not exist on type 'ConductInput'.

    [7m136[0m       if (input.runId) {
    [7m   [0m [91m                ~~~~~[0m
    [96mserver/src/conductor/index.ts[0m:[93m137[0m:[93m52[0m - [91merror[0m[90m TS2339: [0mProperty 'runId' does not exist on type 'ConductInput'.

    [7m137[0m         const runRecord = await runsRepo.get(input.runId, tenantId);
    [7m   [0m [91m                                                   ~~~~~[0m
    [96mserver/src/conductor/index.ts[0m:[93m205[0m:[93m19[0m - [91merror[0m[90m TS2339: [0mProperty 'runId' does not exist on type 'ConductInput'.

    [7m205[0m         if (input.runId) {
    [7m   [0m [91m                  ~~~~~[0m
    [96mserver/src/conductor/index.ts[0m:[93m207[0m:[93m19[0m - [91merror[0m[90m TS2339: [0mProperty 'runId' does not exist on type 'ConductInput'.

    [7m207[0m             input.runId,
    [7m   [0m [91m                  ~~~~~[0m
    [96mserver/src/conductor/index.ts[0m:[93m216[0m:[93m26[0m - [91merror[0m[90m TS2339: [0mProperty 'runId' does not exist on type 'ConductInput'.

    [7m216[0m             runId: input.runId,
    [7m   [0m [91m                         ~~~~~[0m

FAIL client client/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx
  ● Test suite failed to run

    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m84[0m:[93m57[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m84[0m     expect(screen.getByText('Advanced Graph Analysis')).toBeInTheDocument();
    [7m  [0m [91m                                                        ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m85[0m:[93m50[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m85[0m     expect(screen.getByText('3 nodes, 2 edges')).toBeInTheDocument();
    [7m  [0m [91m                                                 ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m96[0m:[93m7[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m96[0m     ).toBeInTheDocument();
    [7m  [0m [91m      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m99[0m:[93m7[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m99[0m     ).toBeInTheDocument();
    [7m  [0m [91m      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m102[0m:[93m7[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m102[0m     ).toBeInTheDocument();
    [7m   [0m [91m      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m105[0m:[93m7[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m105[0m     ).toBeInTheDocument();
    [7m   [0m [91m      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m106[0m:[93m61[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m106[0m     expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
    [7m   [0m [91m                                                            ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m114[0m:[93m41[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m114[0m     expect(screen.getByText('Metrics')).toBeInTheDocument();
    [7m   [0m [91m                                        ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m115[0m:[93m41[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m115[0m     expect(screen.getByText('Filters')).toBeInTheDocument();
    [7m   [0m [91m                                        ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m116[0m:[93m45[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m116[0m     expect(screen.getByText('Communities')).toBeInTheDocument();
    [7m   [0m [91m                                            ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m117[0m:[93m45[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m117[0m     expect(screen.getByText('Pathfinding')).toBeInTheDocument();
    [7m   [0m [91m                                            ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m125[0m:[93m50[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m125[0m     expect(screen.getByText('Network Analysis')).toBeInTheDocument();
    [7m   [0m [91m                                                 ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m126[0m:[93m49[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m126[0m     expect(screen.getByText('Network Density')).toBeInTheDocument();
    [7m   [0m [91m                                                ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m127[0m:[93m56[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m127[0m     expect(screen.getByText('Clustering Coefficient')).toBeInTheDocument();
    [7m   [0m [91m                                                       ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m128[0m:[93m53[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m128[0m     expect(screen.getByText('Average Path Length')).toBeInTheDocument();
    [7m   [0m [91m                                                    ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m129[0m:[93m56[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m129[0m     expect(screen.getByText('Betweenness Centrality')).toBeInTheDocument();
    [7m   [0m [91m                                                       ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m130[0m:[93m48[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m130[0m     expect(screen.getByText('PageRank Score')).toBeInTheDocument();
    [7m   [0m [91m                                               ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m140[0m:[93m48[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m140[0m     expect(screen.getByText('Filters & View')).toBeInTheDocument();
    [7m   [0m [91m                                               ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m141[0m:[93m56[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m141[0m     expect(screen.getAllByText('Layout Algorithm')[0]).toBeInTheDocument();
    [7m   [0m [91m                                                       ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m142[0m:[93m55[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m142[0m     expect(screen.getByText(/Centrality Threshold:/)).toBeInTheDocument();
    [7m   [0m [91m                                                      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m143[0m:[93m44[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m143[0m     expect(screen.getByText('Node Types')).toBeInTheDocument();
    [7m   [0m [91m                                           ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m153[0m:[93m52[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m153[0m     expect(screen.getByText('Community Analysis')).toBeInTheDocument();
    [7m   [0m [91m                                                   ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m158[0m:[93m7[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m158[0m     ).toBeInTheDocument();
    [7m   [0m [91m      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m168[0m:[93m47[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m168[0m     expect(screen.getByText('Path Analysis')).toBeInTheDocument();
    [7m   [0m [91m                                              ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m173[0m:[93m7[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m173[0m     ).toBeInTheDocument();
    [7m   [0m [91m      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m182[0m:[93m29[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m182[0m     expect(communityButton).toBeInTheDocument();
    [7m   [0m [91m                            ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m187[0m:[93m46[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m187[0m     expect(screen.getByText('Analyzing...')).toBeInTheDocument();
    [7m   [0m [91m                                             ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m195[0m:[93m59[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m195[0m       expect(screen.getByText('Run Community Detection')).toBeInTheDocument(); // Button text restored
    [7m   [0m [91m                                                          ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m236[0m:[93m20[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m236[0m     expect(slider).toBeInTheDocument();
    [7m   [0m [91m                   ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m239[0m:[93m55[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m239[0m     expect(screen.getByText(/Centrality Threshold:/)).toBeInTheDocument();
    [7m   [0m [91m                                                      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m253[0m:[93m39[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeChecked' does not exist on type 'Matchers<void, HTMLElement>'.

    [7m253[0m     expect(showCommunitiesSwitch).not.toBeChecked();
    [7m   [0m [91m                                      ~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m256[0m:[93m35[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeChecked' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m256[0m     expect(showCommunitiesSwitch).toBeChecked();
    [7m   [0m [91m                                  ~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m269[0m:[93m24[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m269[0m     expect(personChip).toBeInTheDocument();
    [7m   [0m [91m                       ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m274[0m:[93m40[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m274[0m     expect(screen.getByText('person')).toBeInTheDocument();
    [7m   [0m [91m                                       ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m325[0m:[93m38[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m325[0m     expect(screen.getByText('0.23')).toBeInTheDocument(); // Network Density
    [7m   [0m [91m                                     ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m326[0m:[93m38[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m326[0m     expect(screen.getByText('0.67')).toBeInTheDocument(); // Clustering Coefficient
    [7m   [0m [91m                                     ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m327[0m:[93m38[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m327[0m     expect(screen.getByText('3.20')).toBeInTheDocument(); // Average Path Length
    [7m   [0m [91m                                     ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m344[0m:[93m57[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m344[0m     expect(screen.getByText('Advanced Graph Analysis')).toBeInTheDocument();
    [7m   [0m [91m                                                        ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m345[0m:[93m50[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m345[0m     expect(screen.getByText('0 nodes, 0 edges')).toBeInTheDocument();
    [7m   [0m [91m                                                 ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m355[0m:[93m21[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m355[0m     expect(tabList).toBeInTheDocument();
    [7m   [0m [91m                    ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m360[0m:[93m7[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m360[0m     ).toBeInTheDocument();
    [7m   [0m [91m      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m363[0m:[93m7[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m363[0m     ).toBeInTheDocument();
    [7m   [0m [91m      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m376[0m:[93m57[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m376[0m     expect(screen.getByText('Run Community Detection')).toBeInTheDocument();
    [7m   [0m [91m                                                        ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m377[0m:[93m41[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m377[0m     expect(screen.getByText('Metrics')).toBeInTheDocument();
    [7m   [0m [91m                                        ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m378[0m:[93m45[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m378[0m     expect(screen.getByText('Communities')).toBeInTheDocument();
    [7m   [0m [91m                                            ~~~~~~~~~~~~~~~~~[0m

FAIL client client/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx
  ● Test suite failed to run

    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m33[0m:[93m61[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m33[0m     expect(screen.getByText(/🛡️ Threat Intelligence Hub/)).toBeInTheDocument();
    [7m  [0m [91m                                                            ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m39[0m:[93m47[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m39[0m     expect(screen.getByText(/🎯 Indicators/)).toBeInTheDocument();
    [7m  [0m [91m                                              ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m40[0m:[93m46[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m40[0m     expect(screen.getByText(/📋 Campaigns/)).toBeInTheDocument();
    [7m  [0m [91m                                             ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m41[0m:[93m44[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m41[0m     expect(screen.getByText(/🕵️ Actors/)).toBeInTheDocument();
    [7m  [0m [91m                                           ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m42[0m:[93m42[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m42[0m     expect(screen.getByText(/📡 Feeds/)).toBeInTheDocument();
    [7m  [0m [91m                                         ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m50[0m:[93m7[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m50[0m     ).toBeInTheDocument();
    [7m  [0m [91m      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m51[0m:[93m56[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m51[0m     expect(screen.getByDisplayValue('All Severities')).toBeInTheDocument();
    [7m  [0m [91m                                                       ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m52[0m:[93m51[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m52[0m     expect(screen.getByDisplayValue('All Types')).toBeInTheDocument();
    [7m  [0m [91m                                                  ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m58[0m:[93m51[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m58[0m     expect(screen.getByText(/Threat Indicators/)).toBeInTheDocument();
    [7m  [0m [91m                                                  ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m60[0m:[93m47[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m60[0m     expect(screen.getByText('192.168.1.100')).toBeInTheDocument();
    [7m  [0m [91m                                              ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m61[0m:[93m54[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m61[0m     expect(screen.getByText('malicious-domain.com')).toBeInTheDocument();
    [7m  [0m [91m                                                     ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m70[0m:[93m50[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m70[0m     expect(screen.getByText(/Threat Campaigns/)).toBeInTheDocument();
    [7m  [0m [91m                                                 ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m71[0m:[93m56[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m71[0m     expect(screen.getByText('Operation Winter Storm')).toBeInTheDocument();
    [7m  [0m [91m                                                       ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m75[0m:[93m47[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m75[0m     expect(screen.getByText(/Threat Actors/)).toBeInTheDocument();
    [7m  [0m [91m                                              ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m76[0m:[93m39[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m76[0m     expect(screen.getByText('APT29')).toBeInTheDocument();
    [7m  [0m [91m                                      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m80[0m:[93m52[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m80[0m     expect(screen.getByText(/Intelligence Feeds/)).toBeInTheDocument();
    [7m  [0m [91m                                                   ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m81[0m:[93m44[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m81[0m     expect(screen.getByText('VirusTotal')).toBeInTheDocument();
    [7m  [0m [91m                                           ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m94[0m:[93m47[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m94[0m     expect(screen.getByText('192.168.1.100')).toBeInTheDocument();
    [7m  [0m [91m                                              ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m95[0m:[93m60[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'Matchers<void, HTMLElement>'.

    [7m95[0m     expect(screen.queryByText('malicious-domain.com')).not.toBeInTheDocument();
    [7m  [0m [91m                                                           ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m105[0m:[93m28[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveValue' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m105[0m     expect(severitySelect).toHaveValue('critical');
    [7m   [0m [91m                           ~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m107[0m:[93m54[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m107[0m     expect(screen.getByText('malicious-domain.com')).toBeInTheDocument();
    [7m   [0m [91m                                                     ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m117[0m:[93m24[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveValue' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m117[0m     expect(typeSelect).toHaveValue('ip');
    [7m   [0m [91m                       ~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m119[0m:[93m47[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m119[0m     expect(screen.getByText('192.168.1.100')).toBeInTheDocument();
    [7m   [0m [91m                                              ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m136[0m:[93m51[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m136[0m     expect(screen.getByText('Indicator Details')).toBeInTheDocument();
    [7m   [0m [91m                                                  ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m137[0m:[93m41[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m137[0m     expect(screen.getByText(/Context/)).toBeInTheDocument();
    [7m   [0m [91m                                        ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m138[0m:[93m38[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m138[0m     expect(screen.getByText(/Tags/)).toBeInTheDocument();
    [7m   [0m [91m                                     ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m212[0m:[93m51[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m212[0m     expect(screen.getByText(/Threat Indicators/)).toBeInTheDocument();
    [7m   [0m [91m                                                  ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m227[0m:[93m47[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m227[0m     expect(screen.getByText('192.168.1.100')).toBeInTheDocument();
    [7m   [0m [91m                                              ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m228[0m:[93m54[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m228[0m     expect(screen.getByText('malicious-domain.com')).toBeInTheDocument();
    [7m   [0m [91m                                                     ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m234[0m:[93m47[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m234[0m     expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
    [7m   [0m [91m                                              ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m240[0m:[93m49[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m240[0m     expect(screen.getByText(/🔄 Auto-refresh/)).toBeInTheDocument();
    [7m   [0m [91m                                                ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m243[0m:[93m5[0m - [91merror[0m[90m TS2304: [0mCannot find name 'act'.

    [7m243[0m     act(() => {
    [7m   [0m [91m    ~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m248[0m:[93m47[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m248[0m     expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
    [7m   [0m [91m                                              ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m258[0m:[93m44[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m258[0m     expect(screen.getByText('VirusTotal')).toBeInTheDocument();
    [7m   [0m [91m                                           ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m259[0m:[93m49[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m259[0m     expect(screen.getByText('Recorded Future')).toBeInTheDocument();
    [7m   [0m [91m                                                ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m260[0m:[93m38[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m260[0m     expect(screen.getByText('MISP')).toBeInTheDocument();
    [7m   [0m [91m                                     ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m261[0m:[93m40[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m261[0m     expect(screen.getByText(/ACTIVE/)).toBeInTheDocument();
    [7m   [0m [91m                                       ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m275[0m:[93m23[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveClass' does not exist on type 'JestMatchers<Element>'.

    [7m275[0m     expect(container).toHaveClass('custom-threat-class');
    [7m   [0m [91m                      ~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m288[0m:[93m57[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m288[0m     expect(screen.getByText(/Threat Indicators \(0\)/)).toBeInTheDocument();
    [7m   [0m [91m                                                        ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m299[0m:[93m49[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m299[0m     expect(screen.getByText(/Malware Family:/)).toBeInTheDocument();
    [7m   [0m [91m                                                ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m300[0m:[93m43[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m300[0m     expect(screen.getByText(/Campaign:/)).toBeInTheDocument();
    [7m   [0m [91m                                          ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m301[0m:[93m40[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m301[0m     expect(screen.getByText(/Actor:/)).toBeInTheDocument();
    [7m   [0m [91m                                       ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m308[0m:[93m37[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m308[0m     expect(screen.getByText('95%')).toBeInTheDocument();
    [7m   [0m [91m                                    ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m309[0m:[93m37[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m309[0m     expect(screen.getByText('88%')).toBeInTheDocument();
    [7m   [0m [91m                                    ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m335[0m:[93m25[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m335[0m     expect(searchInput).toBeInTheDocument();
    [7m   [0m [91m                        ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m343[0m:[93m55[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m343[0m     expect(screen.getByText(/🎯 Indicators \(\d+\)/)).toBeInTheDocument();
    [7m   [0m [91m                                                      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m352[0m:[93m55[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m352[0m     expect(screen.getByText(/🎯 Indicators \(\d+\)/)).toBeInTheDocument();
    [7m   [0m [91m                                                      ~~~~~~~~~~~~~~~~~[0m

FAIL client client/src/components/__tests__/ToastContainer.test.tsx
  ● Test suite failed to run

    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m54[0m:[93m46[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m54[0m     expect(screen.getByText('Test Content')).toBeInTheDocument();
    [7m  [0m [91m                                             ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m63[0m:[93m46[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m63[0m       expect(screen.getByText('Test Toast')).toBeInTheDocument();
    [7m  [0m [91m                                             ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m73[0m:[93m44[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m73[0m       expect(screen.getByText('Success!')).toBeInTheDocument();
    [7m  [0m [91m                                           ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m74[0m:[93m55[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m74[0m       expect(screen.getByText('Operation completed')).toBeInTheDocument();
    [7m  [0m [91m                                                      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m80[0m:[93m42[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m80[0m       expect(screen.getByText('Error!')).toBeInTheDocument();
    [7m  [0m [91m                                         ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m81[0m:[93m56[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m81[0m       expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    [7m  [0m [91m                                                       ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m87[0m:[93m44[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m87[0m       expect(screen.getByText('Warning!')).toBeInTheDocument();
    [7m  [0m [91m                                           ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m88[0m:[93m53[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m88[0m       expect(screen.getByText('Please be careful')).toBeInTheDocument();
    [7m  [0m [91m                                                    ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m94[0m:[93m40[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m94[0m       expect(screen.getByText('Info')).toBeInTheDocument();
    [7m  [0m [91m                                       ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m95[0m:[93m52[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m95[0m       expect(screen.getByText('Just so you know')).toBeInTheDocument();
    [7m  [0m [91m                                                   ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m104[0m:[93m37[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m104[0m       expect(screen.getByText('✅')).toBeInTheDocument();
    [7m   [0m [91m                                    ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m109[0m:[93m37[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m109[0m       expect(screen.getByText('❌')).toBeInTheDocument();
    [7m   [0m [91m                                    ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m119[0m:[93m46[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m119[0m       expect(screen.getByText('Test Toast')).toBeInTheDocument();
    [7m   [0m [91m                                             ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m128[0m:[93m52[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'Matchers<void, HTMLElement>'.

    [7m128[0m       expect(screen.queryByText('Test Toast')).not.toBeInTheDocument();
    [7m   [0m [91m                                                   ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m138[0m:[93m46[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m138[0m       expect(screen.getByText('Test Toast')).toBeInTheDocument();
    [7m   [0m [91m                                             ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m146[0m:[93m52[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'Matchers<void, HTMLElement>'.

    [7m146[0m       expect(screen.queryByText('Test Toast')).not.toBeInTheDocument();
    [7m   [0m [91m                                                   ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m159[0m:[93m44[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m159[0m       expect(screen.getByText('Success!')).toBeInTheDocument();
    [7m   [0m [91m                                           ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m160[0m:[93m42[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m160[0m       expect(screen.getByText('Error!')).toBeInTheDocument();
    [7m   [0m [91m                                         ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m161[0m:[93m40[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m161[0m       expect(screen.getByText('Info')).toBeInTheDocument();
    [7m   [0m [91m                                       ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m168[0m:[93m50[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'Matchers<void, HTMLElement>'.

    [7m168[0m       expect(screen.queryByText('Success!')).not.toBeInTheDocument();
    [7m   [0m [91m                                                 ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m169[0m:[93m48[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'Matchers<void, HTMLElement>'.

    [7m169[0m       expect(screen.queryByText('Error!')).not.toBeInTheDocument();
    [7m   [0m [91m                                               ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m170[0m:[93m46[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'Matchers<void, HTMLElement>'.

    [7m170[0m       expect(screen.queryByText('Info')).not.toBeInTheDocument();
    [7m   [0m [91m                                             ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m184[0m:[93m50[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'Matchers<void, HTMLElement>'.

    [7m184[0m       expect(screen.queryByText('Success!')).not.toBeInTheDocument();
    [7m   [0m [91m                                                 ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m185[0m:[93m42[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m185[0m       expect(screen.getByText('Error!')).toBeInTheDocument();
    [7m   [0m [91m                                         ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m186[0m:[93m40[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m186[0m       expect(screen.getByText('Info')).toBeInTheDocument();
    [7m   [0m [91m                                       ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m198[0m:[93m28[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveClass' does not exist on type 'JestMatchers<Element>'.

    [7m198[0m     expect(toastContainer).toHaveClass('top-4', 'left-4');
    [7m   [0m [91m                           ~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m210[0m:[93m26[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveClass' does not exist on type 'JestMatchers<Element>'.

    [7m210[0m     expect(newContainer).toHaveClass('bottom-4', 'right-4');
    [7m   [0m [91m                         ~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m241[0m:[93m48[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m241[0m       expect(screen.getByText('Action Toast')).toBeInTheDocument();
    [7m   [0m [91m                                               ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m242[0m:[93m47[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m242[0m       expect(screen.getByText('Take Action')).toBeInTheDocument();
    [7m   [0m [91m                                              ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m250[0m:[93m26[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m250[0m     expect(actionButton).toBeInTheDocument();
    [7m   [0m [91m                         ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m265[0m:[93m24[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveClass' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m265[0m       expect(animated).toHaveClass('transition-all');
    [7m   [0m [91m                       ~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m266[0m:[93m24[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveClass' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m266[0m       expect(animated).toHaveClass('duration-300');
    [7m   [0m [91m                       ~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m286[0m:[93m46[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m286[0m     expect(screen.getByText(/Error caught/)).toBeInTheDocument();
    [7m   [0m [91m                                             ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m289[0m:[93m7[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m289[0m     ).toBeInTheDocument();
    [7m   [0m [91m      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m359[0m:[93m28[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<Element>'.

    [7m359[0m     expect(toastContainer).toBeInTheDocument();
    [7m   [0m [91m                           ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m360[0m:[93m28[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveAttribute' does not exist on type 'JestMatchers<Element>'.

    [7m360[0m     expect(toastContainer).toHaveAttribute('aria-live', 'assertive');
    [7m   [0m [91m                           ~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m370[0m:[93m41[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveAttribute' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m370[0m       expect(closeButton.parentElement).toHaveAttribute(
    [7m   [0m [91m                                        ~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m375[0m:[93m41[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m375[0m       expect(screen.getByText('Close')).toBeInTheDocument();
    [7m   [0m [91m                                        ~~~~~~~~~~~~~~~~~[0m

FAIL server server/tests/gnn-integration.test.js
  ● Test suite failed to run

    Jest encountered an unexpected token

    Jest failed to parse a file. This happens e.g. when your code or its dependencies use non-standard JavaScript syntax, or when Jest is not configured to support such syntax.

    Out of the box Jest supports Babel, which will be used to transform your files into valid JS based on your Babel configuration.

    By default "node_modules" folder is ignored by transformers.

    Here's what you can do:
     • If you are trying to use ECMAScript Modules, see https://jestjs.io/docs/ecmascript-modules for how to enable it.
     • If you are trying to use TypeScript, see https://jestjs.io/docs/getting-started#using-typescript
     • To have some of your "node_modules" files transformed, you can specify a custom "transformIgnorePatterns" in your config.
     • If you need a custom transformation specify a "transform" option in your config.
     • If you simply want to mock your non-JS modules (e.g. binary assets) you can stub them out with the "moduleNameMapper" config option.

    You'll find more details and examples of these config options in the docs:
    https://jestjs.io/docs/configuration
    For information about custom transformations, see:
    https://jestjs.io/docs/code-transformation

    Details:

    /Users/brianlong/Developer/summit/server/src/services/GNNService.js:7
    import logger from '../utils/logger.js';
    ^^^^^^

    SyntaxError: Cannot use import statement outside a module

      3 |  */
      4 | const request = require('supertest');
    > 5 | const GNNService = require('../src/services/GNNService');
        |                    ^
      6 |
      7 | describe('GNN Integration Tests', () => {
      8 |   describe('GNNService', () => {

      at Runtime.createScriptFromCode (node_modules/.pnpm/jest-runtime@29.7.0/node_modules/jest-runtime/build/index.js:1505:14)
      at Object.<anonymous> (server/tests/gnn-integration.test.js:5:20)

FAIL server server/src/maestro/__tests__/integration.test.ts
  ● Test suite failed to run

    [96mserver/src/maestro/__tests__/integration.test.ts[0m:[93m2[0m:[93m21[0m - [91merror[0m[90m TS2307: [0mCannot find module '../app.js' or its corresponding type declarations.

    [7m2[0m import { app } from '../app.js';
    [7m [0m [91m                    ~~~~~~~~~~~[0m
    [96mserver/src/maestro/__tests__/integration.test.ts[0m:[93m3[0m:[93m33[0m - [91merror[0m[90m TS2307: [0mCannot find module '../db/postgres.js' or its corresponding type declarations.

    [7m3[0m import { getPostgresPool } from '../db/postgres.js';
    [7m [0m [91m                                ~~~~~~~~~~~~~~~~~~~[0m
    [96mserver/src/maestro/__tests__/integration.test.ts[0m:[93m4[0m:[93m43[0m - [91merror[0m[90m TS2307: [0mCannot find module '../maestro/evidence/provenance-service.js' or its corresponding type declarations.

    [7m4[0m import { evidenceProvenanceService } from '../maestro/evidence/provenance-service.js';
    [7m [0m [91m                                          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m

FAIL server server/tests/monitoring.test.js
  ● Test suite failed to run

    Jest encountered an unexpected token

    Jest failed to parse a file. This happens e.g. when your code or its dependencies use non-standard JavaScript syntax, or when Jest is not configured to support such syntax.

    Out of the box Jest supports Babel, which will be used to transform your files into valid JS based on your Babel configuration.

    By default "node_modules" folder is ignored by transformers.

    Here's what you can do:
     • If you are trying to use ECMAScript Modules, see https://jestjs.io/docs/ecmascript-modules for how to enable it.
     • If you are trying to use TypeScript, see https://jestjs.io/docs/getting-started#using-typescript
     • To have some of your "node_modules" files transformed, you can specify a custom "transformIgnorePatterns" in your config.
     • If you need a custom transformation specify a "transform" option in your config.
     • If you simply want to mock your non-JS modules (e.g. binary assets) you can stub them out with the "moduleNameMapper" config option.

    You'll find more details and examples of these config options in the docs:
    https://jestjs.io/docs/configuration
    For information about custom transformations, see:
    https://jestjs.io/docs/code-transformation

    Details:

    /Users/brianlong/Developer/summit/server/src/monitoring/health.js:4
    import os from 'os';
    ^^^^^^

    SyntaxError: Cannot use import statement outside a module

      264 |     checkRedis,
      265 |     checkSystemResources,
    > 266 |   } = require('../src/monitoring/health');
          |       ^
      267 |
      268 |   describe('Database Health Check', () => {
      269 |     it('should check database connectivity', async () => {

      at Runtime.createScriptFromCode (node_modules/.pnpm/jest-runtime@29.7.0/node_modules/jest-runtime/build/index.js:1505:14)
      at server/tests/monitoring.test.js:266:7
      at Object.<anonymous> (server/tests/monitoring.test.js:261:1)

FAIL client client/src/components/__tests__/HomeRoute.test.tsx
  ● Test suite failed to run

    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m107[0m:[93m53[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m107[0m     expect(screen.getByText('IntelGraph Platform')).toBeInTheDocument();
    [7m   [0m [91m                                                    ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m110[0m:[93m7[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m110[0m     ).toBeInTheDocument();
    [7m   [0m [91m      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m115[0m:[93m45[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m115[0m     expect(screen.getByText('🏠 Overview')).toBeInTheDocument();
    [7m   [0m [91m                                            ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m116[0m:[93m51[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m116[0m     expect(screen.getByText('🔍 Investigations')).toBeInTheDocument();
    [7m   [0m [91m                                                  ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m117[0m:[93m52[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m117[0m     expect(screen.getByText('🔎 Advanced Search')).toBeInTheDocument();
    [7m   [0m [91m                                                   ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m118[0m:[93m48[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m118[0m     expect(screen.getByText('📤 Data Export')).toBeInTheDocument();
    [7m   [0m [91m                                               ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m123[0m:[93m41[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m123[0m     expect(screen.getByText('📚 Help')).toBeInTheDocument();
    [7m   [0m [91m                                        ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m124[0m:[93m46[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m124[0m     expect(screen.getByText('⌨️ Shortcuts')).toBeInTheDocument();
    [7m   [0m [91m                                             ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m129[0m:[93m46[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m129[0m     expect(screen.getByText('Graph Nodes:')).toBeInTheDocument();
    [7m   [0m [91m                                             ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m130[0m:[93m36[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m130[0m     expect(screen.getByText('42')).toBeInTheDocument();
    [7m   [0m [91m                                   ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m131[0m:[93m46[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m131[0m     expect(screen.getByText('Graph Edges:')).toBeInTheDocument();
    [7m   [0m [91m                                             ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m132[0m:[93m37[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m132[0m     expect(screen.getByText('128')).toBeInTheDocument();
    [7m   [0m [91m                                    ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m133[0m:[93m48[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m133[0m     expect(screen.getByText('Graph Density:')).toBeInTheDocument();
    [7m   [0m [91m                                               ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m134[0m:[93m38[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m134[0m     expect(screen.getByText('0.15')).toBeInTheDocument();
    [7m   [0m [91m                                     ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m141[0m:[93m49[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m141[0m     expect(screen.getByTestId('server-status')).toBeInTheDocument();
    [7m   [0m [91m                                                ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m146[0m:[93m53[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m146[0m       expect(screen.getByTestId('advanced-search')).toBeInTheDocument();
    [7m   [0m [91m                                                    ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m152[0m:[93m59[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m152[0m       expect(screen.getByTestId('investigation-manager')).toBeInTheDocument();
    [7m   [0m [91m                                                          ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m158[0m:[93m49[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m158[0m       expect(screen.getByTestId('data-export')).toBeInTheDocument();
    [7m   [0m [91m                                                ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m170[0m:[93m22[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeDisabled' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m170[0m     expect(goButton).toBeDisabled();
    [7m   [0m [91m                     ~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m174[0m:[93m26[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeDisabled' does not exist on type 'Matchers<void, HTMLElement>'.

    [7m174[0m     expect(goButton).not.toBeDisabled();
    [7m   [0m [91m                         ~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m188[0m:[93m52[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m188[0m     expect(screen.getByText('Test Action Safety')).toBeInTheDocument();
    [7m   [0m [91m                                                   ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m189[0m:[93m54[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m189[0m     expect(screen.getByText('Sample Investigation')).toBeInTheDocument();
    [7m   [0m [91m                                                     ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m192[0m:[93m25[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m192[0m     expect(quickAction).toBeInTheDocument();
    [7m   [0m [91m                        ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m197[0m:[93m55[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m197[0m     expect(screen.getByTestId('performance-monitor')).toBeInTheDocument();
    [7m   [0m [91m                                                      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m205[0m:[93m57[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m205[0m     expect(screen.getByTestId('investigation-manager')).toBeInTheDocument();
    [7m   [0m [91m                                                        ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m209[0m:[93m51[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m209[0m     expect(screen.getByTestId('advanced-search')).toBeInTheDocument();
    [7m   [0m [91m                                                  ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m223[0m:[93m26[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m223[0m     expect(searchButton).toBeInTheDocument();
    [7m   [0m [91m                         ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m236[0m:[93m23[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m236[0m     expect(invButton).toBeInTheDocument();
    [7m   [0m [91m                      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m249[0m:[93m26[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m249[0m     expect(exportButton).toBeInTheDocument();
    [7m   [0m [91m                         ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m255[0m:[93m51[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m255[0m     expect(screen.getByText('📊 Graph Analysis')).toBeInTheDocument();
    [7m   [0m [91m                                                  ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m256[0m:[93m56[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m256[0m     expect(screen.getByText('📈 Analytics Dashboard')).toBeInTheDocument();
    [7m   [0m [91m                                                       ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m257[0m:[93m51[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m257[0m     expect(screen.getByText('🛡️ Action Safety')).toBeInTheDocument();
    [7m   [0m [91m                                                  ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m258[0m:[93m48[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m258[0m     expect(screen.getByText('🔗 GraphQL API')).toBeInTheDocument();
    [7m   [0m [91m                                               ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m264[0m:[93m46[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m264[0m     expect(screen.getByText('Graph Nodes:')).toBeInTheDocument();
    [7m   [0m [91m                                             ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m265[0m:[93m35[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m265[0m     expect(screen.getByText('0')).toBeInTheDocument(); // Default value
    [7m   [0m [91m                                  ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m278[0m:[93m54[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m278[0m       expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    [7m   [0m [91m                                                     ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m289[0m:[93m56[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m289[0m       expect(screen.getByText('Help & Documentation')).toBeInTheDocument();
    [7m   [0m [91m                                                       ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m299[0m:[93m54[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m299[0m       expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    [7m   [0m [91m                                                     ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m305[0m:[93m60[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'Matchers<void, HTMLElement>'.

    [7m305[0m       expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument();
    [7m   [0m [91m                                                           ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m316[0m:[93m16[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveTextContent' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m316[0m     expect(h1).toHaveTextContent('IntelGraph Platform');
    [7m   [0m [91m               ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m323[0m:[93m24[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveAttribute' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m323[0m     expect(helpButton).toHaveAttribute('title');
    [7m   [0m [91m                       ~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m326[0m:[93m29[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveAttribute' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m326[0m     expect(shortcutsButton).toHaveAttribute('title');
    [7m   [0m [91m                            ~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m333[0m:[93m43[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveStyle' does not exist on type 'JestMatchers<HTMLButtonElement>'.

    [7m333[0m     expect(overviewTab.closest('button')).toHaveStyle('color: #1a73e8'); // Active tab styling
    [7m   [0m [91m                                          ~~~~~~~~~~~[0m

FAIL client client/src/components/__tests__/PerformanceMonitor.test.tsx
  ● Test suite failed to run

    [96mclient/src/components/__tests__/PerformanceMonitor.test.tsx[0m:[93m67[0m:[93m39[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m67[0m     expect(screen.getByText(/\d+MB/)).toBeInTheDocument();
    [7m  [0m [91m                                      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/PerformanceMonitor.test.tsx[0m:[93m73[0m:[93m42[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'Matchers<void, HTMLElement>'.

    [7m73[0m     expect(screen.queryByText(/MB/)).not.toBeInTheDocument();
    [7m  [0m [91m                                         ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/PerformanceMonitor.test.tsx[0m:[93m83[0m:[93m53[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m83[0m     expect(screen.getByText('Performance Monitor')).toBeInTheDocument();
    [7m  [0m [91m                                                    ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/PerformanceMonitor.test.tsx[0m:[93m84[0m:[93m46[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m84[0m     expect(screen.getByText('Memory Usage')).toBeInTheDocument();
    [7m  [0m [91m                                             ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/PerformanceMonitor.test.tsx[0m:[93m85[0m:[93m45[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m85[0m     expect(screen.getByText('Render Time')).toBeInTheDocument();
    [7m  [0m [91m                                            ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/PerformanceMonitor.test.tsx[0m:[93m86[0m:[93m50[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m86[0m     expect(screen.getByText('Network Requests')).toBeInTheDocument();
    [7m  [0m [91m                                                 ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/PerformanceMonitor.test.tsx[0m:[93m144[0m:[93m17[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m144[0m     expect(svg).toBeInTheDocument();
    [7m   [0m [91m                ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/PerformanceMonitor.test.tsx[0m:[93m159[0m:[93m23[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveClass' does not exist on type 'JestMatchers<Element>'.

    [7m159[0m     expect(indicator).toHaveClass('bg-red-400');
    [7m   [0m [91m                      ~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/PerformanceMonitor.test.tsx[0m:[93m176[0m:[93m23[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveClass' does not exist on type 'JestMatchers<Element>'.

    [7m176[0m     expect(indicator).toHaveClass('bg-yellow-400');
    [7m   [0m [91m                      ~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/PerformanceMonitor.test.tsx[0m:[93m184[0m:[93m53[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m184[0m     expect(screen.getByText('Performance Monitor')).toBeInTheDocument();
    [7m   [0m [91m                                                    ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/PerformanceMonitor.test.tsx[0m:[93m190[0m:[93m59[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'Matchers<void, HTMLElement>'.

    [7m190[0m     expect(screen.queryByText('Performance Monitor')).not.toBeInTheDocument();
    [7m   [0m [91m                                                          ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/PerformanceMonitor.test.tsx[0m:[93m213[0m:[93m38[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m213[0m     expect(screen.getByText(/avg:/)).toBeInTheDocument();
    [7m   [0m [91m                                     ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/PerformanceMonitor.test.tsx[0m:[93m224[0m:[93m37[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m224[0m     expect(screen.getByText('0MB')).toBeInTheDocument();
    [7m   [0m [91m                                    ~~~~~~~~~~~~~~~~~[0m

FAIL client client/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx
  ● Test suite failed to run

    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m53[0m:[93m3[0m - [91merror[0m[90m TS2322: [0mType 'Mock<{ clearRect: Mock<any, any, any>; beginPath: Mock<any, any, any>; moveTo: Mock<any, any, any>; lineTo: Mock<any, any, any>; stroke: Mock<any, any, any>; ... 9 more ...; setTransform: Mock<...>; }, [], any>' is not assignable to type '{ (contextId: "2d", options?: CanvasRenderingContext2DSettings): CanvasRenderingContext2D; (contextId: "bitmaprenderer", options?: ImageBitmapRenderingContextSettings): ImageBitmapRenderingContext; (contextId: "webgl", options?: WebGLContextAttributes): WebGLRenderingContext; (contextId: "webgl2", options?: WebGLCon...'.
      Type '{ clearRect: Mock<any, any, any>; beginPath: Mock<any, any, any>; moveTo: Mock<any, any, any>; lineTo: Mock<any, any, any>; stroke: Mock<any, any, any>; ... 9 more ...; setTransform: Mock<...>; }' is missing the following properties from type 'CanvasRenderingContext2D': canvas, globalAlpha, globalCompositeOperation, drawImage, and 53 more.

    [7m53[0m   HTMLCanvasElement.prototype.getContext = mockCanvas.getContext;
    [7m  [0m [91m  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m54[0m:[93m3[0m - [91merror[0m[90m TS2322: [0mType 'Mock<{ left: number; top: number; width: number; height: number; }, [], any>' is not assignable to type '() => DOMRect'.
      Type '{ left: number; top: number; width: number; height: number; }' is missing the following properties from type 'DOMRect': x, y, bottom, right, toJSON

    [7m54[0m   HTMLCanvasElement.prototype.getBoundingClientRect =
    [7m  [0m [91m  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m84[0m:[93m13[0m - [91merror[0m[90m TS2741: [0mProperty 'data' is missing in type '{ onNodeSelect: Mock<any, any, any>; onEdgeSelect: Mock<any, any, any>; layoutAlgorithm: "force"; enablePhysics: boolean; showPerformanceMetrics: boolean; }' but required in type 'InteractiveGraphCanvasProps'.

    [7m84[0m     render(<InteractiveGraphCanvas {...defaultProps} />);
    [7m  [0m [91m            ~~~~~~~~~~~~~~~~~~~~~~[0m

      [96mclient/src/components/visualization/InteractiveGraphCanvas.tsx[0m:[93m49[0m:[93m3[0m
        [7m49[0m   data: GraphData;
        [7m  [0m [96m  ~~~~[0m
        'data' is declared here.
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m87[0m:[93m20[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m87[0m     expect(canvas).toBeInTheDocument();
    [7m  [0m [91m                   ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m92[0m:[93m13[0m - [91merror[0m[90m TS2741: [0mProperty 'data' is missing in type '{ onNodeSelect: Mock<any, any, any>; onEdgeSelect: Mock<any, any, any>; layoutAlgorithm: "force"; enablePhysics: boolean; showPerformanceMetrics: boolean; }' but required in type 'InteractiveGraphCanvasProps'.

    [7m92[0m     render(<InteractiveGraphCanvas {...defaultProps} />);
    [7m  [0m [91m            ~~~~~~~~~~~~~~~~~~~~~~[0m

      [96mclient/src/components/visualization/InteractiveGraphCanvas.tsx[0m:[93m49[0m:[93m3[0m
        [7m49[0m   data: GraphData;
        [7m  [0m [96m  ~~~~[0m
        'data' is declared here.
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m94[0m:[93m50[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m94[0m     expect(screen.getByText(/Layout Algorithm/)).toBeInTheDocument();
    [7m  [0m [91m                                                 ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m95[0m:[93m41[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m95[0m     expect(screen.getByText(/Physics/)).toBeInTheDocument();
    [7m  [0m [91m                                        ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m96[0m:[93m45[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m96[0m     expect(screen.getByText(/Performance/)).toBeInTheDocument();
    [7m  [0m [91m                                            ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m103[0m:[93m9[0m - [91merror[0m[90m TS2322: [0mType '{ showPerformanceMetrics: boolean; onNodeSelect: Mock<any, any, any>; onEdgeSelect: Mock<any, any, any>; layoutAlgorithm: "force"; enablePhysics: boolean; }' is not assignable to type 'IntrinsicAttributes & InteractiveGraphCanvasProps'.
      Property 'showPerformanceMetrics' does not exist on type 'IntrinsicAttributes & InteractiveGraphCanvasProps'.

    [7m103[0m         showPerformanceMetrics={true}
    [7m   [0m [91m        ~~~~~~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m107[0m:[93m55[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m107[0m     expect(screen.getByTestId('performance-metrics')).toBeInTheDocument();
    [7m   [0m [91m                                                      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m108[0m:[93m38[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m108[0m     expect(screen.getByText(/FPS:/)).toBeInTheDocument();
    [7m   [0m [91m                                     ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m109[0m:[93m40[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m109[0m     expect(screen.getByText(/Nodes:/)).toBeInTheDocument();
    [7m   [0m [91m                                       ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m110[0m:[93m40[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m110[0m     expect(screen.getByText(/Edges:/)).toBeInTheDocument();
    [7m   [0m [91m                                       ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m117[0m:[93m9[0m - [91merror[0m[90m TS2322: [0mType '{ showPerformanceMetrics: boolean; onNodeSelect: Mock<any, any, any>; onEdgeSelect: Mock<any, any, any>; layoutAlgorithm: "force"; enablePhysics: boolean; }' is not assignable to type 'IntrinsicAttributes & InteractiveGraphCanvasProps'.
      Property 'showPerformanceMetrics' does not exist on type 'IntrinsicAttributes & InteractiveGraphCanvasProps'.

    [7m117[0m         showPerformanceMetrics={false}
    [7m   [0m [91m        ~~~~~~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m121[0m:[93m61[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'Matchers<void, HTMLElement>'.

    [7m121[0m     expect(screen.queryByTestId('performance-metrics')).not.toBeInTheDocument();
    [7m   [0m [91m                                                            ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m126[0m:[93m13[0m - [91merror[0m[90m TS2741: [0mProperty 'data' is missing in type '{ onNodeSelect: Mock<any, any, any>; onEdgeSelect: Mock<any, any, any>; layoutAlgorithm: "force"; enablePhysics: boolean; showPerformanceMetrics: boolean; }' but required in type 'InteractiveGraphCanvasProps'.

    [7m126[0m     render(<InteractiveGraphCanvas {...defaultProps} />);
    [7m   [0m [91m            ~~~~~~~~~~~~~~~~~~~~~~[0m

      [96mclient/src/components/visualization/InteractiveGraphCanvas.tsx[0m:[93m49[0m:[93m3[0m
        [7m49[0m   data: GraphData;
        [7m  [0m [96m  ~~~~[0m
        'data' is declared here.
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m131[0m:[93m29[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveValue' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m131[0m     expect(algorithmSelect).toHaveValue('circular');
    [7m   [0m [91m                            ~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m136[0m:[93m54[0m - [91merror[0m[90m TS2322: [0mType '{ enablePhysics: boolean; onNodeSelect: Mock<any, any, any>; onEdgeSelect: Mock<any, any, any>; layoutAlgorithm: "force"; showPerformanceMetrics: boolean; }' is not assignable to type 'IntrinsicAttributes & InteractiveGraphCanvasProps'.
      Property 'enablePhysics' does not exist on type 'IntrinsicAttributes & InteractiveGraphCanvasProps'.

    [7m136[0m     render(<InteractiveGraphCanvas {...defaultProps} enablePhysics={true} />);
    [7m   [0m [91m                                                     ~~~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m139[0m:[93m29[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeChecked' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m139[0m     expect(physicsCheckbox).toBeChecked();
    [7m   [0m [91m                            ~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m142[0m:[93m33[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeChecked' does not exist on type 'Matchers<void, HTMLElement>'.

    [7m142[0m     expect(physicsCheckbox).not.toBeChecked();
    [7m   [0m [91m                                ~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m150[0m:[93m9[0m - [91merror[0m[90m TS2322: [0mType '{ showPerformanceMetrics: boolean; onNodeSelect: Mock<any, any, any>; onEdgeSelect: Mock<any, any, any>; layoutAlgorithm: "force"; enablePhysics: boolean; }' is not assignable to type 'IntrinsicAttributes & InteractiveGraphCanvasProps'.
      Property 'showPerformanceMetrics' does not exist on type 'IntrinsicAttributes & InteractiveGraphCanvasProps'.

    [7m150[0m         showPerformanceMetrics={false}
    [7m   [0m [91m        ~~~~~~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m157[0m:[93m33[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeChecked' does not exist on type 'Matchers<void, HTMLElement>'.

    [7m157[0m     expect(metricsCheckbox).not.toBeChecked();
    [7m   [0m [91m                                ~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m160[0m:[93m29[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeChecked' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m160[0m     expect(metricsCheckbox).toBeChecked();
    [7m   [0m [91m                            ~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m161[0m:[93m55[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m161[0m     expect(screen.getByTestId('performance-metrics')).toBeInTheDocument();
    [7m   [0m [91m                                                      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m167[0m:[93m49[0m - [91merror[0m[90m TS2322: [0mType '{ onNodeSelect: Mock<any, any, any>; onEdgeSelect: Mock<any, any, any>; layoutAlgorithm: "force"; enablePhysics: boolean; showPerformanceMetrics: boolean; }' is not assignable to type 'IntrinsicAttributes & InteractiveGraphCanvasProps'.
      Property 'onNodeSelect' does not exist on type 'IntrinsicAttributes & InteractiveGraphCanvasProps'.

    [7m167[0m       <InteractiveGraphCanvas {...defaultProps} onNodeSelect={onNodeSelect} />,
    [7m   [0m [91m                                                ~~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m186[0m:[93m13[0m - [91merror[0m[90m TS2741: [0mProperty 'data' is missing in type '{ onNodeSelect: Mock<any, any, any>; onEdgeSelect: Mock<any, any, any>; layoutAlgorithm: "force"; enablePhysics: boolean; showPerformanceMetrics: boolean; }' but required in type 'InteractiveGraphCanvasProps'.

    [7m186[0m     render(<InteractiveGraphCanvas {...defaultProps} />);
    [7m   [0m [91m            ~~~~~~~~~~~~~~~~~~~~~~[0m

      [96mclient/src/components/visualization/InteractiveGraphCanvas.tsx[0m:[93m49[0m:[93m3[0m
        [7m49[0m   data: GraphData;
        [7m  [0m [96m  ~~~~[0m
        'data' is declared here.
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m201[0m:[93m13[0m - [91merror[0m[90m TS2741: [0mProperty 'data' is missing in type '{ onNodeSelect: Mock<any, any, any>; onEdgeSelect: Mock<any, any, any>; layoutAlgorithm: "force"; enablePhysics: boolean; showPerformanceMetrics: boolean; }' but required in type 'InteractiveGraphCanvasProps'.

    [7m201[0m     render(<InteractiveGraphCanvas {...defaultProps} />);
    [7m   [0m [91m            ~~~~~~~~~~~~~~~~~~~~~~[0m

      [96mclient/src/components/visualization/InteractiveGraphCanvas.tsx[0m:[93m49[0m:[93m3[0m
        [7m49[0m   data: GraphData;
        [7m  [0m [96m  ~~~~[0m
        'data' is declared here.
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m219[0m:[93m49[0m - [91merror[0m[90m TS2322: [0mType '{ investigationId: string; onNodeSelect: Mock<any, any, any>; onEdgeSelect: Mock<any, any, any>; layoutAlgorithm: "force"; enablePhysics: boolean; showPerformanceMetrics: boolean; }' is not assignable to type 'IntrinsicAttributes & InteractiveGraphCanvasProps'.
      Property 'investigationId' does not exist on type 'IntrinsicAttributes & InteractiveGraphCanvasProps'.

    [7m219[0m       <InteractiveGraphCanvas {...defaultProps} investigationId="inv-123" />,
    [7m   [0m [91m                                                ~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m223[0m:[93m20[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m223[0m     expect(canvas).toBeInTheDocument();
    [7m   [0m [91m                   ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m227[0m:[93m34[0m - [91merror[0m[90m TS2741: [0mProperty 'data' is missing in type '{ onNodeSelect: Mock<any, any, any>; onEdgeSelect: Mock<any, any, any>; layoutAlgorithm: "force"; enablePhysics: boolean; showPerformanceMetrics: boolean; }' but required in type 'InteractiveGraphCanvasProps'.

    [7m227[0m     const { rerender } = render(<InteractiveGraphCanvas {...defaultProps} />);
    [7m   [0m [91m                                 ~~~~~~~~~~~~~~~~~~~~~~[0m

      [96mclient/src/components/visualization/InteractiveGraphCanvas.tsx[0m:[93m49[0m:[93m3[0m
        [7m49[0m   data: GraphData;
        [7m  [0m [96m  ~~~~[0m
        'data' is declared here.
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m240[0m:[93m15[0m - [91merror[0m[90m TS2741: [0mProperty 'data' is missing in type '{ onNodeSelect: Mock<any, any, any>; onEdgeSelect: Mock<any, any, any>; layoutAlgorithm: "force"; enablePhysics: boolean; showPerformanceMetrics: boolean; }' but required in type 'InteractiveGraphCanvasProps'.

    [7m240[0m     rerender(<InteractiveGraphCanvas {...defaultProps} />);
    [7m   [0m [91m              ~~~~~~~~~~~~~~~~~~~~~~[0m

      [96mclient/src/components/visualization/InteractiveGraphCanvas.tsx[0m:[93m49[0m:[93m3[0m
        [7m49[0m   data: GraphData;
        [7m  [0m [96m  ~~~~[0m
        'data' is declared here.
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m247[0m:[93m33[0m - [91merror[0m[90m TS2741: [0mProperty 'data' is missing in type '{ onNodeSelect: Mock<any, any, any>; onEdgeSelect: Mock<any, any, any>; layoutAlgorithm: "force"; enablePhysics: boolean; showPerformanceMetrics: boolean; }' but required in type 'InteractiveGraphCanvasProps'.

    [7m247[0m     const { unmount } = render(<InteractiveGraphCanvas {...defaultProps} />);
    [7m   [0m [91m                                ~~~~~~~~~~~~~~~~~~~~~~[0m

      [96mclient/src/components/visualization/InteractiveGraphCanvas.tsx[0m:[93m49[0m:[93m3[0m
        [7m49[0m   data: GraphData;
        [7m  [0m [96m  ~~~~[0m
        'data' is declared here.
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m258[0m:[93m49[0m - [91merror[0m[90m TS2322: [0mType '{ onNodeSelect: Mock<any, any, any>; onEdgeSelect: Mock<any, any, any>; layoutAlgorithm: "force"; enablePhysics: boolean; showPerformanceMetrics: boolean; }' is not assignable to type 'IntrinsicAttributes & InteractiveGraphCanvasProps'.
      Property 'onNodeSelect' does not exist on type 'IntrinsicAttributes & InteractiveGraphCanvasProps'.

    [7m258[0m       <InteractiveGraphCanvas {...defaultProps} onNodeSelect={onNodeSelect} />,
    [7m   [0m [91m                                                ~~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m274[0m:[93m49[0m - [91merror[0m[90m TS2322: [0mType '{ onEdgeSelect: Mock<any, any, any>; onNodeSelect: Mock<any, any, any>; layoutAlgorithm: "force"; enablePhysics: boolean; showPerformanceMetrics: boolean; }' is not assignable to type 'IntrinsicAttributes & InteractiveGraphCanvasProps'.
      Property 'onEdgeSelect' does not exist on type 'IntrinsicAttributes & InteractiveGraphCanvasProps'.

    [7m274[0m       <InteractiveGraphCanvas {...defaultProps} onEdgeSelect={onEdgeSelect} />,
    [7m   [0m [91m                                                ~~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m289[0m:[93m8[0m - [91merror[0m[90m TS2741: [0mProperty 'data' is missing in type '{ className: string; onNodeSelect: Mock<any, any, any>; onEdgeSelect: Mock<any, any, any>; layoutAlgorithm: "force"; enablePhysics: boolean; showPerformanceMetrics: boolean; }' but required in type 'InteractiveGraphCanvasProps'.

    [7m289[0m       <InteractiveGraphCanvas {...defaultProps} className="custom-class" />,
    [7m   [0m [91m       ~~~~~~~~~~~~~~~~~~~~~~[0m

      [96mclient/src/components/visualization/InteractiveGraphCanvas.tsx[0m:[93m49[0m:[93m3[0m
        [7m49[0m   data: GraphData;
        [7m  [0m [96m  ~~~~[0m
        'data' is declared here.
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m293[0m:[93m23[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveClass' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m293[0m     expect(container).toHaveClass('custom-class');
    [7m   [0m [91m                      ~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m298[0m:[93m13[0m - [91merror[0m[90m TS2741: [0mProperty 'data' is missing in type '{ onNodeSelect: Mock<any, any, any>; onEdgeSelect: Mock<any, any, any>; layoutAlgorithm: "force"; enablePhysics: boolean; showPerformanceMetrics: boolean; }' but required in type 'InteractiveGraphCanvasProps'.

    [7m298[0m     render(<InteractiveGraphCanvas {...defaultProps} />);
    [7m   [0m [91m            ~~~~~~~~~~~~~~~~~~~~~~[0m

      [96mclient/src/components/visualization/InteractiveGraphCanvas.tsx[0m:[93m49[0m:[93m3[0m
        [7m49[0m   data: GraphData;
        [7m  [0m [96m  ~~~~[0m
        'data' is declared here.
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m304[0m:[93m29[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveValue' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m304[0m     expect(algorithmSelect).toHaveValue('circular');
    [7m   [0m [91m                            ~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m307[0m:[93m29[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveValue' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m307[0m     expect(algorithmSelect).toHaveValue('grid');
    [7m   [0m [91m                            ~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m310[0m:[93m29[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveValue' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m310[0m     expect(algorithmSelect).toHaveValue('hierarchical');
    [7m   [0m [91m                            ~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m313[0m:[93m29[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveValue' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m313[0m     expect(algorithmSelect).toHaveValue('force');
    [7m   [0m [91m                            ~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m320[0m:[93m9[0m - [91merror[0m[90m TS2322: [0mType '{ showPerformanceMetrics: boolean; onNodeSelect: Mock<any, any, any>; onEdgeSelect: Mock<any, any, any>; layoutAlgorithm: "force"; enablePhysics: boolean; }' is not assignable to type 'IntrinsicAttributes & InteractiveGraphCanvasProps'.
      Property 'showPerformanceMetrics' does not exist on type 'IntrinsicAttributes & InteractiveGraphCanvasProps'.

    [7m320[0m         showPerformanceMetrics={true}
    [7m   [0m [91m        ~~~~~~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m325[0m:[93m32[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m325[0m     expect(performanceMetrics).toBeInTheDocument();
    [7m   [0m [91m                               ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m328[0m:[93m42[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m328[0m     expect(screen.getByText(/FPS: \d+/)).toBeInTheDocument();
    [7m   [0m [91m                                         ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m329[0m:[93m44[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m329[0m     expect(screen.getByText(/Nodes: \d+/)).toBeInTheDocument();
    [7m   [0m [91m                                           ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m330[0m:[93m44[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m330[0m     expect(screen.getByText(/Edges: \d+/)).toBeInTheDocument();
    [7m   [0m [91m                                           ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m334[0m:[93m54[0m - [91merror[0m[90m TS2322: [0mType '{ enablePhysics: boolean; onNodeSelect: Mock<any, any, any>; onEdgeSelect: Mock<any, any, any>; layoutAlgorithm: "force"; showPerformanceMetrics: boolean; }' is not assignable to type 'IntrinsicAttributes & InteractiveGraphCanvasProps'.
      Property 'enablePhysics' does not exist on type 'IntrinsicAttributes & InteractiveGraphCanvasProps'.

    [7m334[0m     render(<InteractiveGraphCanvas {...defaultProps} enablePhysics={true} />);
    [7m   [0m [91m                                                     ~~~~~~~~~~~~~[0m

FAIL server server/src/tests/ai.integration.test.ts
  ● Test suite failed to run

    [96mserver/src/tests/ai.integration.test.ts[0m:[93m44[0m:[93m42[0m - [91merror[0m[90m TS2345: [0mArgument of type '{ records: { get: Mock<UnknownFunction>; }[]; }' is not assignable to parameter of type 'never'.

    [7m 44[0m         run: jest.fn().mockResolvedValue({
    [7m   [0m [91m                                         ~[0m
    [7m 45[0m           records: [
    [7m   [0m [91m~~~~~~~~~~~~~~~~~~~~[0m
    [7m...[0m 
    [7m 58[0m           ],
    [7m   [0m [91m~~~~~~~~~~~~[0m
    [7m 59[0m         }),
    [7m   [0m [91m~~~~~~~~~[0m
    [96mserver/src/tests/ai.integration.test.ts[0m:[93m364[0m:[93m42[0m - [91merror[0m[90m TS2345: [0mArgument of type 'Error' is not assignable to parameter of type 'never'.

    [7m364[0m         run: jest.fn().mockRejectedValue(new Error('Neo4j connection failed')),
    [7m   [0m [91m                                         ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m

FAIL server server/src/resolvers/__tests__/WargameResolver.test.ts
  ● Test suite failed to run

    [96mserver/src/resolvers/__tests__/WargameResolver.test.ts[0m:[93m289[0m:[93m37[0m - [91merror[0m[90m TS2551: [0mProperty 'updateCrisisScenario' does not exist on type 'WargameResolver'. Did you mean 'deleteCrisisScenario'?

    [7m289[0m       const result = await resolver.updateCrisisScenario(
    [7m   [0m [91m                                    ~~~~~~~~~~~~~~~~~~~~[0m

      [96mserver/src/resolvers/WargameResolver.ts[0m:[93m204[0m:[93m9[0m
        [7m204[0m   async deleteCrisisScenario(
        [7m   [0m [96m        ~~~~~~~~~~~~~~~~~~~~[0m
        'deleteCrisisScenario' is declared here.

FAIL server server/src/conductor/__tests__/mcp-client.test.ts
  ● Test suite failed to run

    [96mserver/src/conductor/__tests__/mcp-client.test.ts[0m:[93m63[0m:[93m38[0m - [91merror[0m[90m TS2345: [0mArgument of type '(event: string, callback: Function) => void' is not assignable to parameter of type '(event: string | symbol, listener: (this: WebSocket, ...args: any[]) => void) => WebSocket'.
      Type 'void' is not assignable to type 'WebSocket'.

    [7m63[0m       mockWs.once.mockImplementation((event: string, callback: Function) => {
    [7m  [0m [91m                                     ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
    [96mserver/src/conductor/__tests__/mcp-client.test.ts[0m:[93m78[0m:[93m38[0m - [91merror[0m[90m TS2345: [0mArgument of type '(event: string, callback: Function) => void' is not assignable to parameter of type '(event: string | symbol, listener: (this: WebSocket, ...args: any[]) => void) => WebSocket'.
      Type 'void' is not assignable to type 'WebSocket'.

    [7m78[0m       mockWs.once.mockImplementation((event: string, callback: Function) => {
    [7m  [0m [91m                                     ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
    [96mserver/src/conductor/__tests__/mcp-client.test.ts[0m:[93m97[0m:[93m38[0m - [91merror[0m[90m TS2345: [0mArgument of type '(event: string, callback: Function) => void' is not assignable to parameter of type '(event: string | symbol, listener: (this: WebSocket, ...args: any[]) => void) => WebSocket'.
      Type 'void' is not assignable to type 'WebSocket'.

    [7m97[0m       mockWs.once.mockImplementation((event: string, callback: Function) => {
    [7m  [0m [91m                                     ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
    [96mserver/src/conductor/__tests__/mcp-client.test.ts[0m:[93m111[0m:[93m38[0m - [91merror[0m[90m TS2345: [0mArgument of type '(event: string, callback: Function) => void' is not assignable to parameter of type '(event: string | symbol, listener: (this: WebSocket, ...args: any[]) => void) => WebSocket'.
      Type 'void' is not assignable to type 'WebSocket'.

    [7m111[0m       mockWs.once.mockImplementation((event: string, callback: Function) => {
    [7m   [0m [91m                                     ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
    [96mserver/src/conductor/__tests__/mcp-client.test.ts[0m:[93m142[0m:[93m7[0m - [91merror[0m[90m TS2684: [0mThe 'this' context of type 'void' is not assignable to method's 'this' of type 'WebSocket'.

    [7m142[0m       messageHandler(Buffer.from(JSON.stringify(response)));
    [7m   [0m [91m      ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
    [96mserver/src/conductor/__tests__/mcp-client.test.ts[0m:[93m169[0m:[93m7[0m - [91merror[0m[90m TS2684: [0mThe 'this' context of type 'void' is not assignable to method's 'this' of type 'WebSocket'.

    [7m169[0m       messageHandler(Buffer.from(JSON.stringify(errorResponse)));
    [7m   [0m [91m      ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
    [96mserver/src/conductor/__tests__/mcp-client.test.ts[0m:[93m195[0m:[93m38[0m - [91merror[0m[90m TS2345: [0mArgument of type '(event: string, callback: Function) => void' is not assignable to parameter of type '(event: string | symbol, listener: (this: WebSocket, ...args: any[]) => void) => WebSocket'.
      Type 'void' is not assignable to type 'WebSocket'.

    [7m195[0m       mockWs.once.mockImplementation((event: string, callback: Function) => {
    [7m   [0m [91m                                     ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
    [96mserver/src/conductor/__tests__/mcp-client.test.ts[0m:[93m215[0m:[93m38[0m - [91merror[0m[90m TS2345: [0mArgument of type '(event: string, callback: Function) => void' is not assignable to parameter of type '(event: string | symbol, listener: (this: WebSocket, ...args: any[]) => void) => WebSocket'.
      Type 'void' is not assignable to type 'WebSocket'.

    [7m215[0m       mockWs.once.mockImplementation((event: string, callback: Function) => {
    [7m   [0m [91m                                     ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
    [96mserver/src/conductor/__tests__/mcp-client.test.ts[0m:[93m242[0m:[93m7[0m - [91merror[0m[90m TS2684: [0mThe 'this' context of type 'void' is not assignable to method's 'this' of type 'WebSocket'.

    [7m242[0m       messageHandler(Buffer.from(JSON.stringify(response)));
    [7m   [0m [91m      ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
    [96mserver/src/conductor/__tests__/mcp-client.test.ts[0m:[93m260[0m:[93m38[0m - [91merror[0m[90m TS2345: [0mArgument of type '(event: string, callback: Function) => void' is not assignable to parameter of type '(event: string | symbol, listener: (this: WebSocket, ...args: any[]) => void) => WebSocket'.
      Type 'void' is not assignable to type 'WebSocket'.

    [7m260[0m       mockWs.once.mockImplementation((event: string, callback: Function) => {
    [7m   [0m [91m                                     ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
    [96mserver/src/conductor/__tests__/mcp-client.test.ts[0m:[93m281[0m:[93m38[0m - [91merror[0m[90m TS2304: [0mCannot find name 'mockServerConfig'.

    [7m281[0m     registry.register('test-server', mockServerConfig);
    [7m   [0m [91m                                     ~~~~~~~~~~~~~~~~[0m
    [96mserver/src/conductor/__tests__/mcp-client.test.ts[0m:[93m284[0m:[93m36[0m - [91merror[0m[90m TS2304: [0mCannot find name 'mockServerConfig'.

    [7m284[0m     expect(retrieved).toEqual({ ...mockServerConfig, name: 'test-server' });
    [7m   [0m [91m                                   ~~~~~~~~~~~~~~~~[0m
    [96mserver/src/conductor/__tests__/mcp-client.test.ts[0m:[93m288[0m:[93m38[0m - [91merror[0m[90m TS2304: [0mCannot find name 'mockServerConfig'.

    [7m288[0m     registry.register('test-server', mockServerConfig);
    [7m   [0m [91m                                     ~~~~~~~~~~~~~~~~[0m
    [96mserver/src/conductor/__tests__/mcp-client.test.ts[0m:[93m295[0m:[93m34[0m - [91merror[0m[90m TS2304: [0mCannot find name 'mockServerConfig'.

    [7m295[0m     registry.register('server1', mockServerConfig);
    [7m   [0m [91m                                 ~~~~~~~~~~~~~~~~[0m
    [96mserver/src/conductor/__tests__/mcp-client.test.ts[0m:[93m296[0m:[93m34[0m - [91merror[0m[90m TS2304: [0mCannot find name 'mockServerConfig'.

    [7m296[0m     registry.register('server2', mockServerConfig);
    [7m   [0m [91m                                 ~~~~~~~~~~~~~~~~[0m
    [96mserver/src/conductor/__tests__/mcp-client.test.ts[0m:[93m305[0m:[93m10[0m - [91merror[0m[90m TS2552: [0mCannot find name 'mockServerConfig'. Did you mean 'server1Config'?

    [7m305[0m       ...mockServerConfig,
    [7m   [0m [91m         ~~~~~~~~~~~~~~~~[0m

      [96mserver/src/conductor/__tests__/mcp-client.test.ts[0m:[93m304[0m:[93m11[0m
        [7m304[0m     const server1Config = {
        [7m   [0m [96m          ~~~~~~~~~~~~~[0m
        'server1Config' is declared here.
    [96mserver/src/conductor/__tests__/mcp-client.test.ts[0m:[93m315[0m:[93m10[0m - [91merror[0m[90m TS2552: [0mCannot find name 'mockServerConfig'. Did you mean 'server1Config'?

    [7m315[0m       ...mockServerConfig,
    [7m   [0m [91m         ~~~~~~~~~~~~~~~~[0m

      [96mserver/src/conductor/__tests__/mcp-client.test.ts[0m:[93m304[0m:[93m11[0m
        [7m304[0m     const server1Config = {
        [7m   [0m [96m          ~~~~~~~~~~~~~[0m
        'server1Config' is declared here.

FAIL server server/tests/integration/startRecipe.int.test.ts
  ● Test suite failed to run

    [96mserver/tests/integration/startRecipe.int.test.ts[0m:[93m28[0m:[93m43[0m - [91merror[0m[90m TS2345: [0mArgument of type '"test-uuid-123"' is not assignable to parameter of type '`${string}-${string}-${string}-${string}-${string}`'.

    [7m28[0m     mockCrypto.randomUUID.mockReturnValue('test-uuid-123');
    [7m  [0m [91m                                          ~~~~~~~~~~~~~~~[0m
    [96mserver/tests/integration/startRecipe.int.test.ts[0m:[93m311[0m:[93m30[0m - [91merror[0m[90m TS2345: [0mArgument of type '"run-uuid-123"' is not assignable to parameter of type '`${string}-${string}-${string}-${string}-${string}`'.

    [7m311[0m         .mockReturnValueOnce('run-uuid-123')
    [7m   [0m [91m                             ~~~~~~~~~~~~~~[0m
    [96mserver/tests/integration/startRecipe.int.test.ts[0m:[93m312[0m:[93m30[0m - [91merror[0m[90m TS2345: [0mArgument of type '"audit-uuid-456"' is not assignable to parameter of type '`${string}-${string}-${string}-${string}-${string}`'.

    [7m312[0m         .mockReturnValueOnce('audit-uuid-456');
    [7m   [0m [91m                             ~~~~~~~~~~~~~~~~[0m

FAIL server server/src/tests/entityModel.test.js
  ● Test suite failed to run

    Jest encountered an unexpected token

    Jest failed to parse a file. This happens e.g. when your code or its dependencies use non-standard JavaScript syntax, or when Jest is not configured to support such syntax.

    Out of the box Jest supports Babel, which will be used to transform your files into valid JS based on your Babel configuration.

    By default "node_modules" folder is ignored by transformers.

    Here's what you can do:
     • If you are trying to use ECMAScript Modules, see https://jestjs.io/docs/ecmascript-modules for how to enable it.
     • If you are trying to use TypeScript, see https://jestjs.io/docs/getting-started#using-typescript
     • To have some of your "node_modules" files transformed, you can specify a custom "transformIgnorePatterns" in your config.
     • If you need a custom transformation specify a "transform" option in your config.
     • If you simply want to mock your non-JS modules (e.g. binary assets) you can stub them out with the "moduleNameMapper" config option.

    You'll find more details and examples of these config options in the docs:
    https://jestjs.io/docs/configuration
    For information about custom transformations, see:
    https://jestjs.io/docs/code-transformation

    Details:

    /Users/brianlong/Developer/summit/server/src/services/EntityModelService.js:8
    import logger from '../utils/logger.js';
    ^^^^^^

    SyntaxError: Cannot use import statement outside a module

       7 |   EntityModelService,
       8 |   entityModelService,
    >  9 | } = require('../services/EntityModelService');
         |     ^
      10 | const { migrationManager } = require('../db/migrations/index');
      11 | const {
      12 |   connectNeo4j,

      at Runtime.createScriptFromCode (node_modules/.pnpm/jest-runtime@29.7.0/node_modules/jest-runtime/build/index.js:1505:14)
      at Object.<anonymous> (server/src/tests/entityModel.test.js:9:5)

FAIL server server/tests/integration/ticket-linking-flow.test.ts
  ● Test suite failed to run

    [96mserver/tests/integration/ticket-linking-flow.test.ts[0m:[93m3[0m:[93m8[0m - [91merror[0m[90m TS1192: [0mModule '"/Users/brianlong/Developer/summit/server/src/app"' has no default export.

    [7m3[0m import app from '../../src/app.js';
    [7m [0m [91m       ~~~[0m
    [96mserver/tests/integration/ticket-linking-flow.test.ts[0m:[93m28[0m:[93m72[0m - [91merror[0m[90m TS2345: [0mArgument of type 'null' is not assignable to parameter of type 'never'.

    [7m28[0m       ticketLinkService.addTicketRunLink = jest.fn().mockResolvedValue(null);
    [7m  [0m [91m                                                                       ~~~~[0m
    [96mserver/tests/integration/ticket-linking-flow.test.ts[0m:[93m88[0m:[93m44[0m - [91merror[0m[90m TS2345: [0mArgument of type '{ rows: { provider: string; external_id: string; title: string; assignee: string; labels: string[]; project: null; repo: string; }[]; }' is not assignable to parameter of type 'never'.

    [7m 88[0m       mockPool.query.mockResolvedValueOnce({
    [7m   [0m [91m                                           ~[0m
    [7m 89[0m         rows: [
    [7m   [0m [91m~~~~~~~~~~~~~~~[0m
    [7m...[0m 
    [7m 99[0m         ],
    [7m   [0m [91m~~~~~~~~~~[0m
    [7m100[0m       });
    [7m   [0m [91m~~~~~~~[0m
    [96mserver/tests/integration/ticket-linking-flow.test.ts[0m:[93m103[0m:[93m44[0m - [91merror[0m[90m TS2345: [0mArgument of type '{ rows: { id: string; }[]; }' is not assignable to parameter of type 'never'.

    [7m103[0m       mockPool.query.mockResolvedValueOnce({
    [7m   [0m [91m                                           ~[0m
    [7m104[0m         rows: [{ id: 'run-abc-123' }],
    [7m   [0m [91m~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
    [7m105[0m       });
    [7m   [0m [91m~~~~~~~[0m
    [96mserver/tests/integration/ticket-linking-flow.test.ts[0m:[93m108[0m:[93m44[0m - [91merror[0m[90m TS2345: [0mArgument of type '{ rows: undefined[]; }' is not assignable to parameter of type 'never'.

    [7m108[0m       mockPool.query.mockResolvedValueOnce({
    [7m   [0m [91m                                           ~[0m
    [7m109[0m         rows: [],
    [7m   [0m [91m~~~~~~~~~~~~~~~~~[0m
    [7m110[0m       });
    [7m   [0m [91m~~~~~~~[0m
    [96mserver/tests/integration/ticket-linking-flow.test.ts[0m:[93m165[0m:[93m28[0m - [91merror[0m[90m TS2345: [0mArgument of type 'null' is not assignable to parameter of type 'never'.

    [7m165[0m         .mockResolvedValue(null);
    [7m   [0m [91m                           ~~~~[0m
    [96mserver/tests/integration/ticket-linking-flow.test.ts[0m:[93m243[0m:[93m28[0m - [91merror[0m[90m TS2345: [0mArgument of type 'Error' is not assignable to parameter of type 'never'.

    [7m243[0m         .mockRejectedValue(new Error('Run nonexistent-run not found'));
    [7m   [0m [91m                           ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
    [96mserver/tests/integration/ticket-linking-flow.test.ts[0m:[93m270[0m:[93m72[0m - [91merror[0m[90m TS2345: [0mArgument of type 'null' is not assignable to parameter of type 'never'.

    [7m270[0m       ticketLinkService.addTicketRunLink = jest.fn().mockResolvedValue(null);
    [7m   [0m [91m                                                                       ~~~~[0m

FAIL server server/tests/db/postgres.pool.test.ts
  ● Test suite failed to run

    [96mserver/tests/db/postgres.pool.test.ts[0m:[93m29[0m:[93m39[0m - [91merror[0m[90m TS2554: [0mExpected 0 arguments, but got 1.

    [7m29[0m         return this.pool.queryHandler(queryConfig);
    [7m  [0m [91m                                      ~~~~~~~~~~~[0m
    [96mserver/tests/db/postgres.pool.test.ts[0m:[93m55[0m:[93m25[0m - [91merror[0m[90m TS2554: [0mExpected 0 arguments, but got 1.

    [7m55[0m       this.queryHandler(config),
    [7m  [0m [91m                        ~~~~~~[0m

FAIL server server/tests/federal-integration.test.ts
  ● Test suite failed to run

    [96mserver/tests/federal-integration.test.ts[0m:[93m4[0m:[93m10[0m - [91merror[0m[90m TS2724: [0m'"../src/federal/hsm-enforcement"' has no exported member named 'HSMEnforcement'. Did you mean 'hsmEnforcement'?

    [7m4[0m import { HSMEnforcement } from '../src/federal/hsm-enforcement';
    [7m [0m [91m         ~~~~~~~~~~~~~~[0m

      [96mserver/src/federal/hsm-enforcement.ts[0m:[93m439[0m:[93m14[0m
        [7m439[0m export const hsmEnforcement = new HSMEnforcement({
        [7m   [0m [96m             ~~~~~~~~~~~~~~[0m
        'hsmEnforcement' is declared here.
    [96mserver/tests/federal-integration.test.ts[0m:[93m5[0m:[93m36[0m - [91merror[0m[90m TS2307: [0mCannot find module '../src/federal/audit-logger' or its corresponding type declarations.

    [7m5[0m import { FederalAuditLogger } from '../src/federal/audit-logger';
    [7m [0m [91m                                   ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
    [96mserver/tests/federal-integration.test.ts[0m:[93m127[0m:[93m59[0m - [91merror[0m[90m TS2345: [0mArgument of type '{ _type: string; predicateType: string; subject: { name: string; digest: { sha256: string; }; }[]; predicate: { builder: { id: string; }; buildType: string; invocation: { configSource: { uri: string; digest: { ...; }; entryPoint: string; }; }; metadata: { ...; }; materials: any[]; buildConfig: {}; }; }' is not assignable to parameter of type 'string'.

    [7m127[0m       const result = await slsa3Verifier.verifyProvenance(mockProvenance, {
    [7m   [0m [91m                                                          ~~~~~~~~~~~~~~[0m
    [96mserver/tests/federal-integration.test.ts[0m:[93m143[0m:[93m59[0m - [91merror[0m[90m TS2345: [0mArgument of type '{ _type: string; predicateType: string; subject: { name: string; digest: { sha256: string; }; }[]; predicate: { builder: { id: string; }; buildType: string; invocation: { configSource: { uri: string; digest: { ...; }; entryPoint: string; }; }; metadata: { ...; }; materials: any[]; buildConfig: {}; }; }' is not assignable to parameter of type 'string'.

    [7m143[0m       const result = await slsa3Verifier.verifyProvenance(invalidProvenance, {
    [7m   [0m [91m                                                          ~~~~~~~~~~~~~~~~~[0m

FAIL server server/src/conductor/__tests__/router.test.ts
  ● MoERouter › route › routes export requests to EXPORT_TOOL

    expect(received).toBe(expected) // Object.is equality

    Expected: "EXPORT_TOOL"
    Received: "FILES_TOOL"

      55 |
      56 |       const decision = router.route(input);
    > 57 |       expect(decision.expert).toBe('EXPORT_TOOL');
         |                               ^
      58 |       expect(decision.reason).toContain('export/report generation');
      59 |     });
      60 |

      at Object.<anonymous> (server/src/conductor/__tests__/router.test.ts:57:31)

  ● MoERouter › route › routes investigation context queries to RAG_TOOL

    expect(received).toBe(expected) // Object.is equality

    Expected: "RAG_TOOL"
    Received: "LLM_LIGHT"

      91 |
      92 |       const decision = router.route(input);
    > 93 |       expect(decision.expert).toBe('RAG_TOOL');
         |                               ^
      94 |       expect(decision.reason).toContain('investigation context');
      95 |     });
      96 |

      at Object.<anonymous> (server/src/conductor/__tests__/router.test.ts:93:31)

  ● MoERouter › route › falls back to LLM_LIGHT when no specific tool matches

    expect(received).toContain(expected) // indexOf

    Expected substring: "Fallback"
    Received string:    "simple query"

      103 |       const decision = router.route(input);
      104 |       expect(decision.expert).toBe('LLM_LIGHT');
    > 105 |       expect(decision.reason).toContain('Fallback');
          |                               ^
      106 |     });
      107 |   });
      108 |

      at Object.<anonymous> (server/src/conductor/__tests__/router.test.ts:105:31)

FAIL server server/__tests__/nl2cypher-guardrails.test.ts
  ● Test suite failed to run

    [96mserver/__tests__/nl2cypher-guardrails.test.ts[0m:[93m7[0m:[93m10[0m - [91merror[0m[90m TS2305: [0mModule '"../src/app"' has no exported member 'app'.

    [7m7[0m import { app } from '../src/app';
    [7m [0m [91m         ~~~[0m

FAIL server server/src/tests/entityModelStructure.test.js
  ● Console

    console.log
      [dotenv@17.2.1] injecting env (90) from .env -- tip: ⚙️  specify custom .env file path with { path: '/custom/path/.env' }

      at _log (node_modules/.pnpm/dotenv@17.2.1/node_modules/dotenv/lib/main.js:139:11)

    console.log
      [dotenv@17.2.1] injecting env (0) from .env -- tip: ⚙️  suppress all logs with { quiet: true }

      at _log (node_modules/.pnpm/dotenv@17.2.1/node_modules/dotenv/lib/main.js:139:11)

    console.warn
      Migration directory not found, skipping naming convention test

      65 |       } catch (error) {
      66 |         // Directory might not exist in clean environment
    > 67 |         console.warn(
         |                 ^
      68 |           'Migration directory not found, skipping naming convention test',
      69 |         );
      70 |       }

      at Object.<anonymous> (server/src/tests/entityModelStructure.test.js:67:17)

  ● Entity Model Structure › Entity Model Service Structure › should have EntityModelService class

    Jest encountered an unexpected token

    Jest failed to parse a file. This happens e.g. when your code or its dependencies use non-standard JavaScript syntax, or when Jest is not configured to support such syntax.

    Out of the box Jest supports Babel, which will be used to transform your files into valid JS based on your Babel configuration.

    By default "node_modules" folder is ignored by transformers.

    Here's what you can do:
     • If you are trying to use ECMAScript Modules, see https://jestjs.io/docs/ecmascript-modules for how to enable it.
     • If you are trying to use TypeScript, see https://jestjs.io/docs/getting-started#using-typescript
     • To have some of your "node_modules" files transformed, you can specify a custom "transformIgnorePatterns" in your config.
     • If you need a custom transformation specify a "transform" option in your config.
     • If you simply want to mock your non-JS modules (e.g. binary assets) you can stub them out with the "moduleNameMapper" config option.

    You'll find more details and examples of these config options in the docs:
    https://jestjs.io/docs/configuration
    For information about custom transformations, see:
    https://jestjs.io/docs/code-transformation

    Details:

    /Users/brianlong/Developer/summit/server/src/services/EntityModelService.js:8
    import logger from '../utils/logger.js';
    ^^^^^^

    SyntaxError: Cannot use import statement outside a module

      77 |         EntityModelService,
      78 |         entityModelService,
    > 79 |       } = require('../services/EntityModelService');
         |           ^
      80 |
      81 |       expect(EntityModelService).toBeDefined();
      82 |       expect(typeof EntityModelService).toBe('function');

      at Runtime.createScriptFromCode (node_modules/.pnpm/jest-runtime@29.7.0/node_modules/jest-runtime/build/index.js:1505:14)
      at Object.<anonymous> (server/src/tests/entityModelStructure.test.js:79:11)

  ● Entity Model Structure › Entity Model Service Structure › should have required service methods

    Jest encountered an unexpected token

    Jest failed to parse a file. This happens e.g. when your code or its dependencies use non-standard JavaScript syntax, or when Jest is not configured to support such syntax.

    Out of the box Jest supports Babel, which will be used to transform your files into valid JS based on your Babel configuration.

    By default "node_modules" folder is ignored by transformers.

    Here's what you can do:
     • If you are trying to use ECMAScript Modules, see https://jestjs.io/docs/ecmascript-modules for how to enable it.
     • If you are trying to use TypeScript, see https://jestjs.io/docs/getting-started#using-typescript
     • To have some of your "node_modules" files transformed, you can specify a custom "transformIgnorePatterns" in your config.
     • If you need a custom transformation specify a "transform" option in your config.
     • If you simply want to mock your non-JS modules (e.g. binary assets) you can stub them out with the "moduleNameMapper" config option.

    You'll find more details and examples of these config options in the docs:
    https://jestjs.io/docs/configuration
    For information about custom transformations, see:
    https://jestjs.io/docs/code-transformation

    Details:

    /Users/brianlong/Developer/summit/server/src/services/EntityModelService.js:8
    import logger from '../utils/logger.js';
    ^^^^^^

    SyntaxError: Cannot use import statement outside a module

      86 |
      87 |     test('should have required service methods', () => {
    > 88 |       const { entityModelService } = require('../services/EntityModelService');
         |                                      ^
      89 |
      90 |       const requiredMethods = [
      91 |         'initialize',

      at Runtime.createScriptFromCode (node_modules/.pnpm/jest-runtime@29.7.0/node_modules/jest-runtime/build/index.js:1505:14)
      at Object.<anonymous> (server/src/tests/entityModelStructure.test.js:88:38)

  ● Entity Model Structure › Migration Scripts › should have npm script commands

    expect(received).toHaveProperty(path)

    Expected path: "migrate:status"
    Received path: []

    Received value: {"build": "tsc", "codegen": "graphql-codegen --config codegen.yml", "codegen:watch": "graphql-codegen --config codegen.yml --watch", "dev": "cross-env PORT=4000 nodemon --watch 'src/**/*' --exec 'npx tsx' src/index.ts", "dev:worker": "cross-env NODE_ENV=development CONDUCTOR_ROLE=worker WORKER_PORT=4100 nodemon --watch 'src/**/*.ts' --exec 'node --loader ts-node/esm' src/conductor/worker-entrypoint.ts", "format": "prettier --write .", "lint": "eslint .", "lint:fix": "eslint . --fix", "migrate": "ts-node scripts/migrate.ts up", "seed": "ts-node scripts/seed-data.ts", "seed:demo": "ts-node scripts/seed-demo.ts", "seed:large": "SEED_ENTITIES=50000 SEED_RELATIONSHIPS=250000 ts-node scripts/seed-data.ts", "seed:small": "SEED_ENTITIES=1000 SEED_RELATIONSHIPS=5000 ts-node scripts/seed-data.ts", "start": "node dist/index.js", "test": "jest", "test:coverage": "jest --coverage", "test:watch": "jest --watch", "typecheck": "tsc --noEmit", "typecheck:core": "tsc -p tsconfig.core.json --noEmit"}

      129 |
      130 |       expect(packageJson.scripts).toHaveProperty('migrate');
    > 131 |       expect(packageJson.scripts).toHaveProperty('migrate:status');
          |                                   ^
      132 |       expect(packageJson.scripts).toHaveProperty('migrate:create');
      133 |
      134 |       expect(packageJson.scripts.migrate).toContain('migrate-neo4j.js migrate');

      at Object.<anonymous> (server/src/tests/entityModelStructure.test.js:131:35)

  ● Entity Model Structure › Migration Content Validation › initial migration should have comprehensive constraints

    expect(received).toMatch(expected)

    Expected pattern: /entity_type.*INDEX/
    Received string:  "async up(session) {
        console.log('🔄 Setting up Neo4j entity model...');·
        // === NODE CONSTRAINTS ===
        // Unique constraints for primary keys
        const nodeConstraints = [
          'CREATE CONSTRAINT entity_id_unique IF NOT EXISTS FOR (e:Entity) REQUIRE e.id IS UNIQUE',
          'CREATE CONSTRAINT user_id_unique IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE',
          'CREATE CONSTRAINT investigation_id_unique IF NOT EXISTS FOR (i:Investigation) REQUIRE i.id IS UNIQUE',·
          // Email constraints
          'CREATE CONSTRAINT user_email_unique IF NOT EXISTS FOR (u:User) REQUIRE u.email IS UNIQUE',
          'CREATE CONSTRAINT user_username_unique IF NOT EXISTS FOR (u:User) REQUIRE u.username IS UNIQUE',·
          // Required field constraints
          'CREATE CONSTRAINT entity_type_exists IF NOT EXISTS FOR (e:Entity) REQUIRE e.type IS NOT NULL',
          'CREATE CONSTRAINT entity_label_exists IF NOT EXISTS FOR (e:Entity) REQUIRE e.label IS NOT NULL',
          'CREATE CONSTRAINT investigation_title_exists IF NOT EXISTS FOR (i:Investigation) REQUIRE i.title IS NOT NULL',
          'CREATE CONSTRAINT user_email_exists IF NOT EXISTS FOR (u:User) REQUIRE u.email IS NOT NULL',
        ];·
        for (const constraint of nodeConstraints) {
          try {
            await session.run(constraint);
            console.log(`✅ Created constraint: ${constraint.split(' ')[2]}`);
          } catch (error) {
            if (
              !error.message.includes('already exists') &&
              !error.message.includes('An equivalent')
            ) {
              console.warn(`⚠️  Failed to create constraint: ${error.message}`);
            }
          }
        }·
        // === RELATIONSHIP CONSTRAINTS ===
        const relationshipConstraints = [
          'CREATE CONSTRAINT relationship_id_unique IF NOT EXISTS FOR ()-[r:RELATIONSHIP]-() REQUIRE r.id IS UNIQUE',
          'CREATE CONSTRAINT created_by_id_unique IF NOT EXISTS FOR ()-[r:CREATED_BY]-() REQUIRE r.id IS UNIQUE',
          'CREATE CONSTRAINT belongs_to_id_unique IF NOT EXISTS FOR ()-[r:BELONGS_TO]-() REQUIRE r.id IS UNIQUE',
          'CREATE CONSTRAINT assigned_to_id_unique IF NOT EXISTS FOR ()-[r:ASSIGNED_TO]-() REQUIRE r.id IS UNIQUE',
        ];·
        for (const constraint of relationshipConstraints) {
          try {
            await session.run(constraint);
            console.log(
              `✅ Created relationship constraint: ${constraint.split(' ')[2]}`,
            );
          } catch (error) {
            if (
              !error.message.includes('already exists') &&
              !error.message.includes('An equivalent')
            ) {
              console.warn(
                `⚠️  Failed to create relationship constraint: ${error.message}`,
              );
            }
          }
        }·
        // === PERFORMANCE INDEXES ===
        const performanceIndexes = [
          // Entity indexes
          'CREATE INDEX entity_type_idx IF NOT EXISTS FOR (e:Entity) ON (e.type)',
          'CREATE INDEX entity_investigation_idx IF NOT EXISTS FOR (e:Entity) ON (e.investigationId)',
          'CREATE INDEX entity_created_by_idx IF NOT EXISTS FOR (e:Entity) ON (e.createdBy)',
          'CREATE INDEX entity_created_at_idx IF NOT EXISTS FOR (e:Entity) ON (e.createdAt)',
          'CREATE INDEX entity_updated_at_idx IF NOT EXISTS FOR (e:Entity) ON (e.updatedAt)',
          'CREATE INDEX entity_confidence_idx IF NOT EXISTS FOR (e:Entity) ON (e.confidence)',·
          // Investigation indexes
          'CREATE INDEX investigation_status_idx IF NOT EXISTS FOR (i:Investigation) ON (i.status)',
          'CREATE INDEX investigation_priority_idx IF NOT EXISTS FOR (i:Investigation) ON (i.priority)',
          'CREATE INDEX investigation_created_by_idx IF NOT EXISTS FOR (i:Investigation) ON (i.createdBy)',
          'CREATE INDEX investigation_created_at_idx IF NOT EXISTS FOR (i:Investigation) ON (i.createdAt)',
          'CREATE INDEX investigation_updated_at_idx IF NOT EXISTS FOR (i:Investigation) ON (i.updatedAt)',·
          // User indexes
          'CREATE INDEX user_role_idx IF NOT EXISTS FOR (u:User) ON (u.role)',
          'CREATE INDEX user_active_idx IF NOT EXISTS FOR (u:User) ON (u.isActive)',
          'CREATE INDEX user_last_login_idx IF NOT EXISTS FOR (u:User) ON (u.lastLogin)',·
          // Relationship indexes
          'CREATE INDEX relationship_type_idx IF NOT EXISTS FOR ()-[r:RELATIONSHIP]-() ON (r.type)',
          'CREATE INDEX relationship_investigation_idx IF NOT EXISTS FOR ()-[r:RELATIONSHIP]-() ON (r.investigationId)',
          'CREATE INDEX relationship_created_at_idx IF NOT EXISTS FOR ()-[r:RELATIONSHIP]-() ON (r.createdAt)',
          'CREATE INDEX relationship_confidence_idx IF NOT EXISTS FOR ()-[r:RELATIONSHIP]-() ON (r.confidence)',
        ];·
        for (const index of performanceIndexes) {
          try {
            await session.run(index);
            console.log(`✅ Created index: ${index.split(' ')[2]}`);
          } catch (error) {
            if (
              !error.message.includes('already exists') &&
              !error.message.includes('An equivalent')
            ) {
              console.warn(`⚠️  Failed to create index: ${error.message}`);
            }
          }
        }·
        // === FULL-TEXT SEARCH INDEXES ===
        const fulltextIndexes = [
          'CREATE FULLTEXT INDEX entity_search_idx IF NOT EXISTS FOR (e:Entity) ON EACH [e.label, e.description]',
          'CREATE FULLTEXT INDEX investigation_search_idx IF NOT EXISTS FOR (i:Investigation) ON EACH [i.title, i.description]',
          'CREATE FULLTEXT INDEX user_search_idx IF NOT EXISTS FOR (u:User) ON EACH [u.firstName, u.lastName, u.username, u.email]',
        ];·
        for (const index of fulltextIndexes) {
          try {
            await session.run(index);
            console.log(`✅ Created fulltext index: ${index.split(' ')[3]}`);
          } catch (error) {
            if (
              !error.message.includes('already exists') &&
              !error.message.includes('An equivalent')
            ) {
              console.warn(`⚠️  Failed to create fulltext index: ${error.message}`);
            }
          }
        }·
        // === COMPOSITE INDEXES FOR COMPLEX QUERIES ===
        const compositeIndexes = [
          'CREATE INDEX entity_type_investigation_idx IF NOT EXISTS FOR (e:Entity) ON (e.type, e.investigationId)',
          'CREATE INDEX entity_confidence_type_idx IF NOT EXISTS FOR (e:Entity) ON (e.confidence, e.type)',
          'CREATE INDEX investigation_status_priority_idx IF NOT EXISTS FOR (i:Investigation) ON (i.status, i.priority)',
          'CREATE INDEX relationship_type_confidence_idx IF NOT EXISTS FOR ()-[r:RELATIONSHIP]-() ON (r.type, r.confidence)',
        ];·
        for (const index of compositeIndexes) {
          try {
            await session.run(index);
            console.log(`✅ Created composite index: ${index.split(' ')[2]}`);
          } catch (error) {
            if (
              !error.message.includes('already exists') &&
              !error.message.includes('An equivalent')
            ) {
              console.warn(
                `⚠️  Failed to create composite index: ${error.message}`,
              );
            }
          }
        }·
        // === RANGE INDEXES FOR NUMERIC AND DATE QUERIES ===
        const rangeIndexes = [
          'CREATE RANGE INDEX entity_confidence_range_idx IF NOT EXISTS FOR (e:Entity) ON (e.confidence)',
          'CREATE RANGE INDEX entity_created_range_idx IF NOT EXISTS FOR (e:Entity) ON (e.createdAt)',
          'CREATE RANGE INDEX relationship_confidence_range_idx IF NOT EXISTS FOR ()-[r:RELATIONSHIP]-() ON (r.confidence)',
          'CREATE RANGE INDEX investigation_created_range_idx IF NOT EXISTS FOR (i:Investigation) ON (i.createdAt)',
        ];·
        for (const index of rangeIndexes) {
          try {
            await session.run(index);
            console.log(`✅ Created range index: ${index.split(' ')[3]}`);
          } catch (error) {
            if (
              !error.message.includes('already exists') &&
              !error.message.includes('An equivalent')
            ) {
              console.warn(`⚠️  Failed to create range index: ${error.message}`);
            }
          }
        }·
        console.log('✅ Neo4j entity model setup completed successfully');
      }"

      159 |
      160 |       // Should include key indexes
    > 161 |       expect(migrationString).toMatch(/entity_type.*INDEX/);
          |                               ^
      162 |       expect(migrationString).toMatch(/investigation_status.*INDEX/);
      163 |       expect(migrationString).toMatch(/FULLTEXT.*INDEX/);
      164 |

      at Object.<anonymous> (server/src/tests/entityModelStructure.test.js:161:31)

  ● Entity Model Structure › Entity Model Constants and Types › should define entity types from GraphQL schema file

    ENOENT: no such file or directory, open '/Users/brianlong/Developer/summit/server/src/graphql/schema/core.js'

      195 |
      196 |       const schemaPath = path.join(__dirname, '../graphql/schema/core.js');
    > 197 |       const schemaContent = await fs.readFile(schemaPath, 'utf8');
          |                             ^
      198 |
      199 |       // Should define EntityType enum
      200 |       expect(schemaContent).toMatch(/enum EntityType/);

      at Object.<anonymous> (server/src/tests/entityModelStructure.test.js:197:29)

  ● Entity Model Structure › Entity Model Constants and Types › should define relationship types from GraphQL schema file

    ENOENT: no such file or directory, open '/Users/brianlong/Developer/summit/server/src/graphql/schema/core.js'

      211 |
      212 |       const schemaPath = path.join(__dirname, '../graphql/schema/core.js');
    > 213 |       const schemaContent = await fs.readFile(schemaPath, 'utf8');
          |                             ^
      214 |
      215 |       // Should define RelationshipType enum
      216 |       expect(schemaContent).toMatch(/enum RelationshipType/);

      at Object.<anonymous> (server/src/tests/entityModelStructure.test.js:213:29)

  ● Entity Model Structure › Database Configuration Integration › should integrate migration system with database config

    ENOENT: no such file or directory, open '/Users/brianlong/Developer/summit/server/src/config/database.js'

      227 |
      228 |       const dbConfigPath = path.join(__dirname, '../config/database.js');
    > 229 |       const dbConfigContent = await fs.readFile(dbConfigPath, 'utf8');
          |                               ^
      230 |
      231 |       // Should have migration integration
      232 |       expect(dbConfigContent).toMatch(/runNeo4jMigrations|migrationManager/);

      at Object.<anonymous> (server/src/tests/entityModelStructure.test.js:229:31)

FAIL server server/tests/security/crypto-pipeline.test.ts
  ● Test suite failed to run

    [96mserver/tests/security/crypto-pipeline.test.ts[0m:[93m9[0m:[93m8[0m - [91merror[0m[90m TS2307: [0mCannot find module '../src/security/crypto/index.js' or its corresponding type declarations.

    [7m9[0m } from '../src/security/crypto/index.js';
    [7m [0m [91m       ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m

FAIL client client/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx
  ● Test suite failed to run

    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m56[0m:[93m53[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m56[0m     expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    [7m  [0m [91m                                                    ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m57[0m:[93m47[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m57[0m     expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
    [7m  [0m [91m                                              ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m60[0m:[93m42[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m60[0m     expect(screen.getByRole('combobox')).toBeInTheDocument();
    [7m  [0m [91m                                         ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m61[0m:[93m43[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m61[0m     expect(screen.getByText('Real-time')).toBeInTheDocument();
    [7m  [0m [91m                                          ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m62[0m:[93m51[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m62[0m     expect(screen.getByLabelText('Refresh Data')).toBeInTheDocument();
    [7m  [0m [91m                                                  ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m63[0m:[93m50[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m63[0m     expect(screen.getByLabelText('Export Data')).toBeInTheDocument();
    [7m  [0m [91m                                                 ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m64[0m:[93m47[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m64[0m     expect(screen.getByLabelText('Settings')).toBeInTheDocument();
    [7m  [0m [91m                                              ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m71[0m:[93m48[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m71[0m     expect(screen.getByText('Total Entities')).toBeInTheDocument();
    [7m  [0m [91m                                               ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m72[0m:[93m46[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m72[0m     expect(screen.getByText('Active Users')).toBeInTheDocument();
    [7m  [0m [91m                                             ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m73[0m:[93m48[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m73[0m     expect(screen.getByText('Avg Query Time')).toBeInTheDocument();
    [7m  [0m [91m                                               ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m74[0m:[93m52[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m74[0m     expect(screen.getByText('Data Quality Score')).toBeInTheDocument();
    [7m  [0m [91m                                                   ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m75[0m:[93m49[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m75[0m     expect(screen.getByText('Security Alerts')).toBeInTheDocument();
    [7m  [0m [91m                                                ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m76[0m:[93m48[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m76[0m     expect(screen.getByText('API Calls/Hour')).toBeInTheDocument();
    [7m  [0m [91m                                               ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m79[0m:[93m40[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m79[0m     expect(screen.getByText(/15,842/)).toBeInTheDocument();
    [7m  [0m [91m                                       ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m80[0m:[93m40[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m80[0m     expect(screen.getByText(/94\.2%/)).toBeInTheDocument();
    [7m  [0m [91m                                       ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m86[0m:[93m61[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m86[0m     expect(screen.getByText('Real-time monitoring active')).toBeInTheDocument();
    [7m  [0m [91m                                                            ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m87[0m:[93m51[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m87[0m     expect(screen.getByText('Updates every 60s')).toBeInTheDocument();
    [7m  [0m [91m                                                  ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m99[0m:[93m29[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m99[0m     expect(timeRangeSelect).toBeInTheDocument();
    [7m  [0m [91m                            ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m102[0m:[93m47[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m102[0m     expect(screen.getByText('Last 24 Hours')).toBeInTheDocument();
    [7m   [0m [91m                                              ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m113[0m:[93m28[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeChecked' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m113[0m     expect(realTimeSwitch).toBeChecked();
    [7m   [0m [91m                           ~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m132[0m:[93m45[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m132[0m     expect(screen.getByRole('progressbar')).toBeInTheDocument();
    [7m   [0m [91m                                            ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m140[0m:[93m53[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'Matchers<void, HTMLElement>'.

    [7m140[0m       expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    [7m   [0m [91m                                                    ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m148[0m:[93m42[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m148[0m     expect(screen.getByText('Overview')).toBeInTheDocument();
    [7m   [0m [91m                                         ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m149[0m:[93m45[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m149[0m     expect(screen.getByText('Performance')).toBeInTheDocument();
    [7m   [0m [91m                                            ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m150[0m:[93m39[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m150[0m     expect(screen.getByText('Usage')).toBeInTheDocument();
    [7m   [0m [91m                                      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m151[0m:[93m42[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m151[0m     expect(screen.getByText('Security')).toBeInTheDocument();
    [7m   [0m [91m                                         ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m158[0m:[93m7[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m158[0m     ).toBeInTheDocument();
    [7m   [0m [91m      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m165[0m:[93m7[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m165[0m     ).toBeInTheDocument();
    [7m   [0m [91m      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m196[0m:[93m45[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m196[0m     expect(screen.getByRole('progressbar')).toBeInTheDocument();
    [7m   [0m [91m                                            ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m199[0m:[93m27[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeDisabled' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m199[0m     expect(refreshButton).toBeDisabled();
    [7m   [0m [91m                          ~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m206[0m:[93m51[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m206[0m     expect(screen.getByLabelText('Refresh Data')).toBeInTheDocument();
    [7m   [0m [91m                                                  ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m207[0m:[93m50[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m207[0m     expect(screen.getByLabelText('Export Data')).toBeInTheDocument();
    [7m   [0m [91m                                                 ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m208[0m:[93m47[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m208[0m     expect(screen.getByLabelText('Settings')).toBeInTheDocument();
    [7m   [0m [91m                                              ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m209[0m:[93m42[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m209[0m     expect(screen.getByRole('combobox')).toBeInTheDocument();
    [7m   [0m [91m                                         ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m213[0m:[93m21[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m213[0m     expect(tabList).toBeInTheDocument();
    [7m   [0m [91m                    ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m220[0m:[93m40[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m220[0m     expect(screen.getByText(/15,842/)).toBeInTheDocument();
    [7m   [0m [91m                                       ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m221[0m:[93m40[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m221[0m     expect(screen.getByText(/94\.2%/)).toBeInTheDocument();
    [7m   [0m [91m                                       ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m222[0m:[93m39[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m222[0m     expect(screen.getByText(/245ms/)).toBeInTheDocument();
    [7m   [0m [91m                                      ~~~~~~~~~~~~~~~~~[0m

PASS server server/src/tests/notificationService.test.js
FAIL client client/src/components/timeline/__tests__/TemporalAnalysis.test.tsx
  ● Test suite failed to run

    [96mclient/src/components/timeline/__tests__/TemporalAnalysis.test.tsx[0m:[93m91[0m:[93m51[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m91[0m     expect(screen.getByText(/Temporal Analysis/)).toBeInTheDocument();
    [7m  [0m [91m                                                  ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/timeline/__tests__/TemporalAnalysis.test.tsx[0m:[93m92[0m:[93m39[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m92[0m     expect(screen.getByText(/Reset/)).toBeInTheDocument();
    [7m  [0m [91m                                      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/timeline/__tests__/TemporalAnalysis.test.tsx[0m:[93m98[0m:[93m58[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m98[0m     expect(screen.getByTestId('timeline-visualization')).toBeInTheDocument();
    [7m  [0m [91m                                                         ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/timeline/__tests__/TemporalAnalysis.test.tsx[0m:[93m104[0m:[93m52[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m104[0m     expect(screen.getByTestId('event-statistics')).toBeInTheDocument();
    [7m   [0m [91m                                                   ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/timeline/__tests__/TemporalAnalysis.test.tsx[0m:[93m114[0m:[93m17[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m114[0m     expect(btn).toBeInTheDocument();
    [7m   [0m [91m                ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/timeline/__tests__/TemporalAnalysis.test.tsx[0m:[93m117[0m:[93m17[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m117[0m     expect(btn).toBeInTheDocument();
    [7m   [0m [91m                ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/timeline/__tests__/TemporalAnalysis.test.tsx[0m:[93m128[0m:[93m17[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m128[0m     expect(viz).toBeInTheDocument();
    [7m   [0m [91m                ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/timeline/__tests__/TemporalAnalysis.test.tsx[0m:[93m134[0m:[93m43[0m - [91merror[0m[90m TS2322: [0mType '{ enableZoom: boolean; events: ({ id: string; timestamp: number; title: string; description: string; type: "system"; severity: "low"; entities: string[]; confidence: number; } | { id: string; timestamp: number; ... 5 more ...; confidence: number; })[]; onEventSelect: Mock<...>; onTimeRangeChange: Mock<...>; showClus...' is not assignable to type 'IntrinsicAttributes & TemporalAnalysisProps'.
      Property 'enableZoom' does not exist on type 'IntrinsicAttributes & TemporalAnalysisProps'.

    [7m134[0m       <TemporalAnalysis {...defaultProps} enableZoom={true} />,
    [7m   [0m [91m                                          ~~~~~~~~~~[0m
    [96mclient/src/components/timeline/__tests__/TemporalAnalysis.test.tsx[0m:[93m140[0m:[93m17[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m140[0m     expect(viz).toBeInTheDocument();
    [7m   [0m [91m                ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/timeline/__tests__/TemporalAnalysis.test.tsx[0m:[93m148[0m:[93m25[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m148[0m     expect(timelineViz).toBeInTheDocument();
    [7m   [0m [91m                        ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/timeline/__tests__/TemporalAnalysis.test.tsx[0m:[93m153[0m:[93m43[0m - [91merror[0m[90m TS2322: [0mType '{ investigationId: string; events: ({ id: string; timestamp: number; title: string; description: string; type: "system"; severity: "low"; entities: string[]; confidence: number; } | { id: string; timestamp: number; ... 5 more ...; confidence: number; })[]; ... 4 more ...; enableZoom: boolean; }' is not assignable to type 'IntrinsicAttributes & TemporalAnalysisProps'.
      Property 'investigationId' does not exist on type 'IntrinsicAttributes & TemporalAnalysisProps'.

    [7m153[0m       <TemporalAnalysis {...defaultProps} investigationId="inv-456" />,
    [7m   [0m [91m                                          ~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/timeline/__tests__/TemporalAnalysis.test.tsx[0m:[93m156[0m:[93m58[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m156[0m     expect(screen.getByTestId('timeline-visualization')).toBeInTheDocument();
    [7m   [0m [91m                                                         ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/timeline/__tests__/TemporalAnalysis.test.tsx[0m:[93m162[0m:[93m43[0m - [91merror[0m[90m TS2322: [0mType '{ onEventSelect: Mock<any, any, any>; events: ({ id: string; timestamp: number; title: string; description: string; type: "system"; severity: "low"; entities: string[]; confidence: number; } | { ...; })[]; onTimeRangeChange: Mock<...>; showClusters: boolean; showAnomalies: boolean; enableZoom: boolean; }' is not assignable to type 'IntrinsicAttributes & TemporalAnalysisProps'.
      Property 'onEventSelect' does not exist on type 'IntrinsicAttributes & TemporalAnalysisProps'.

    [7m162[0m       <TemporalAnalysis {...defaultProps} onEventSelect={onEventSelect} />,
    [7m   [0m [91m                                          ~~~~~~~~~~~~~[0m
    [96mclient/src/components/timeline/__tests__/TemporalAnalysis.test.tsx[0m:[93m167[0m:[93m25[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m167[0m     expect(timelineViz).toBeInTheDocument();
    [7m   [0m [91m                        ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/timeline/__tests__/TemporalAnalysis.test.tsx[0m:[93m183[0m:[93m19[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m183[0m     expect(reset).toBeInTheDocument();
    [7m   [0m [91m                  ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/timeline/__tests__/TemporalAnalysis.test.tsx[0m:[93m191[0m:[93m25[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m191[0m     expect(timelineViz).toBeInTheDocument();
    [7m   [0m [91m                        ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/timeline/__tests__/TemporalAnalysis.test.tsx[0m:[93m196[0m:[93m43[0m - [91merror[0m[90m TS2322: [0mType '{ enableZoom: boolean; events: ({ id: string; timestamp: number; title: string; description: string; type: "system"; severity: "low"; entities: string[]; confidence: number; } | { id: string; timestamp: number; ... 5 more ...; confidence: number; })[]; onEventSelect: Mock<...>; onTimeRangeChange: Mock<...>; showClus...' is not assignable to type 'IntrinsicAttributes & TemporalAnalysisProps'.
      Property 'enableZoom' does not exist on type 'IntrinsicAttributes & TemporalAnalysisProps'.

    [7m196[0m       <TemporalAnalysis {...defaultProps} enableZoom={false} />,
    [7m   [0m [91m                                          ~~~~~~~~~~[0m
    [96mclient/src/components/timeline/__tests__/TemporalAnalysis.test.tsx[0m:[93m201[0m:[93m25[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m201[0m     expect(timelineViz).toBeInTheDocument();
    [7m   [0m [91m                        ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/timeline/__tests__/TemporalAnalysis.test.tsx[0m:[93m215[0m:[93m23[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveClass' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m215[0m     expect(container).toHaveClass('custom-temporal-class');
    [7m   [0m [91m                      ~~~~~~~~~~~[0m
    [96mclient/src/components/timeline/__tests__/TemporalAnalysis.test.tsx[0m:[93m222[0m:[93m25[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveStyle' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m222[0m     expect(timelineViz).toHaveStyle({ width: '100%' });
    [7m   [0m [91m                        ~~~~~~~~~~~[0m
    [96mclient/src/components/timeline/__tests__/TemporalAnalysis.test.tsx[0m:[93m232[0m:[93m25[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m232[0m     expect(timelineViz).toBeInTheDocument();
    [7m   [0m [91m                        ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/timeline/__tests__/TemporalAnalysis.test.tsx[0m:[93m243[0m:[93m25[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m243[0m     expect(timelineViz).toBeInTheDocument();
    [7m   [0m [91m                        ~~~~~~~~~~~~~~~~~[0m

PASS server server/src/tests/piiOntologyEngine.test.ts
FAIL server server/tests/legal-hold-orchestrator.test.ts
  ● Test suite failed to run

    [96mserver/tests/legal-hold-orchestrator.test.ts[0m:[93m203[0m:[93m14[0m - [91merror[0m[90m TS2304: [0mCannot find name 'EDiscoveryCollectionRequest'.

    [7m203[0m     request: EDiscoveryCollectionRequest,
    [7m   [0m [91m             ~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
    [96mserver/tests/legal-hold-orchestrator.test.ts[0m:[93m204[0m:[93m14[0m - [91merror[0m[90m TS2304: [0mCannot find name 'EDiscoveryCollectionResult'.

    [7m204[0m   ): Promise<EDiscoveryCollectionResult> {
    [7m   [0m [91m             ~~~~~~~~~~~~~~~~~~~~~~~~~~[0m

FAIL server server/tests/services/AuthService.test.js
  ● Test suite failed to run

    [96mserver/src/services/AuthService.ts[0m:[93m102[0m:[93m5[0m - [91merror[0m[90m TS2740: [0mType 'ManagedPostgresPool' is missing the following properties from type 'Pool': totalCount, idleCount, waitingCount, expiredCount, and 17 more.

    [7m102[0m     this.pool = getPostgresPool();
    [7m   [0m [91m    ~~~~~~~~~[0m
    [96mserver/src/services/AuthService.ts[0m:[93m214[0m:[93m23[0m - [91merror[0m[90m TS2769: [0mNo overload matches this call.
      Overload 1 of 5, '(payload: string | object | Buffer<ArrayBufferLike>, secretOrPrivateKey: null, options?: SignOptions & { algorithm: "none"; }): string', gave the following error.
        Argument of type 'string' is not assignable to parameter of type 'null'.
      Overload 2 of 5, '(payload: string | object | Buffer<ArrayBufferLike>, secretOrPrivateKey: Buffer<ArrayBufferLike> | Secret | PrivateKeyInput | JsonWebKeyInput, options?: SignOptions): string', gave the following error.
        Type 'string' is not assignable to type 'number | StringValue'.
      Overload 3 of 5, '(payload: string | object | Buffer<ArrayBufferLike>, secretOrPrivateKey: Buffer<ArrayBufferLike> | Secret | PrivateKeyInput | JsonWebKeyInput, callback: SignCallback): void', gave the following error.
        Object literal may only specify known properties, and 'expiresIn' does not exist in type 'SignCallback'.

    [7m214[0m     const token = jwt.sign(tokenPayload, config.jwt.secret, {
    [7m   [0m [91m                      ~~~~[0m

      [96mnode_modules/@types/jsonwebtoken/index.d.ts[0m:[93m43[0m:[93m5[0m
        [7m43[0m     expiresIn?: StringValue | number;
        [7m  [0m [96m    ~~~~~~~~~[0m
        The expected type comes from property 'expiresIn' which is declared here on type 'SignOptions'

FAIL server server/src/config/distributed/__tests__/distributed-config-service.test.ts
  ● Test suite failed to run

    [96mserver/src/config/distributed/__tests__/distributed-config-service.test.ts[0m:[93m76[0m:[93m11[0m - [91merror[0m[90m TS2741: [0mProperty 'enableCaching' is missing in type '{ enableStreaming: true; }' but required in type '{ enableCaching: boolean; enableStreaming: boolean; }'.

    [7m76[0m           features: { enableStreaming: true },
    [7m  [0m [91m          ~~~~~~~~[0m

      [96mserver/src/config/distributed/__tests__/distributed-config-service.test.ts[0m:[93m33[0m:[93m7[0m
        [7m33[0m       enableCaching: true,
        [7m  [0m [96m      ~~~~~~~~~~~~~~~~~~~[0m
        'enableCaching' is declared here.
      [96mserver/src/config/distributed/__tests__/distributed-config-service.test.ts[0m:[93m32[0m:[93m5[0m
        [7m32[0m     features: {
        [7m  [0m [96m    ~~~~~~~~~~~[0m
        [7m33[0m       enableCaching: true,
        [7m  [0m [96m~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
        [7m34[0m       enableStreaming: false,
        [7m  [0m [96m~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
        [7m35[0m     },
        [7m  [0m [96m~~~~~[0m
        The expected type comes from property 'features' which is declared here on type 'Partial<{ endpoint: string; retries: number; features: { enableCaching: boolean; enableStreaming: boolean; }; database: { host: string; password: { __secretRef: { provider: string; key: string; }; }; }; }>'
    [96mserver/src/config/distributed/__tests__/distributed-config-service.test.ts[0m:[93m135[0m:[93m19[0m - [91merror[0m[90m TS2741: [0mProperty 'enableCaching' is missing in type '{ enableStreaming: true; }' but required in type '{ enableCaching: boolean; enableStreaming: boolean; }'.

    [7m135[0m         config: { features: { enableStreaming: true } },
    [7m   [0m [91m                  ~~~~~~~~[0m

      [96mserver/src/config/distributed/__tests__/distributed-config-service.test.ts[0m:[93m33[0m:[93m7[0m
        [7m33[0m       enableCaching: true,
        [7m  [0m [96m      ~~~~~~~~~~~~~~~~~~~[0m
        'enableCaching' is declared here.
      [96mserver/src/config/distributed/__tests__/distributed-config-service.test.ts[0m:[93m32[0m:[93m5[0m
        [7m32[0m     features: {
        [7m  [0m [96m    ~~~~~~~~~~~[0m
        [7m33[0m       enableCaching: true,
        [7m  [0m [96m~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
        [7m34[0m       enableStreaming: false,
        [7m  [0m [96m~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
        [7m35[0m     },
        [7m  [0m [96m~~~~~[0m
        The expected type comes from property 'features' which is declared here on type 'Partial<{ endpoint: string; retries: number; features: { enableCaching: boolean; enableStreaming: boolean; }; database: { host: string; password: { __secretRef: { provider: string; key: string; }; }; }; }>'
    [96mserver/src/config/distributed/__tests__/distributed-config-service.test.ts[0m:[93m164[0m:[93m23[0m - [91merror[0m[90m TS2741: [0mProperty 'enableCaching' is missing in type '{ enableStreaming: true; }' but required in type '{ enableCaching: boolean; enableStreaming: boolean; }'.

    [7m164[0m             config: { features: { enableStreaming: true } },
    [7m   [0m [91m                      ~~~~~~~~[0m

      [96mserver/src/config/distributed/__tests__/distributed-config-service.test.ts[0m:[93m33[0m:[93m7[0m
        [7m33[0m       enableCaching: true,
        [7m  [0m [96m      ~~~~~~~~~~~~~~~~~~~[0m
        'enableCaching' is declared here.
      [96mserver/src/config/distributed/__tests__/distributed-config-service.test.ts[0m:[93m32[0m:[93m5[0m
        [7m32[0m     features: {
        [7m  [0m [96m    ~~~~~~~~~~~[0m
        [7m33[0m       enableCaching: true,
        [7m  [0m [96m~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
        [7m34[0m       enableStreaming: false,
        [7m  [0m [96m~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
        [7m35[0m     },
        [7m  [0m [96m~~~~~[0m
        The expected type comes from property 'features' which is declared here on type 'Partial<{ endpoint: string; retries: number; features: { enableCaching: boolean; enableStreaming: boolean; }; database: { host: string; password: { __secretRef: { provider: string; key: string; }; }; }; }>'

/Users/brianlong/Developer/summit/server/src/services/ticket-links.ts:22
    if (runExists.rows.length === 0) {
                  ^

TypeError: Cannot read properties of undefined (reading 'rows')
    at addTicketRunLink (/Users/brianlong/Developer/summit/server/src/services/ticket-links.ts:36:17)

Node.js v20.19.5

> intelgraph-platform@1.0.0 test:jest /Users/brianlong/Developer/summit
> jest --config jest.projects.cjs --maxWorkers=50% --detectOpenHandles

jest-haste-map: duplicate manual mock found: utils/logger
  The following files share their name; please delete one of them:
    * <rootDir>/server/dist/__mocks__/utils/logger.js
    * <rootDir>/server/src/__mocks__/utils/logger.ts

PASS server server/src/tests/integrationService.test.js
PASS server server/src/tests/simulationEngine.test.js
PASS server server/src/tests/pluginService.test.js
PASS server server/src/tests/mobileService.test.js
PASS server server/src/tests/visualizationService.test.js
PASS server server/src/tests/reportingService.test.js
PASS server server/src/tests/copilotOrchestration.test.js (10.07 s)
PASS server server/src/tests/enterpriseSecurity.test.js
PASS server server/src/tests/advancedAnalytics.test.js
PASS server server/src/tests/aiExtraction.test.js (8.604 s)
PASS server server/src/tests/copilot.persistence.test.js
FAIL server server/tests/graph-operations.test.js (10.747 s)
  ● Graph Operations Tests › Graph Export Functionality › should export graph as CSV

    expect(received).toBe(expected) // Object.is equality

    Expected: "text/csv; charset=utf-8"
    Received: "text/csv"

      183 |         .expect(200);
      184 |
    > 185 |       expect(response.type).toBe('text/csv; charset=utf-8');
          |                             ^
      186 |       expect(response.text).toContain('Nodes');
      187 |       expect(response.text).toContain('Edges');
      188 |       expect(response.text).toContain('id,label,type');

      at Object.<anonymous> (server/tests/graph-operations.test.js:185:29)

  ● Graph Operations Tests › Graph Export Functionality › should export graph as GraphML

    expect(received).toBe(expected) // Object.is equality

    Expected: "application/xml; charset=utf-8"
    Received: "application/xml"

      195 |         .expect(200);
      196 |
    > 197 |       expect(response.type).toBe('application/xml; charset=utf-8');
          |                             ^
      198 |       expect(response.text).toContain('<?xml');
      199 |       expect(response.text).toContain('<graphml');
      200 |       expect(response.text).toContain('<node id=');

      at Object.<anonymous> (server/tests/graph-operations.test.js:197:29)

  ● Graph Operations Tests › Graph Export Functionality › should stream large graph exports

    expect(received).toBe(expected) // Object.is equality

    Expected: "chunked"
    Received: undefined

      222 |           // We can't check the full body because it's a stream
      223 |           // but we can check that the response is chunked
    > 224 |           expect(res.headers['transfer-encoding']).toBe('chunked');
          |                                                    ^
      225 |           done();
      226 |         });
      227 |     });

      at Test.<anonymous> (server/tests/graph-operations.test.js:224:52)
      at Test.assert (node_modules/.pnpm/supertest@6.3.3/node_modules/supertest/lib/test.js:172:8)
      at Server.localAssert (node_modules/.pnpm/supertest@6.3.3/node_modules/supertest/lib/test.js:120:14)

  ● Graph Operations Tests › Graph Export Functionality › should stream large graph exports

    thrown: "Exceeded timeout of 5000 ms for a test while waiting for `done()` to be called.
    Add a timeout value to this test to increase the timeout, if this is a long-running test. See https://jestjs.io/docs/api#testname-fn-timeout."

      27 | globalThis.it = Object.assign((name, fn, t) => {
      28 |   if (q.some((s) => name.includes(s))) return orig.skip(name, fn, t);
    > 29 |   return orig(name, fn, t);
         |          ^
      30 | }, orig);
      31 |
      32 | try {

      at jest.setup.js:29:10
      at server/tests/graph-operations.test.js:212:5
      at server/tests/graph-operations.test.js:165:3
      at Object.<anonymous> (server/tests/graph-operations.test.js:158:1)

  ● Graph Operations Tests › Performance and Stress Tests › should stream large graph exports

    expect(received).toBe(expected) // Object.is equality

    Expected: "chunked"
    Received: undefined

      507 |           // We can't check the full body because it's a stream
      508 |           // but we can check that the response is chunked
    > 509 |           expect(res.headers['transfer-encoding']).toBe('chunked');
          |                                                    ^
      510 |           done();
      511 |         });
      512 |     });

      at Test.<anonymous> (server/tests/graph-operations.test.js:509:52)
      at Test.assert (node_modules/.pnpm/supertest@6.3.3/node_modules/supertest/lib/test.js:172:8)
      at Server.localAssert (node_modules/.pnpm/supertest@6.3.3/node_modules/supertest/lib/test.js:120:14)

  ● Graph Operations Tests › Performance and Stress Tests › should stream large graph exports

    thrown: "Exceeded timeout of 5000 ms for a test while waiting for `done()` to be called.
    Add a timeout value to this test to increase the timeout, if this is a long-running test. See https://jestjs.io/docs/api#testname-fn-timeout."

      27 | globalThis.it = Object.assign((name, fn, t) => {
      28 |   if (q.some((s) => name.includes(s))) return orig.skip(name, fn, t);
    > 29 |   return orig(name, fn, t);
         |          ^
      30 | }, orig);
      31 |
      32 | try {

      at jest.setup.js:29:10
      at server/tests/graph-operations.test.js:497:5
      at server/tests/graph-operations.test.js:438:3
      at Object.<anonymous> (server/tests/graph-operations.test.js:158:1)

  ● Graph Operations Tests › Error Handling › should handle invalid filter parameters

    expect(received).toContain(expected) // indexOf

    Expected value: 500
    Received array: [200, 400]

      534 |
      535 |       // Should handle gracefully
    > 536 |       expect([200, 400]).toContain(response.status);
          |                          ^
      537 |     });
      538 |
      539 |     it('should handle negative pagination parameters', async () => {

      at Object.<anonymous> (server/tests/graph-operations.test.js:536:26)

ts-jest[ts-jest-transformer] (WARN) Define `ts-jest` config under `globals` is deprecated. Please do
transform: {
    <transform_regex>: ['ts-jest', { /* ts-jest config goes here in Jest */ }],
},
See more at https://kulshekhar.github.io/ts-jest/docs/getting-started/presets#advanced
FAIL server server/tests/integration/graphql.test.ts
  ● Test suite failed to run

    [96mserver/tests/integration/graphql.test.ts[0m:[93m2[0m:[93m30[0m - [91merror[0m[90m TS2307: [0mCannot find module '../../src/server' or its corresponding type declarations.

    [7m2[0m import { createServer } from '../../src/server';
    [7m [0m [91m                             ~~~~~~~~~~~~~~~~~~[0m
    [96mserver/tests/integration/graphql.test.ts[0m:[93m157[0m:[93m64[0m - [91merror[0m[90m TS2345: [0mArgument of type 'any' is not assignable to parameter of type 'never'.

    [7m157[0m       jest.spyOn(global.testDb, 'query').mockResolvedValueOnce({
    [7m   [0m [91m                                                               ~[0m
    [7m158[0m         rows: [testCase1, testCase2],
    [7m   [0m [91m~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
    [7m159[0m         rowCount: 2,
    [7m   [0m [91m~~~~~~~~~~~~~~~~~~~~[0m
    [7m160[0m       } as any);
    [7m   [0m [91m~~~~~~~~~~~~~~[0m
    [96mserver/tests/integration/graphql.test.ts[0m:[93m496[0m:[93m32[0m - [91merror[0m[90m TS2345: [0mArgument of type 'Error' is not assignable to parameter of type 'never'.

    [7m496[0m         .mockRejectedValueOnce(new Error('Database connection failed'));
    [7m   [0m [91m                               ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m

PASS server server/src/tests/dockerSecurity.test.js
  ● Console

    console.log
      Info: Could add docker:security script to package.json

      at Object.<anonymous> (server/src/tests/dockerSecurity.test.js:299:17)

ts-jest[ts-jest-transformer] (WARN) Define `ts-jest` config under `globals` is deprecated. Please do
transform: {
    <transform_regex>: ['ts-jest', { /* ts-jest config goes here in Jest */ }],
},
See more at https://kulshekhar.github.io/ts-jest/docs/getting-started/presets#advanced
FAIL client client/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx
  ● Test suite failed to run

    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m24[0m:[93m59[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m24[0m     expect(screen.getByText(/🤖 MLOps Model Management/)).toBeInTheDocument();
    [7m  [0m [91m                                                          ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m30[0m:[93m43[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m30[0m     expect(screen.getByText(/🎯 Models/)).toBeInTheDocument();
    [7m  [0m [91m                                          ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m31[0m:[93m51[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m31[0m     expect(screen.getByText(/🏋️ Training Jobs/)).toBeInTheDocument();
    [7m  [0m [91m                                                  ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m32[0m:[93m48[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m32[0m     expect(screen.getByText(/🧪 Experiments/)).toBeInTheDocument();
    [7m  [0m [91m                                               ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m33[0m:[93m47[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m33[0m     expect(screen.getByText(/📊 Monitoring/)).toBeInTheDocument();
    [7m  [0m [91m                                              ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m41[0m:[93m7[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m41[0m     ).toBeInTheDocument();
    [7m  [0m [91m      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m42[0m:[93m52[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m42[0m     expect(screen.getByDisplayValue('All Status')).toBeInTheDocument();
    [7m  [0m [91m                                                   ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m48[0m:[93m43[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m48[0m     expect(screen.getByText(/ML Models/)).toBeInTheDocument();
    [7m  [0m [91m                                          ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m52[0m:[93m7[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m52[0m     ).toBeInTheDocument();
    [7m  [0m [91m      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m53[0m:[93m60[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m53[0m     expect(screen.getByText('Anomaly Detection Ensemble')).toBeInTheDocument();
    [7m  [0m [91m                                                           ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m56[0m:[93m7[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m56[0m     ).toBeInTheDocument();
    [7m  [0m [91m      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m67[0m:[93m7[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m67[0m     ).toBeInTheDocument();
    [7m  [0m [91m      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m68[0m:[93m54[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m68[0m     expect(screen.getByText(/Training Job job-001/)).toBeInTheDocument();
    [7m  [0m [91m                                                     ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m72[0m:[93m48[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m72[0m     expect(screen.getByText(/ML Experiments/)).toBeInTheDocument();
    [7m  [0m [91m                                               ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m75[0m:[93m7[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m75[0m     ).toBeInTheDocument();
    [7m  [0m [91m      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m81[0m:[93m7[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m81[0m     ).toBeInTheDocument();
    [7m  [0m [91m      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m96[0m:[93m7[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m96[0m     ).toBeInTheDocument();
    [7m  [0m [91m      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m99[0m:[93m11[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'Matchers<void, HTMLElement>'.

    [7m99[0m     ).not.toBeInTheDocument();
    [7m  [0m [91m          ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m109[0m:[93m26[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveValue' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m109[0m     expect(statusSelect).toHaveValue('production');
    [7m   [0m [91m                         ~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m113[0m:[93m7[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m113[0m     ).toBeInTheDocument();
    [7m   [0m [91m      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m130[0m:[93m47[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m130[0m     expect(screen.getByText('Model Details')).toBeInTheDocument();
    [7m   [0m [91m                                              ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m131[0m:[93m53[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m131[0m     expect(screen.getByText(/Performance Metrics/)).toBeInTheDocument();
    [7m   [0m [91m                                                    ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m132[0m:[93m51[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m132[0m     expect(screen.getByText(/Model Information/)).toBeInTheDocument();
    [7m   [0m [91m                                                  ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m164[0m:[93m43[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m164[0m     expect(screen.getByText(/🚀 Deploy/)).toBeInTheDocument();
    [7m   [0m [91m                                          ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m175[0m:[93m49[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'Matchers<void, HTMLElement>'.

    [7m175[0m     expect(screen.queryByText(/🚀 Deploy/)).not.toBeInTheDocument();
    [7m   [0m [91m                                                ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m197[0m:[93m48[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m197[0m       expect(screen.getByText(/Deploying.../)).toBeInTheDocument();
    [7m   [0m [91m                                               ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m213[0m:[93m58[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m213[0m     expect(screen.getByText(hasText('Accuracy: 94.2%'))).toBeInTheDocument();
    [7m   [0m [91m                                                         ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m214[0m:[93m59[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m214[0m     expect(screen.getByText(hasText('Precision: 92.8%'))).toBeInTheDocument();
    [7m   [0m [91m                                                          ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m215[0m:[93m56[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m215[0m     expect(screen.getByText(hasText('Recall: 95.6%'))).toBeInTheDocument();
    [7m   [0m [91m                                                       ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m216[0m:[93m58[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m216[0m     expect(screen.getByText(hasText('F1 Score: 94.2%'))).toBeInTheDocument();
    [7m   [0m [91m                                                         ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m227[0m:[93m47[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m227[0m     expect(screen.getByText(/Python: 3.9.7/)).toBeInTheDocument();
    [7m   [0m [91m                                              ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m228[0m:[93m55[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m228[0m     expect(screen.getByText(/Hardware: NVIDIA V100/)).toBeInTheDocument();
    [7m   [0m [91m                                                      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m229[0m:[93m51[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m229[0m     expect(screen.getByText(/tensorflow: 2.8.0/)).toBeInTheDocument();
    [7m   [0m [91m                                                  ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m240[0m:[93m37[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m240[0m     expect(screen.getByText(/67%/)).toBeInTheDocument();
    [7m   [0m [91m                                    ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m241[0m:[93m41[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m241[0m     expect(screen.getByText(/RUNNING/)).toBeInTheDocument();
    [7m   [0m [91m                                        ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m242[0m:[93m43[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m242[0m     expect(screen.getByText(/COMPLETED/)).toBeInTheDocument();
    [7m   [0m [91m                                          ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m253[0m:[93m42[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m253[0m     expect(screen.getByText(/GPU: 87%/)).toBeInTheDocument();
    [7m   [0m [91m                                         ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m254[0m:[93m42[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m254[0m     expect(screen.getByText(/CPU: 34%/)).toBeInTheDocument();
    [7m   [0m [91m                                         ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m255[0m:[93m45[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m255[0m     expect(screen.getByText(/Memory: 78%/)).toBeInTheDocument();
    [7m   [0m [91m                                            ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m270[0m:[93m46[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m270[0m     expect(screen.getByText(/Epoch 33\/50/)).toBeInTheDocument();
    [7m   [0m [91m                                             ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m305[0m:[93m55[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m305[0m     expect(screen.getByText(/Best Model: model-001/)).toBeInTheDocument();
    [7m   [0m [91m                                                      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m306[0m:[93m54[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m306[0m     expect(screen.getByText(/Improvement: \+12.3%/)).toBeInTheDocument();
    [7m   [0m [91m                                                     ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m307[0m:[93m47[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m307[0m     expect(screen.getByText(/Key Insights:/)).toBeInTheDocument();
    [7m   [0m [91m                                              ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m320[0m:[93m7[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m320[0m     ).toBeInTheDocument();
    [7m   [0m [91m      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m323[0m:[93m7[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m323[0m     ).toBeInTheDocument();
    [7m   [0m [91m      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m331[0m:[93m43[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m331[0m     expect(screen.getByText(/ML Models/)).toBeInTheDocument();
    [7m   [0m [91m                                          ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m345[0m:[93m23[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveClass' does not exist on type 'JestMatchers<Element>'.

    [7m345[0m     expect(container).toHaveClass('custom-mlops-class');
    [7m   [0m [91m                      ~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m352[0m:[93m44[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m352[0m     expect(screen.getByText(/PRODUCTION/)).toBeInTheDocument();
    [7m   [0m [91m                                           ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m353[0m:[93m41[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m353[0m     expect(screen.getByText(/STAGING/)).toBeInTheDocument();
    [7m   [0m [91m                                        ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m354[0m:[93m45[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m354[0m     expect(screen.getByText(/DEVELOPMENT/)).toBeInTheDocument();
    [7m   [0m [91m                                            ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m361[0m:[93m51[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m361[0m     expect(screen.getByText('entity-resolution')).toBeInTheDocument();
    [7m   [0m [91m                                                  ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m362[0m:[93m48[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m362[0m     expect(screen.getByText('neural-network')).toBeInTheDocument();
    [7m   [0m [91m                                               ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m363[0m:[93m44[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m363[0m     expect(screen.getByText('production')).toBeInTheDocument();
    [7m   [0m [91m                                           ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m376[0m:[93m49[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m376[0m     expect(screen.getByText(/ML Models \(0\)/)).toBeInTheDocument();
    [7m   [0m [91m                                                ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m384[0m:[93m51[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m384[0m     expect(screen.getByText(/🎯 Models \(\d+\)/)).toBeInTheDocument();
    [7m   [0m [91m                                                  ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m393[0m:[93m51[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m393[0m     expect(screen.getByText(/🎯 Models \(\d+\)/)).toBeInTheDocument();
    [7m   [0m [91m                                                  ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m404[0m:[93m43[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m404[0m     expect(screen.getByText(/Endpoints/)).toBeInTheDocument();
    [7m   [0m [91m                                          ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m407[0m:[93m7[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m407[0m     ).toBeInTheDocument();
    [7m   [0m [91m      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx[0m:[93m426[0m:[93m7[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m426[0m     ).toBeInTheDocument();
    [7m   [0m [91m      ~~~~~~~~~~~~~~~~~[0m

FAIL client client/src/components/ai-enhanced/__tests__/EnhancedAIAssistant.test.tsx
  ● Test suite failed to run

    [96mclient/src/components/ai-enhanced/__tests__/EnhancedAIAssistant.test.tsx[0m:[93m63[0m:[93m53[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m63[0m     expect(screen.getByText(/Hello! I'm IntelBot/)).toBeInTheDocument();
    [7m  [0m [91m                                                    ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/ai-enhanced/__tests__/EnhancedAIAssistant.test.tsx[0m:[93m66[0m:[93m7[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveTextContent' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m66[0m     ).toHaveTextContent(/Online/);
    [7m  [0m [91m      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/ai-enhanced/__tests__/EnhancedAIAssistant.test.tsx[0m:[93m72[0m:[93m42[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m72[0m     expect(screen.getByText('IntelBot')).toBeInTheDocument();
    [7m  [0m [91m                                         ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/ai-enhanced/__tests__/EnhancedAIAssistant.test.tsx[0m:[93m75[0m:[93m7[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveTextContent' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m75[0m     ).toHaveTextContent(/Intelligence Analysis Assistant • Online/);
    [7m  [0m [91m      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/ai-enhanced/__tests__/EnhancedAIAssistant.test.tsx[0m:[93m147[0m:[93m47[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveTextContent' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m147[0m     expect(await screen.findByRole('status')).toHaveTextContent(/Online/);
    [7m   [0m [91m                                              ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/ai-enhanced/__tests__/EnhancedAIAssistant.test.tsx[0m:[93m188[0m:[93m24[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeDisabled' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m188[0m     expect(sendButton).toBeDisabled();
    [7m   [0m [91m                       ~~~~~~~~~~~~[0m
    [96mclient/src/components/ai-enhanced/__tests__/EnhancedAIAssistant.test.tsx[0m:[93m248[0m:[93m23[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveAttribute' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m248[0m     expect(micButton).toHaveAttribute('aria-label', 'Start Voice');
    [7m   [0m [91m                      ~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/ai-enhanced/__tests__/EnhancedAIAssistant.test.tsx[0m:[93m255[0m:[93m57[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m255[0m     expect(await screen.findByLabelText(/stop voice/i)).toBeInTheDocument();
    [7m   [0m [91m                                                        ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/ai-enhanced/__tests__/EnhancedAIAssistant.test.tsx[0m:[93m264[0m:[93m23[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeDisabled' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m264[0m     expect(micButton).toBeDisabled();
    [7m   [0m [91m                      ~~~~~~~~~~~~[0m
    [96mclient/src/components/ai-enhanced/__tests__/EnhancedAIAssistant.test.tsx[0m:[93m277[0m:[93m26[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeDisabled' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m277[0m       expect(sendButton).toBeDisabled();
    [7m   [0m [91m                         ~~~~~~~~~~~~[0m
    [96mclient/src/components/ai-enhanced/__tests__/EnhancedAIAssistant.test.tsx[0m:[93m284[0m:[93m53[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m284[0m     expect(screen.getByText(/Hello! I'm IntelBot/)).toBeInTheDocument();
    [7m   [0m [91m                                                    ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/ai-enhanced/__tests__/EnhancedAIAssistant.test.tsx[0m:[93m285[0m:[93m43[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'Matchers<void, HTMLElement>'.

    [7m285[0m     expect(screen.queryByText('   ')).not.toBeInTheDocument();
    [7m   [0m [91m                                          ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/ai-enhanced/__tests__/EnhancedAIAssistant.test.tsx[0m:[93m310[0m:[93m19[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveValue' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m310[0m     expect(input).toHaveValue(expect.stringContaining('This is line one'));
    [7m   [0m [91m                  ~~~~~~~~~~~[0m
    [96mclient/src/components/ai-enhanced/__tests__/EnhancedAIAssistant.test.tsx[0m:[93m311[0m:[93m19[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveValue' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m311[0m     expect(input).toHaveValue(expect.stringContaining('This is line two'));
    [7m   [0m [91m                  ~~~~~~~~~~~[0m
    [96mclient/src/components/ai-enhanced/__tests__/EnhancedAIAssistant.test.tsx[0m:[93m344[0m:[93m19[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m344[0m     expect(input).toBeInTheDocument();
    [7m   [0m [91m                  ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/ai-enhanced/__tests__/EnhancedAIAssistant.test.tsx[0m:[93m347[0m:[93m51[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m347[0m     expect(screen.getByLabelText(/start voice/i)).toBeInTheDocument();
    [7m   [0m [91m                                                  ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/ai-enhanced/__tests__/EnhancedAIAssistant.test.tsx[0m:[93m348[0m:[93m47[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m348[0m     expect(screen.getByLabelText('Settings')).toBeInTheDocument();
    [7m   [0m [91m                                              ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/ai-enhanced/__tests__/EnhancedAIAssistant.test.tsx[0m:[93m349[0m:[93m44[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m349[0m     expect(screen.getByLabelText(/send/i)).toBeInTheDocument();
    [7m   [0m [91m                                           ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/ai-enhanced/__tests__/EnhancedAIAssistant.test.tsx[0m:[93m352[0m:[93m47[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveAttribute' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m352[0m     expect(screen.getByTestId('message-log')).toHaveAttribute('role', 'log');
    [7m   [0m [91m                                              ~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/ai-enhanced/__tests__/EnhancedAIAssistant.test.tsx[0m:[93m355[0m:[93m7[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m355[0m     ).toBeInTheDocument();
    [7m   [0m [91m      ~~~~~~~~~~~~~~~~~[0m

FAIL server server/src/tests/warRoomSync.test.js (5.088 s)
  ● War Room Graph Sync - P0 Critical MVP1 › P0 Requirement: <300ms Latency › should initialize war room in under 50ms

    thrown: "Exceeded timeout of 5000 ms for a hook while waiting for `done()` to be called.
    Add a timeout value to this test to increase the timeout, if this is a long-running test. See https://jestjs.io/docs/api#testname-fn-timeout."

      14 |   let httpServer;
      15 |
    > 16 |   beforeAll((done) => {
         |   ^
      17 |     httpServer = createServer();
      18 |     io = new Server(httpServer);
      19 |

      at server/src/tests/warRoomSync.test.js:16:3
      at Object.<anonymous> (server/src/tests/warRoomSync.test.js:11:1)

  ● War Room Graph Sync - P0 Critical MVP1 › P0 Requirement: <300ms Latency › should handle graph operations with <300ms latency

    thrown: "Exceeded timeout of 5000 ms for a hook while waiting for `done()` to be called.
    Add a timeout value to this test to increase the timeout, if this is a long-running test. See https://jestjs.io/docs/api#testname-fn-timeout."

      14 |   let httpServer;
      15 |
    > 16 |   beforeAll((done) => {
         |   ^
      17 |     httpServer = createServer();
      18 |     io = new Server(httpServer);
      19 |

      at server/src/tests/warRoomSync.test.js:16:3
      at Object.<anonymous> (server/src/tests/warRoomSync.test.js:11:1)

  ● War Room Graph Sync - P0 Critical MVP1 › P0 Requirement: <300ms Latency › should handle concurrent operations without conflicts

    thrown: "Exceeded timeout of 5000 ms for a hook while waiting for `done()` to be called.
    Add a timeout value to this test to increase the timeout, if this is a long-running test. See https://jestjs.io/docs/api#testname-fn-timeout."

      14 |   let httpServer;
      15 |
    > 16 |   beforeAll((done) => {
         |   ^
      17 |     httpServer = createServer();
      18 |     io = new Server(httpServer);
      19 |

      at server/src/tests/warRoomSync.test.js:16:3
      at Object.<anonymous> (server/src/tests/warRoomSync.test.js:11:1)

  ● War Room Graph Sync - P0 Critical MVP1 › P0 Requirement: <300ms Latency › should resolve conflicts quickly

    thrown: "Exceeded timeout of 5000 ms for a hook while waiting for `done()` to be called.
    Add a timeout value to this test to increase the timeout, if this is a long-running test. See https://jestjs.io/docs/api#testname-fn-timeout."

      14 |   let httpServer;
      15 |
    > 16 |   beforeAll((done) => {
         |   ^
      17 |     httpServer = createServer();
      18 |     io = new Server(httpServer);
      19 |

      at server/src/tests/warRoomSync.test.js:16:3
      at Object.<anonymous> (server/src/tests/warRoomSync.test.js:11:1)

  ● War Room Graph Sync - P0 Critical MVP1 › Operational Transform › should transform concurrent operations correctly

    thrown: "Exceeded timeout of 5000 ms for a hook while waiting for `done()` to be called.
    Add a timeout value to this test to increase the timeout, if this is a long-running test. See https://jestjs.io/docs/api#testname-fn-timeout."

      14 |   let httpServer;
      15 |
    > 16 |   beforeAll((done) => {
         |   ^
      17 |     httpServer = createServer();
      18 |     io = new Server(httpServer);
      19 |

      at server/src/tests/warRoomSync.test.js:16:3
      at Object.<anonymous> (server/src/tests/warRoomSync.test.js:11:1)

  ● War Room Graph Sync - P0 Critical MVP1 › Performance Metrics › should track performance metrics accurately

    thrown: "Exceeded timeout of 5000 ms for a hook while waiting for `done()` to be called.
    Add a timeout value to this test to increase the timeout, if this is a long-running test. See https://jestjs.io/docs/api#testname-fn-timeout."

      14 |   let httpServer;
      15 |
    > 16 |   beforeAll((done) => {
         |   ^
      17 |     httpServer = createServer();
      18 |     io = new Server(httpServer);
      19 |

      at server/src/tests/warRoomSync.test.js:16:3
      at Object.<anonymous> (server/src/tests/warRoomSync.test.js:11:1)

  ● War Room Graph Sync - P0 Critical MVP1 › Performance Metrics › should provide room statistics

    thrown: "Exceeded timeout of 5000 ms for a hook while waiting for `done()` to be called.
    Add a timeout value to this test to increase the timeout, if this is a long-running test. See https://jestjs.io/docs/api#testname-fn-timeout."

      14 |   let httpServer;
      15 |
    > 16 |   beforeAll((done) => {
         |   ^
      17 |     httpServer = createServer();
      18 |     io = new Server(httpServer);
      19 |

      at server/src/tests/warRoomSync.test.js:16:3
      at Object.<anonymous> (server/src/tests/warRoomSync.test.js:11:1)

  ● War Room Graph Sync - P0 Critical MVP1 › Error Handling › should handle invalid operations gracefully

    thrown: "Exceeded timeout of 5000 ms for a hook while waiting for `done()` to be called.
    Add a timeout value to this test to increase the timeout, if this is a long-running test. See https://jestjs.io/docs/api#testname-fn-timeout."

      14 |   let httpServer;
      15 |
    > 16 |   beforeAll((done) => {
         |   ^
      17 |     httpServer = createServer();
      18 |     io = new Server(httpServer);
      19 |

      at server/src/tests/warRoomSync.test.js:16:3
      at Object.<anonymous> (server/src/tests/warRoomSync.test.js:11:1)

  ● War Room Graph Sync - P0 Critical MVP1 › Error Handling › should handle user permission violations

    thrown: "Exceeded timeout of 5000 ms for a hook while waiting for `done()` to be called.
    Add a timeout value to this test to increase the timeout, if this is a long-running test. See https://jestjs.io/docs/api#testname-fn-timeout."

      14 |   let httpServer;
      15 |
    > 16 |   beforeAll((done) => {
         |   ^
      17 |     httpServer = createServer();
      18 |     io = new Server(httpServer);
      19 |

      at server/src/tests/warRoomSync.test.js:16:3
      at Object.<anonymous> (server/src/tests/warRoomSync.test.js:11:1)

PASS server server/src/tests/multimodalData.test.js
FAIL server server/tests/graphql.test.ts
  ● Test suite failed to run

    [96mserver/src/app.ts[0m:[93m30[0m:[93m36[0m - [91merror[0m[90m TS1343: [0mThe 'import.meta' meta-property is only allowed when the '--module' option is 'es2020', 'es2022', 'esnext', 'system', 'node16', 'node18', 'node20', or 'nodenext'.

    [7m30[0m   const __filename = fileURLToPath(import.meta.url);
    [7m  [0m [91m                                   ~~~~~~~~~~~[0m

FAIL server server/tests/ai-integration.test.js
  ● AI Integration Tests › Performance Tests › should handle large webhook payloads

    expected 200 "OK", got 413 "Payload Too Large"

      437 |         .post('/ai/webhook')
      438 |         .send(largePayload)
    > 439 |         .expect(200);
          |          ^
      440 |
      441 |       expect(response.body.ok).toBe(true);
      442 |       expect(response.body.kind).toBe('nlp_entities');

      at Object.<anonymous> (server/tests/ai-integration.test.js:439:10)
      ----
      at Test._assertStatus (node_modules/.pnpm/supertest@6.3.3/node_modules/supertest/lib/test.js:252:14)
      at node_modules/.pnpm/supertest@6.3.3/node_modules/supertest/lib/test.js:308:13
      at Test._assertFunction (node_modules/.pnpm/supertest@6.3.3/node_modules/supertest/lib/test.js:285:13)
      at Test.assert (node_modules/.pnpm/supertest@6.3.3/node_modules/supertest/lib/test.js:164:23)
      at Server.localAssert (node_modules/.pnpm/supertest@6.3.3/node_modules/supertest/lib/test.js:120:14)

FAIL server server/src/conductor/__tests__/conductor.integration.test.ts
  ● Test suite failed to run

    [96mserver/src/conductor/index.ts[0m:[93m136[0m:[93m17[0m - [91merror[0m[90m TS2339: [0mProperty 'runId' does not exist on type 'ConductInput'.

    [7m136[0m       if (input.runId) {
    [7m   [0m [91m                ~~~~~[0m
    [96mserver/src/conductor/index.ts[0m:[93m137[0m:[93m52[0m - [91merror[0m[90m TS2339: [0mProperty 'runId' does not exist on type 'ConductInput'.

    [7m137[0m         const runRecord = await runsRepo.get(input.runId, tenantId);
    [7m   [0m [91m                                                   ~~~~~[0m
    [96mserver/src/conductor/index.ts[0m:[93m205[0m:[93m19[0m - [91merror[0m[90m TS2339: [0mProperty 'runId' does not exist on type 'ConductInput'.

    [7m205[0m         if (input.runId) {
    [7m   [0m [91m                  ~~~~~[0m
    [96mserver/src/conductor/index.ts[0m:[93m207[0m:[93m19[0m - [91merror[0m[90m TS2339: [0mProperty 'runId' does not exist on type 'ConductInput'.

    [7m207[0m             input.runId,
    [7m   [0m [91m                  ~~~~~[0m
    [96mserver/src/conductor/index.ts[0m:[93m216[0m:[93m26[0m - [91merror[0m[90m TS2339: [0mProperty 'runId' does not exist on type 'ConductInput'.

    [7m216[0m             runId: input.runId,
    [7m   [0m [91m                         ~~~~~[0m

FAIL client client/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx
  ● Test suite failed to run

    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m84[0m:[93m57[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m84[0m     expect(screen.getByText('Advanced Graph Analysis')).toBeInTheDocument();
    [7m  [0m [91m                                                        ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m85[0m:[93m50[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m85[0m     expect(screen.getByText('3 nodes, 2 edges')).toBeInTheDocument();
    [7m  [0m [91m                                                 ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m96[0m:[93m7[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m96[0m     ).toBeInTheDocument();
    [7m  [0m [91m      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m99[0m:[93m7[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m99[0m     ).toBeInTheDocument();
    [7m  [0m [91m      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m102[0m:[93m7[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m102[0m     ).toBeInTheDocument();
    [7m   [0m [91m      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m105[0m:[93m7[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m105[0m     ).toBeInTheDocument();
    [7m   [0m [91m      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m106[0m:[93m61[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m106[0m     expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
    [7m   [0m [91m                                                            ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m114[0m:[93m41[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m114[0m     expect(screen.getByText('Metrics')).toBeInTheDocument();
    [7m   [0m [91m                                        ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m115[0m:[93m41[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m115[0m     expect(screen.getByText('Filters')).toBeInTheDocument();
    [7m   [0m [91m                                        ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m116[0m:[93m45[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m116[0m     expect(screen.getByText('Communities')).toBeInTheDocument();
    [7m   [0m [91m                                            ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m117[0m:[93m45[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m117[0m     expect(screen.getByText('Pathfinding')).toBeInTheDocument();
    [7m   [0m [91m                                            ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m125[0m:[93m50[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m125[0m     expect(screen.getByText('Network Analysis')).toBeInTheDocument();
    [7m   [0m [91m                                                 ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m126[0m:[93m49[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m126[0m     expect(screen.getByText('Network Density')).toBeInTheDocument();
    [7m   [0m [91m                                                ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m127[0m:[93m56[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m127[0m     expect(screen.getByText('Clustering Coefficient')).toBeInTheDocument();
    [7m   [0m [91m                                                       ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m128[0m:[93m53[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m128[0m     expect(screen.getByText('Average Path Length')).toBeInTheDocument();
    [7m   [0m [91m                                                    ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m129[0m:[93m56[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m129[0m     expect(screen.getByText('Betweenness Centrality')).toBeInTheDocument();
    [7m   [0m [91m                                                       ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m130[0m:[93m48[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m130[0m     expect(screen.getByText('PageRank Score')).toBeInTheDocument();
    [7m   [0m [91m                                               ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m140[0m:[93m48[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m140[0m     expect(screen.getByText('Filters & View')).toBeInTheDocument();
    [7m   [0m [91m                                               ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m141[0m:[93m56[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m141[0m     expect(screen.getAllByText('Layout Algorithm')[0]).toBeInTheDocument();
    [7m   [0m [91m                                                       ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m142[0m:[93m55[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m142[0m     expect(screen.getByText(/Centrality Threshold:/)).toBeInTheDocument();
    [7m   [0m [91m                                                      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m143[0m:[93m44[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m143[0m     expect(screen.getByText('Node Types')).toBeInTheDocument();
    [7m   [0m [91m                                           ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m153[0m:[93m52[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m153[0m     expect(screen.getByText('Community Analysis')).toBeInTheDocument();
    [7m   [0m [91m                                                   ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m158[0m:[93m7[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m158[0m     ).toBeInTheDocument();
    [7m   [0m [91m      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m168[0m:[93m47[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m168[0m     expect(screen.getByText('Path Analysis')).toBeInTheDocument();
    [7m   [0m [91m                                              ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m173[0m:[93m7[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m173[0m     ).toBeInTheDocument();
    [7m   [0m [91m      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m182[0m:[93m29[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m182[0m     expect(communityButton).toBeInTheDocument();
    [7m   [0m [91m                            ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m187[0m:[93m46[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m187[0m     expect(screen.getByText('Analyzing...')).toBeInTheDocument();
    [7m   [0m [91m                                             ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m195[0m:[93m59[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m195[0m       expect(screen.getByText('Run Community Detection')).toBeInTheDocument(); // Button text restored
    [7m   [0m [91m                                                          ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m236[0m:[93m20[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m236[0m     expect(slider).toBeInTheDocument();
    [7m   [0m [91m                   ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m239[0m:[93m55[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m239[0m     expect(screen.getByText(/Centrality Threshold:/)).toBeInTheDocument();
    [7m   [0m [91m                                                      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m253[0m:[93m39[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeChecked' does not exist on type 'Matchers<void, HTMLElement>'.

    [7m253[0m     expect(showCommunitiesSwitch).not.toBeChecked();
    [7m   [0m [91m                                      ~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m256[0m:[93m35[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeChecked' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m256[0m     expect(showCommunitiesSwitch).toBeChecked();
    [7m   [0m [91m                                  ~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m269[0m:[93m24[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m269[0m     expect(personChip).toBeInTheDocument();
    [7m   [0m [91m                       ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m274[0m:[93m40[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m274[0m     expect(screen.getByText('person')).toBeInTheDocument();
    [7m   [0m [91m                                       ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m325[0m:[93m38[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m325[0m     expect(screen.getByText('0.23')).toBeInTheDocument(); // Network Density
    [7m   [0m [91m                                     ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m326[0m:[93m38[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m326[0m     expect(screen.getByText('0.67')).toBeInTheDocument(); // Clustering Coefficient
    [7m   [0m [91m                                     ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m327[0m:[93m38[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m327[0m     expect(screen.getByText('3.20')).toBeInTheDocument(); // Average Path Length
    [7m   [0m [91m                                     ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m344[0m:[93m57[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m344[0m     expect(screen.getByText('Advanced Graph Analysis')).toBeInTheDocument();
    [7m   [0m [91m                                                        ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m345[0m:[93m50[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m345[0m     expect(screen.getByText('0 nodes, 0 edges')).toBeInTheDocument();
    [7m   [0m [91m                                                 ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m355[0m:[93m21[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m355[0m     expect(tabList).toBeInTheDocument();
    [7m   [0m [91m                    ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m360[0m:[93m7[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m360[0m     ).toBeInTheDocument();
    [7m   [0m [91m      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m363[0m:[93m7[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m363[0m     ).toBeInTheDocument();
    [7m   [0m [91m      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m376[0m:[93m57[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m376[0m     expect(screen.getByText('Run Community Detection')).toBeInTheDocument();
    [7m   [0m [91m                                                        ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m377[0m:[93m41[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m377[0m     expect(screen.getByText('Metrics')).toBeInTheDocument();
    [7m   [0m [91m                                        ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/graph-advanced/__tests__/AdvancedGraphInteractions.test.tsx[0m:[93m378[0m:[93m45[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m378[0m     expect(screen.getByText('Communities')).toBeInTheDocument();
    [7m   [0m [91m                                            ~~~~~~~~~~~~~~~~~[0m

FAIL client client/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx
  ● Test suite failed to run

    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m33[0m:[93m61[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m33[0m     expect(screen.getByText(/🛡️ Threat Intelligence Hub/)).toBeInTheDocument();
    [7m  [0m [91m                                                            ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m39[0m:[93m47[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m39[0m     expect(screen.getByText(/🎯 Indicators/)).toBeInTheDocument();
    [7m  [0m [91m                                              ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m40[0m:[93m46[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m40[0m     expect(screen.getByText(/📋 Campaigns/)).toBeInTheDocument();
    [7m  [0m [91m                                             ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m41[0m:[93m44[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m41[0m     expect(screen.getByText(/🕵️ Actors/)).toBeInTheDocument();
    [7m  [0m [91m                                           ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m42[0m:[93m42[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m42[0m     expect(screen.getByText(/📡 Feeds/)).toBeInTheDocument();
    [7m  [0m [91m                                         ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m50[0m:[93m7[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m50[0m     ).toBeInTheDocument();
    [7m  [0m [91m      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m51[0m:[93m56[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m51[0m     expect(screen.getByDisplayValue('All Severities')).toBeInTheDocument();
    [7m  [0m [91m                                                       ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m52[0m:[93m51[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m52[0m     expect(screen.getByDisplayValue('All Types')).toBeInTheDocument();
    [7m  [0m [91m                                                  ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m58[0m:[93m51[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m58[0m     expect(screen.getByText(/Threat Indicators/)).toBeInTheDocument();
    [7m  [0m [91m                                                  ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m60[0m:[93m47[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m60[0m     expect(screen.getByText('192.168.1.100')).toBeInTheDocument();
    [7m  [0m [91m                                              ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m61[0m:[93m54[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m61[0m     expect(screen.getByText('malicious-domain.com')).toBeInTheDocument();
    [7m  [0m [91m                                                     ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m70[0m:[93m50[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m70[0m     expect(screen.getByText(/Threat Campaigns/)).toBeInTheDocument();
    [7m  [0m [91m                                                 ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m71[0m:[93m56[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m71[0m     expect(screen.getByText('Operation Winter Storm')).toBeInTheDocument();
    [7m  [0m [91m                                                       ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m75[0m:[93m47[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m75[0m     expect(screen.getByText(/Threat Actors/)).toBeInTheDocument();
    [7m  [0m [91m                                              ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m76[0m:[93m39[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m76[0m     expect(screen.getByText('APT29')).toBeInTheDocument();
    [7m  [0m [91m                                      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m80[0m:[93m52[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m80[0m     expect(screen.getByText(/Intelligence Feeds/)).toBeInTheDocument();
    [7m  [0m [91m                                                   ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m81[0m:[93m44[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m81[0m     expect(screen.getByText('VirusTotal')).toBeInTheDocument();
    [7m  [0m [91m                                           ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m94[0m:[93m47[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m94[0m     expect(screen.getByText('192.168.1.100')).toBeInTheDocument();
    [7m  [0m [91m                                              ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m95[0m:[93m60[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'Matchers<void, HTMLElement>'.

    [7m95[0m     expect(screen.queryByText('malicious-domain.com')).not.toBeInTheDocument();
    [7m  [0m [91m                                                           ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m105[0m:[93m28[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveValue' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m105[0m     expect(severitySelect).toHaveValue('critical');
    [7m   [0m [91m                           ~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m107[0m:[93m54[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m107[0m     expect(screen.getByText('malicious-domain.com')).toBeInTheDocument();
    [7m   [0m [91m                                                     ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m117[0m:[93m24[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveValue' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m117[0m     expect(typeSelect).toHaveValue('ip');
    [7m   [0m [91m                       ~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m119[0m:[93m47[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m119[0m     expect(screen.getByText('192.168.1.100')).toBeInTheDocument();
    [7m   [0m [91m                                              ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m136[0m:[93m51[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m136[0m     expect(screen.getByText('Indicator Details')).toBeInTheDocument();
    [7m   [0m [91m                                                  ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m137[0m:[93m41[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m137[0m     expect(screen.getByText(/Context/)).toBeInTheDocument();
    [7m   [0m [91m                                        ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m138[0m:[93m38[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m138[0m     expect(screen.getByText(/Tags/)).toBeInTheDocument();
    [7m   [0m [91m                                     ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m212[0m:[93m51[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m212[0m     expect(screen.getByText(/Threat Indicators/)).toBeInTheDocument();
    [7m   [0m [91m                                                  ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m227[0m:[93m47[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m227[0m     expect(screen.getByText('192.168.1.100')).toBeInTheDocument();
    [7m   [0m [91m                                              ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m228[0m:[93m54[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m228[0m     expect(screen.getByText('malicious-domain.com')).toBeInTheDocument();
    [7m   [0m [91m                                                     ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m234[0m:[93m47[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m234[0m     expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
    [7m   [0m [91m                                              ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m240[0m:[93m49[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m240[0m     expect(screen.getByText(/🔄 Auto-refresh/)).toBeInTheDocument();
    [7m   [0m [91m                                                ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m243[0m:[93m5[0m - [91merror[0m[90m TS2304: [0mCannot find name 'act'.

    [7m243[0m     act(() => {
    [7m   [0m [91m    ~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m248[0m:[93m47[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m248[0m     expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
    [7m   [0m [91m                                              ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m258[0m:[93m44[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m258[0m     expect(screen.getByText('VirusTotal')).toBeInTheDocument();
    [7m   [0m [91m                                           ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m259[0m:[93m49[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m259[0m     expect(screen.getByText('Recorded Future')).toBeInTheDocument();
    [7m   [0m [91m                                                ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m260[0m:[93m38[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m260[0m     expect(screen.getByText('MISP')).toBeInTheDocument();
    [7m   [0m [91m                                     ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m261[0m:[93m40[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m261[0m     expect(screen.getByText(/ACTIVE/)).toBeInTheDocument();
    [7m   [0m [91m                                       ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m275[0m:[93m23[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveClass' does not exist on type 'JestMatchers<Element>'.

    [7m275[0m     expect(container).toHaveClass('custom-threat-class');
    [7m   [0m [91m                      ~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m288[0m:[93m57[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m288[0m     expect(screen.getByText(/Threat Indicators \(0\)/)).toBeInTheDocument();
    [7m   [0m [91m                                                        ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m299[0m:[93m49[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m299[0m     expect(screen.getByText(/Malware Family:/)).toBeInTheDocument();
    [7m   [0m [91m                                                ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m300[0m:[93m43[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m300[0m     expect(screen.getByText(/Campaign:/)).toBeInTheDocument();
    [7m   [0m [91m                                          ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m301[0m:[93m40[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m301[0m     expect(screen.getByText(/Actor:/)).toBeInTheDocument();
    [7m   [0m [91m                                       ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m308[0m:[93m37[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m308[0m     expect(screen.getByText('95%')).toBeInTheDocument();
    [7m   [0m [91m                                    ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m309[0m:[93m37[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m309[0m     expect(screen.getByText('88%')).toBeInTheDocument();
    [7m   [0m [91m                                    ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m335[0m:[93m25[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m335[0m     expect(searchInput).toBeInTheDocument();
    [7m   [0m [91m                        ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m343[0m:[93m55[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m343[0m     expect(screen.getByText(/🎯 Indicators \(\d+\)/)).toBeInTheDocument();
    [7m   [0m [91m                                                      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx[0m:[93m352[0m:[93m55[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m352[0m     expect(screen.getByText(/🎯 Indicators \(\d+\)/)).toBeInTheDocument();
    [7m   [0m [91m                                                      ~~~~~~~~~~~~~~~~~[0m

FAIL client client/src/components/__tests__/ToastContainer.test.tsx
  ● Test suite failed to run

    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m54[0m:[93m46[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m54[0m     expect(screen.getByText('Test Content')).toBeInTheDocument();
    [7m  [0m [91m                                             ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m63[0m:[93m46[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m63[0m       expect(screen.getByText('Test Toast')).toBeInTheDocument();
    [7m  [0m [91m                                             ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m73[0m:[93m44[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m73[0m       expect(screen.getByText('Success!')).toBeInTheDocument();
    [7m  [0m [91m                                           ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m74[0m:[93m55[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m74[0m       expect(screen.getByText('Operation completed')).toBeInTheDocument();
    [7m  [0m [91m                                                      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m80[0m:[93m42[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m80[0m       expect(screen.getByText('Error!')).toBeInTheDocument();
    [7m  [0m [91m                                         ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m81[0m:[93m56[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m81[0m       expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    [7m  [0m [91m                                                       ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m87[0m:[93m44[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m87[0m       expect(screen.getByText('Warning!')).toBeInTheDocument();
    [7m  [0m [91m                                           ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m88[0m:[93m53[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m88[0m       expect(screen.getByText('Please be careful')).toBeInTheDocument();
    [7m  [0m [91m                                                    ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m94[0m:[93m40[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m94[0m       expect(screen.getByText('Info')).toBeInTheDocument();
    [7m  [0m [91m                                       ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m95[0m:[93m52[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m95[0m       expect(screen.getByText('Just so you know')).toBeInTheDocument();
    [7m  [0m [91m                                                   ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m104[0m:[93m37[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m104[0m       expect(screen.getByText('✅')).toBeInTheDocument();
    [7m   [0m [91m                                    ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m109[0m:[93m37[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m109[0m       expect(screen.getByText('❌')).toBeInTheDocument();
    [7m   [0m [91m                                    ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m119[0m:[93m46[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m119[0m       expect(screen.getByText('Test Toast')).toBeInTheDocument();
    [7m   [0m [91m                                             ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m128[0m:[93m52[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'Matchers<void, HTMLElement>'.

    [7m128[0m       expect(screen.queryByText('Test Toast')).not.toBeInTheDocument();
    [7m   [0m [91m                                                   ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m138[0m:[93m46[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m138[0m       expect(screen.getByText('Test Toast')).toBeInTheDocument();
    [7m   [0m [91m                                             ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m146[0m:[93m52[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'Matchers<void, HTMLElement>'.

    [7m146[0m       expect(screen.queryByText('Test Toast')).not.toBeInTheDocument();
    [7m   [0m [91m                                                   ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m159[0m:[93m44[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m159[0m       expect(screen.getByText('Success!')).toBeInTheDocument();
    [7m   [0m [91m                                           ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m160[0m:[93m42[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m160[0m       expect(screen.getByText('Error!')).toBeInTheDocument();
    [7m   [0m [91m                                         ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m161[0m:[93m40[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m161[0m       expect(screen.getByText('Info')).toBeInTheDocument();
    [7m   [0m [91m                                       ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m168[0m:[93m50[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'Matchers<void, HTMLElement>'.

    [7m168[0m       expect(screen.queryByText('Success!')).not.toBeInTheDocument();
    [7m   [0m [91m                                                 ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m169[0m:[93m48[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'Matchers<void, HTMLElement>'.

    [7m169[0m       expect(screen.queryByText('Error!')).not.toBeInTheDocument();
    [7m   [0m [91m                                               ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m170[0m:[93m46[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'Matchers<void, HTMLElement>'.

    [7m170[0m       expect(screen.queryByText('Info')).not.toBeInTheDocument();
    [7m   [0m [91m                                             ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m184[0m:[93m50[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'Matchers<void, HTMLElement>'.

    [7m184[0m       expect(screen.queryByText('Success!')).not.toBeInTheDocument();
    [7m   [0m [91m                                                 ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m185[0m:[93m42[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m185[0m       expect(screen.getByText('Error!')).toBeInTheDocument();
    [7m   [0m [91m                                         ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m186[0m:[93m40[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m186[0m       expect(screen.getByText('Info')).toBeInTheDocument();
    [7m   [0m [91m                                       ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m198[0m:[93m28[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveClass' does not exist on type 'JestMatchers<Element>'.

    [7m198[0m     expect(toastContainer).toHaveClass('top-4', 'left-4');
    [7m   [0m [91m                           ~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m210[0m:[93m26[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveClass' does not exist on type 'JestMatchers<Element>'.

    [7m210[0m     expect(newContainer).toHaveClass('bottom-4', 'right-4');
    [7m   [0m [91m                         ~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m241[0m:[93m48[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m241[0m       expect(screen.getByText('Action Toast')).toBeInTheDocument();
    [7m   [0m [91m                                               ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m242[0m:[93m47[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m242[0m       expect(screen.getByText('Take Action')).toBeInTheDocument();
    [7m   [0m [91m                                              ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m250[0m:[93m26[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m250[0m     expect(actionButton).toBeInTheDocument();
    [7m   [0m [91m                         ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m265[0m:[93m24[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveClass' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m265[0m       expect(animated).toHaveClass('transition-all');
    [7m   [0m [91m                       ~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m266[0m:[93m24[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveClass' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m266[0m       expect(animated).toHaveClass('duration-300');
    [7m   [0m [91m                       ~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m286[0m:[93m46[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m286[0m     expect(screen.getByText(/Error caught/)).toBeInTheDocument();
    [7m   [0m [91m                                             ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m289[0m:[93m7[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m289[0m     ).toBeInTheDocument();
    [7m   [0m [91m      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m359[0m:[93m28[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<Element>'.

    [7m359[0m     expect(toastContainer).toBeInTheDocument();
    [7m   [0m [91m                           ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m360[0m:[93m28[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveAttribute' does not exist on type 'JestMatchers<Element>'.

    [7m360[0m     expect(toastContainer).toHaveAttribute('aria-live', 'assertive');
    [7m   [0m [91m                           ~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m370[0m:[93m41[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveAttribute' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m370[0m       expect(closeButton.parentElement).toHaveAttribute(
    [7m   [0m [91m                                        ~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/ToastContainer.test.tsx[0m:[93m375[0m:[93m41[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m375[0m       expect(screen.getByText('Close')).toBeInTheDocument();
    [7m   [0m [91m                                        ~~~~~~~~~~~~~~~~~[0m

FAIL server server/tests/gnn-integration.test.js
  ● Test suite failed to run

    Jest encountered an unexpected token

    Jest failed to parse a file. This happens e.g. when your code or its dependencies use non-standard JavaScript syntax, or when Jest is not configured to support such syntax.

    Out of the box Jest supports Babel, which will be used to transform your files into valid JS based on your Babel configuration.

    By default "node_modules" folder is ignored by transformers.

    Here's what you can do:
     • If you are trying to use ECMAScript Modules, see https://jestjs.io/docs/ecmascript-modules for how to enable it.
     • If you are trying to use TypeScript, see https://jestjs.io/docs/getting-started#using-typescript
     • To have some of your "node_modules" files transformed, you can specify a custom "transformIgnorePatterns" in your config.
     • If you need a custom transformation specify a "transform" option in your config.
     • If you simply want to mock your non-JS modules (e.g. binary assets) you can stub them out with the "moduleNameMapper" config option.

    You'll find more details and examples of these config options in the docs:
    https://jestjs.io/docs/configuration
    For information about custom transformations, see:
    https://jestjs.io/docs/code-transformation

    Details:

    /Users/brianlong/Developer/summit/server/src/services/GNNService.js:7
    import logger from '../utils/logger.js';
    ^^^^^^

    SyntaxError: Cannot use import statement outside a module

      3 |  */
      4 | const request = require('supertest');
    > 5 | const GNNService = require('../src/services/GNNService');
        |                    ^
      6 |
      7 | describe('GNN Integration Tests', () => {
      8 |   describe('GNNService', () => {

      at Runtime.createScriptFromCode (node_modules/.pnpm/jest-runtime@29.7.0/node_modules/jest-runtime/build/index.js:1505:14)
      at Object.<anonymous> (server/tests/gnn-integration.test.js:5:20)

FAIL server server/src/maestro/__tests__/integration.test.ts
  ● Test suite failed to run

    [96mserver/src/maestro/__tests__/integration.test.ts[0m:[93m2[0m:[93m21[0m - [91merror[0m[90m TS2307: [0mCannot find module '../app.js' or its corresponding type declarations.

    [7m2[0m import { app } from '../app.js';
    [7m [0m [91m                    ~~~~~~~~~~~[0m
    [96mserver/src/maestro/__tests__/integration.test.ts[0m:[93m3[0m:[93m33[0m - [91merror[0m[90m TS2307: [0mCannot find module '../db/postgres.js' or its corresponding type declarations.

    [7m3[0m import { getPostgresPool } from '../db/postgres.js';
    [7m [0m [91m                                ~~~~~~~~~~~~~~~~~~~[0m
    [96mserver/src/maestro/__tests__/integration.test.ts[0m:[93m4[0m:[93m43[0m - [91merror[0m[90m TS2307: [0mCannot find module '../maestro/evidence/provenance-service.js' or its corresponding type declarations.

    [7m4[0m import { evidenceProvenanceService } from '../maestro/evidence/provenance-service.js';
    [7m [0m [91m                                          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m

FAIL server server/tests/monitoring.test.js
  ● Test suite failed to run

    Jest encountered an unexpected token

    Jest failed to parse a file. This happens e.g. when your code or its dependencies use non-standard JavaScript syntax, or when Jest is not configured to support such syntax.

    Out of the box Jest supports Babel, which will be used to transform your files into valid JS based on your Babel configuration.

    By default "node_modules" folder is ignored by transformers.

    Here's what you can do:
     • If you are trying to use ECMAScript Modules, see https://jestjs.io/docs/ecmascript-modules for how to enable it.
     • If you are trying to use TypeScript, see https://jestjs.io/docs/getting-started#using-typescript
     • To have some of your "node_modules" files transformed, you can specify a custom "transformIgnorePatterns" in your config.
     • If you need a custom transformation specify a "transform" option in your config.
     • If you simply want to mock your non-JS modules (e.g. binary assets) you can stub them out with the "moduleNameMapper" config option.

    You'll find more details and examples of these config options in the docs:
    https://jestjs.io/docs/configuration
    For information about custom transformations, see:
    https://jestjs.io/docs/code-transformation

    Details:

    /Users/brianlong/Developer/summit/server/src/monitoring/health.js:4
    import os from 'os';
    ^^^^^^

    SyntaxError: Cannot use import statement outside a module

      264 |     checkRedis,
      265 |     checkSystemResources,
    > 266 |   } = require('../src/monitoring/health');
          |       ^
      267 |
      268 |   describe('Database Health Check', () => {
      269 |     it('should check database connectivity', async () => {

      at Runtime.createScriptFromCode (node_modules/.pnpm/jest-runtime@29.7.0/node_modules/jest-runtime/build/index.js:1505:14)
      at server/tests/monitoring.test.js:266:7
      at Object.<anonymous> (server/tests/monitoring.test.js:261:1)

FAIL client client/src/components/__tests__/HomeRoute.test.tsx
  ● Test suite failed to run

    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m107[0m:[93m53[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m107[0m     expect(screen.getByText('IntelGraph Platform')).toBeInTheDocument();
    [7m   [0m [91m                                                    ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m110[0m:[93m7[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m110[0m     ).toBeInTheDocument();
    [7m   [0m [91m      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m115[0m:[93m45[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m115[0m     expect(screen.getByText('🏠 Overview')).toBeInTheDocument();
    [7m   [0m [91m                                            ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m116[0m:[93m51[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m116[0m     expect(screen.getByText('🔍 Investigations')).toBeInTheDocument();
    [7m   [0m [91m                                                  ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m117[0m:[93m52[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m117[0m     expect(screen.getByText('🔎 Advanced Search')).toBeInTheDocument();
    [7m   [0m [91m                                                   ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m118[0m:[93m48[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m118[0m     expect(screen.getByText('📤 Data Export')).toBeInTheDocument();
    [7m   [0m [91m                                               ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m123[0m:[93m41[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m123[0m     expect(screen.getByText('📚 Help')).toBeInTheDocument();
    [7m   [0m [91m                                        ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m124[0m:[93m46[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m124[0m     expect(screen.getByText('⌨️ Shortcuts')).toBeInTheDocument();
    [7m   [0m [91m                                             ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m129[0m:[93m46[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m129[0m     expect(screen.getByText('Graph Nodes:')).toBeInTheDocument();
    [7m   [0m [91m                                             ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m130[0m:[93m36[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m130[0m     expect(screen.getByText('42')).toBeInTheDocument();
    [7m   [0m [91m                                   ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m131[0m:[93m46[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m131[0m     expect(screen.getByText('Graph Edges:')).toBeInTheDocument();
    [7m   [0m [91m                                             ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m132[0m:[93m37[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m132[0m     expect(screen.getByText('128')).toBeInTheDocument();
    [7m   [0m [91m                                    ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m133[0m:[93m48[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m133[0m     expect(screen.getByText('Graph Density:')).toBeInTheDocument();
    [7m   [0m [91m                                               ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m134[0m:[93m38[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m134[0m     expect(screen.getByText('0.15')).toBeInTheDocument();
    [7m   [0m [91m                                     ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m141[0m:[93m49[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m141[0m     expect(screen.getByTestId('server-status')).toBeInTheDocument();
    [7m   [0m [91m                                                ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m146[0m:[93m53[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m146[0m       expect(screen.getByTestId('advanced-search')).toBeInTheDocument();
    [7m   [0m [91m                                                    ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m152[0m:[93m59[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m152[0m       expect(screen.getByTestId('investigation-manager')).toBeInTheDocument();
    [7m   [0m [91m                                                          ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m158[0m:[93m49[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m158[0m       expect(screen.getByTestId('data-export')).toBeInTheDocument();
    [7m   [0m [91m                                                ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m170[0m:[93m22[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeDisabled' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m170[0m     expect(goButton).toBeDisabled();
    [7m   [0m [91m                     ~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m174[0m:[93m26[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeDisabled' does not exist on type 'Matchers<void, HTMLElement>'.

    [7m174[0m     expect(goButton).not.toBeDisabled();
    [7m   [0m [91m                         ~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m188[0m:[93m52[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m188[0m     expect(screen.getByText('Test Action Safety')).toBeInTheDocument();
    [7m   [0m [91m                                                   ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m189[0m:[93m54[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m189[0m     expect(screen.getByText('Sample Investigation')).toBeInTheDocument();
    [7m   [0m [91m                                                     ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m192[0m:[93m25[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m192[0m     expect(quickAction).toBeInTheDocument();
    [7m   [0m [91m                        ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m197[0m:[93m55[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m197[0m     expect(screen.getByTestId('performance-monitor')).toBeInTheDocument();
    [7m   [0m [91m                                                      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m205[0m:[93m57[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m205[0m     expect(screen.getByTestId('investigation-manager')).toBeInTheDocument();
    [7m   [0m [91m                                                        ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m209[0m:[93m51[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m209[0m     expect(screen.getByTestId('advanced-search')).toBeInTheDocument();
    [7m   [0m [91m                                                  ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m223[0m:[93m26[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m223[0m     expect(searchButton).toBeInTheDocument();
    [7m   [0m [91m                         ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m236[0m:[93m23[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m236[0m     expect(invButton).toBeInTheDocument();
    [7m   [0m [91m                      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m249[0m:[93m26[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m249[0m     expect(exportButton).toBeInTheDocument();
    [7m   [0m [91m                         ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m255[0m:[93m51[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m255[0m     expect(screen.getByText('📊 Graph Analysis')).toBeInTheDocument();
    [7m   [0m [91m                                                  ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m256[0m:[93m56[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m256[0m     expect(screen.getByText('📈 Analytics Dashboard')).toBeInTheDocument();
    [7m   [0m [91m                                                       ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m257[0m:[93m51[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m257[0m     expect(screen.getByText('🛡️ Action Safety')).toBeInTheDocument();
    [7m   [0m [91m                                                  ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m258[0m:[93m48[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m258[0m     expect(screen.getByText('🔗 GraphQL API')).toBeInTheDocument();
    [7m   [0m [91m                                               ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m264[0m:[93m46[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m264[0m     expect(screen.getByText('Graph Nodes:')).toBeInTheDocument();
    [7m   [0m [91m                                             ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m265[0m:[93m35[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m265[0m     expect(screen.getByText('0')).toBeInTheDocument(); // Default value
    [7m   [0m [91m                                  ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m278[0m:[93m54[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m278[0m       expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    [7m   [0m [91m                                                     ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m289[0m:[93m56[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m289[0m       expect(screen.getByText('Help & Documentation')).toBeInTheDocument();
    [7m   [0m [91m                                                       ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m299[0m:[93m54[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m299[0m       expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    [7m   [0m [91m                                                     ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m305[0m:[93m60[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'Matchers<void, HTMLElement>'.

    [7m305[0m       expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument();
    [7m   [0m [91m                                                           ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m316[0m:[93m16[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveTextContent' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m316[0m     expect(h1).toHaveTextContent('IntelGraph Platform');
    [7m   [0m [91m               ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m323[0m:[93m24[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveAttribute' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m323[0m     expect(helpButton).toHaveAttribute('title');
    [7m   [0m [91m                       ~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m326[0m:[93m29[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveAttribute' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m326[0m     expect(shortcutsButton).toHaveAttribute('title');
    [7m   [0m [91m                            ~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/HomeRoute.test.tsx[0m:[93m333[0m:[93m43[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveStyle' does not exist on type 'JestMatchers<HTMLButtonElement>'.

    [7m333[0m     expect(overviewTab.closest('button')).toHaveStyle('color: #1a73e8'); // Active tab styling
    [7m   [0m [91m                                          ~~~~~~~~~~~[0m

FAIL client client/src/components/__tests__/PerformanceMonitor.test.tsx
  ● Test suite failed to run

    [96mclient/src/components/__tests__/PerformanceMonitor.test.tsx[0m:[93m67[0m:[93m39[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m67[0m     expect(screen.getByText(/\d+MB/)).toBeInTheDocument();
    [7m  [0m [91m                                      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/PerformanceMonitor.test.tsx[0m:[93m73[0m:[93m42[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'Matchers<void, HTMLElement>'.

    [7m73[0m     expect(screen.queryByText(/MB/)).not.toBeInTheDocument();
    [7m  [0m [91m                                         ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/PerformanceMonitor.test.tsx[0m:[93m83[0m:[93m53[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m83[0m     expect(screen.getByText('Performance Monitor')).toBeInTheDocument();
    [7m  [0m [91m                                                    ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/PerformanceMonitor.test.tsx[0m:[93m84[0m:[93m46[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m84[0m     expect(screen.getByText('Memory Usage')).toBeInTheDocument();
    [7m  [0m [91m                                             ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/PerformanceMonitor.test.tsx[0m:[93m85[0m:[93m45[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m85[0m     expect(screen.getByText('Render Time')).toBeInTheDocument();
    [7m  [0m [91m                                            ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/PerformanceMonitor.test.tsx[0m:[93m86[0m:[93m50[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m86[0m     expect(screen.getByText('Network Requests')).toBeInTheDocument();
    [7m  [0m [91m                                                 ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/PerformanceMonitor.test.tsx[0m:[93m144[0m:[93m17[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m144[0m     expect(svg).toBeInTheDocument();
    [7m   [0m [91m                ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/PerformanceMonitor.test.tsx[0m:[93m159[0m:[93m23[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveClass' does not exist on type 'JestMatchers<Element>'.

    [7m159[0m     expect(indicator).toHaveClass('bg-red-400');
    [7m   [0m [91m                      ~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/PerformanceMonitor.test.tsx[0m:[93m176[0m:[93m23[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveClass' does not exist on type 'JestMatchers<Element>'.

    [7m176[0m     expect(indicator).toHaveClass('bg-yellow-400');
    [7m   [0m [91m                      ~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/PerformanceMonitor.test.tsx[0m:[93m184[0m:[93m53[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m184[0m     expect(screen.getByText('Performance Monitor')).toBeInTheDocument();
    [7m   [0m [91m                                                    ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/PerformanceMonitor.test.tsx[0m:[93m190[0m:[93m59[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'Matchers<void, HTMLElement>'.

    [7m190[0m     expect(screen.queryByText('Performance Monitor')).not.toBeInTheDocument();
    [7m   [0m [91m                                                          ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/PerformanceMonitor.test.tsx[0m:[93m213[0m:[93m38[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m213[0m     expect(screen.getByText(/avg:/)).toBeInTheDocument();
    [7m   [0m [91m                                     ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/__tests__/PerformanceMonitor.test.tsx[0m:[93m224[0m:[93m37[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m224[0m     expect(screen.getByText('0MB')).toBeInTheDocument();
    [7m   [0m [91m                                    ~~~~~~~~~~~~~~~~~[0m

FAIL client client/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx
  ● Test suite failed to run

    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m53[0m:[93m3[0m - [91merror[0m[90m TS2322: [0mType 'Mock<{ clearRect: Mock<any, any, any>; beginPath: Mock<any, any, any>; moveTo: Mock<any, any, any>; lineTo: Mock<any, any, any>; stroke: Mock<any, any, any>; ... 9 more ...; setTransform: Mock<...>; }, [], any>' is not assignable to type '{ (contextId: "2d", options?: CanvasRenderingContext2DSettings): CanvasRenderingContext2D; (contextId: "bitmaprenderer", options?: ImageBitmapRenderingContextSettings): ImageBitmapRenderingContext; (contextId: "webgl", options?: WebGLContextAttributes): WebGLRenderingContext; (contextId: "webgl2", options?: WebGLCon...'.
      Type '{ clearRect: Mock<any, any, any>; beginPath: Mock<any, any, any>; moveTo: Mock<any, any, any>; lineTo: Mock<any, any, any>; stroke: Mock<any, any, any>; ... 9 more ...; setTransform: Mock<...>; }' is missing the following properties from type 'CanvasRenderingContext2D': canvas, globalAlpha, globalCompositeOperation, drawImage, and 53 more.

    [7m53[0m   HTMLCanvasElement.prototype.getContext = mockCanvas.getContext;
    [7m  [0m [91m  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m54[0m:[93m3[0m - [91merror[0m[90m TS2322: [0mType 'Mock<{ left: number; top: number; width: number; height: number; }, [], any>' is not assignable to type '() => DOMRect'.
      Type '{ left: number; top: number; width: number; height: number; }' is missing the following properties from type 'DOMRect': x, y, bottom, right, toJSON

    [7m54[0m   HTMLCanvasElement.prototype.getBoundingClientRect =
    [7m  [0m [91m  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m84[0m:[93m13[0m - [91merror[0m[90m TS2741: [0mProperty 'data' is missing in type '{ onNodeSelect: Mock<any, any, any>; onEdgeSelect: Mock<any, any, any>; layoutAlgorithm: "force"; enablePhysics: boolean; showPerformanceMetrics: boolean; }' but required in type 'InteractiveGraphCanvasProps'.

    [7m84[0m     render(<InteractiveGraphCanvas {...defaultProps} />);
    [7m  [0m [91m            ~~~~~~~~~~~~~~~~~~~~~~[0m

      [96mclient/src/components/visualization/InteractiveGraphCanvas.tsx[0m:[93m49[0m:[93m3[0m
        [7m49[0m   data: GraphData;
        [7m  [0m [96m  ~~~~[0m
        'data' is declared here.
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m87[0m:[93m20[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m87[0m     expect(canvas).toBeInTheDocument();
    [7m  [0m [91m                   ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m92[0m:[93m13[0m - [91merror[0m[90m TS2741: [0mProperty 'data' is missing in type '{ onNodeSelect: Mock<any, any, any>; onEdgeSelect: Mock<any, any, any>; layoutAlgorithm: "force"; enablePhysics: boolean; showPerformanceMetrics: boolean; }' but required in type 'InteractiveGraphCanvasProps'.

    [7m92[0m     render(<InteractiveGraphCanvas {...defaultProps} />);
    [7m  [0m [91m            ~~~~~~~~~~~~~~~~~~~~~~[0m

      [96mclient/src/components/visualization/InteractiveGraphCanvas.tsx[0m:[93m49[0m:[93m3[0m
        [7m49[0m   data: GraphData;
        [7m  [0m [96m  ~~~~[0m
        'data' is declared here.
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m94[0m:[93m50[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m94[0m     expect(screen.getByText(/Layout Algorithm/)).toBeInTheDocument();
    [7m  [0m [91m                                                 ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m95[0m:[93m41[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m95[0m     expect(screen.getByText(/Physics/)).toBeInTheDocument();
    [7m  [0m [91m                                        ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m96[0m:[93m45[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m96[0m     expect(screen.getByText(/Performance/)).toBeInTheDocument();
    [7m  [0m [91m                                            ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m103[0m:[93m9[0m - [91merror[0m[90m TS2322: [0mType '{ showPerformanceMetrics: boolean; onNodeSelect: Mock<any, any, any>; onEdgeSelect: Mock<any, any, any>; layoutAlgorithm: "force"; enablePhysics: boolean; }' is not assignable to type 'IntrinsicAttributes & InteractiveGraphCanvasProps'.
      Property 'showPerformanceMetrics' does not exist on type 'IntrinsicAttributes & InteractiveGraphCanvasProps'.

    [7m103[0m         showPerformanceMetrics={true}
    [7m   [0m [91m        ~~~~~~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m107[0m:[93m55[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m107[0m     expect(screen.getByTestId('performance-metrics')).toBeInTheDocument();
    [7m   [0m [91m                                                      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m108[0m:[93m38[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m108[0m     expect(screen.getByText(/FPS:/)).toBeInTheDocument();
    [7m   [0m [91m                                     ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m109[0m:[93m40[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m109[0m     expect(screen.getByText(/Nodes:/)).toBeInTheDocument();
    [7m   [0m [91m                                       ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m110[0m:[93m40[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m110[0m     expect(screen.getByText(/Edges:/)).toBeInTheDocument();
    [7m   [0m [91m                                       ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m117[0m:[93m9[0m - [91merror[0m[90m TS2322: [0mType '{ showPerformanceMetrics: boolean; onNodeSelect: Mock<any, any, any>; onEdgeSelect: Mock<any, any, any>; layoutAlgorithm: "force"; enablePhysics: boolean; }' is not assignable to type 'IntrinsicAttributes & InteractiveGraphCanvasProps'.
      Property 'showPerformanceMetrics' does not exist on type 'IntrinsicAttributes & InteractiveGraphCanvasProps'.

    [7m117[0m         showPerformanceMetrics={false}
    [7m   [0m [91m        ~~~~~~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m121[0m:[93m61[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'Matchers<void, HTMLElement>'.

    [7m121[0m     expect(screen.queryByTestId('performance-metrics')).not.toBeInTheDocument();
    [7m   [0m [91m                                                            ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m126[0m:[93m13[0m - [91merror[0m[90m TS2741: [0mProperty 'data' is missing in type '{ onNodeSelect: Mock<any, any, any>; onEdgeSelect: Mock<any, any, any>; layoutAlgorithm: "force"; enablePhysics: boolean; showPerformanceMetrics: boolean; }' but required in type 'InteractiveGraphCanvasProps'.

    [7m126[0m     render(<InteractiveGraphCanvas {...defaultProps} />);
    [7m   [0m [91m            ~~~~~~~~~~~~~~~~~~~~~~[0m

      [96mclient/src/components/visualization/InteractiveGraphCanvas.tsx[0m:[93m49[0m:[93m3[0m
        [7m49[0m   data: GraphData;
        [7m  [0m [96m  ~~~~[0m
        'data' is declared here.
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m131[0m:[93m29[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveValue' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m131[0m     expect(algorithmSelect).toHaveValue('circular');
    [7m   [0m [91m                            ~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m136[0m:[93m54[0m - [91merror[0m[90m TS2322: [0mType '{ enablePhysics: boolean; onNodeSelect: Mock<any, any, any>; onEdgeSelect: Mock<any, any, any>; layoutAlgorithm: "force"; showPerformanceMetrics: boolean; }' is not assignable to type 'IntrinsicAttributes & InteractiveGraphCanvasProps'.
      Property 'enablePhysics' does not exist on type 'IntrinsicAttributes & InteractiveGraphCanvasProps'.

    [7m136[0m     render(<InteractiveGraphCanvas {...defaultProps} enablePhysics={true} />);
    [7m   [0m [91m                                                     ~~~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m139[0m:[93m29[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeChecked' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m139[0m     expect(physicsCheckbox).toBeChecked();
    [7m   [0m [91m                            ~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m142[0m:[93m33[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeChecked' does not exist on type 'Matchers<void, HTMLElement>'.

    [7m142[0m     expect(physicsCheckbox).not.toBeChecked();
    [7m   [0m [91m                                ~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m150[0m:[93m9[0m - [91merror[0m[90m TS2322: [0mType '{ showPerformanceMetrics: boolean; onNodeSelect: Mock<any, any, any>; onEdgeSelect: Mock<any, any, any>; layoutAlgorithm: "force"; enablePhysics: boolean; }' is not assignable to type 'IntrinsicAttributes & InteractiveGraphCanvasProps'.
      Property 'showPerformanceMetrics' does not exist on type 'IntrinsicAttributes & InteractiveGraphCanvasProps'.

    [7m150[0m         showPerformanceMetrics={false}
    [7m   [0m [91m        ~~~~~~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m157[0m:[93m33[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeChecked' does not exist on type 'Matchers<void, HTMLElement>'.

    [7m157[0m     expect(metricsCheckbox).not.toBeChecked();
    [7m   [0m [91m                                ~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m160[0m:[93m29[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeChecked' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m160[0m     expect(metricsCheckbox).toBeChecked();
    [7m   [0m [91m                            ~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m161[0m:[93m55[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m161[0m     expect(screen.getByTestId('performance-metrics')).toBeInTheDocument();
    [7m   [0m [91m                                                      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m167[0m:[93m49[0m - [91merror[0m[90m TS2322: [0mType '{ onNodeSelect: Mock<any, any, any>; onEdgeSelect: Mock<any, any, any>; layoutAlgorithm: "force"; enablePhysics: boolean; showPerformanceMetrics: boolean; }' is not assignable to type 'IntrinsicAttributes & InteractiveGraphCanvasProps'.
      Property 'onNodeSelect' does not exist on type 'IntrinsicAttributes & InteractiveGraphCanvasProps'.

    [7m167[0m       <InteractiveGraphCanvas {...defaultProps} onNodeSelect={onNodeSelect} />,
    [7m   [0m [91m                                                ~~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m186[0m:[93m13[0m - [91merror[0m[90m TS2741: [0mProperty 'data' is missing in type '{ onNodeSelect: Mock<any, any, any>; onEdgeSelect: Mock<any, any, any>; layoutAlgorithm: "force"; enablePhysics: boolean; showPerformanceMetrics: boolean; }' but required in type 'InteractiveGraphCanvasProps'.

    [7m186[0m     render(<InteractiveGraphCanvas {...defaultProps} />);
    [7m   [0m [91m            ~~~~~~~~~~~~~~~~~~~~~~[0m

      [96mclient/src/components/visualization/InteractiveGraphCanvas.tsx[0m:[93m49[0m:[93m3[0m
        [7m49[0m   data: GraphData;
        [7m  [0m [96m  ~~~~[0m
        'data' is declared here.
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m201[0m:[93m13[0m - [91merror[0m[90m TS2741: [0mProperty 'data' is missing in type '{ onNodeSelect: Mock<any, any, any>; onEdgeSelect: Mock<any, any, any>; layoutAlgorithm: "force"; enablePhysics: boolean; showPerformanceMetrics: boolean; }' but required in type 'InteractiveGraphCanvasProps'.

    [7m201[0m     render(<InteractiveGraphCanvas {...defaultProps} />);
    [7m   [0m [91m            ~~~~~~~~~~~~~~~~~~~~~~[0m

      [96mclient/src/components/visualization/InteractiveGraphCanvas.tsx[0m:[93m49[0m:[93m3[0m
        [7m49[0m   data: GraphData;
        [7m  [0m [96m  ~~~~[0m
        'data' is declared here.
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m219[0m:[93m49[0m - [91merror[0m[90m TS2322: [0mType '{ investigationId: string; onNodeSelect: Mock<any, any, any>; onEdgeSelect: Mock<any, any, any>; layoutAlgorithm: "force"; enablePhysics: boolean; showPerformanceMetrics: boolean; }' is not assignable to type 'IntrinsicAttributes & InteractiveGraphCanvasProps'.
      Property 'investigationId' does not exist on type 'IntrinsicAttributes & InteractiveGraphCanvasProps'.

    [7m219[0m       <InteractiveGraphCanvas {...defaultProps} investigationId="inv-123" />,
    [7m   [0m [91m                                                ~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m223[0m:[93m20[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m223[0m     expect(canvas).toBeInTheDocument();
    [7m   [0m [91m                   ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m227[0m:[93m34[0m - [91merror[0m[90m TS2741: [0mProperty 'data' is missing in type '{ onNodeSelect: Mock<any, any, any>; onEdgeSelect: Mock<any, any, any>; layoutAlgorithm: "force"; enablePhysics: boolean; showPerformanceMetrics: boolean; }' but required in type 'InteractiveGraphCanvasProps'.

    [7m227[0m     const { rerender } = render(<InteractiveGraphCanvas {...defaultProps} />);
    [7m   [0m [91m                                 ~~~~~~~~~~~~~~~~~~~~~~[0m

      [96mclient/src/components/visualization/InteractiveGraphCanvas.tsx[0m:[93m49[0m:[93m3[0m
        [7m49[0m   data: GraphData;
        [7m  [0m [96m  ~~~~[0m
        'data' is declared here.
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m240[0m:[93m15[0m - [91merror[0m[90m TS2741: [0mProperty 'data' is missing in type '{ onNodeSelect: Mock<any, any, any>; onEdgeSelect: Mock<any, any, any>; layoutAlgorithm: "force"; enablePhysics: boolean; showPerformanceMetrics: boolean; }' but required in type 'InteractiveGraphCanvasProps'.

    [7m240[0m     rerender(<InteractiveGraphCanvas {...defaultProps} />);
    [7m   [0m [91m              ~~~~~~~~~~~~~~~~~~~~~~[0m

      [96mclient/src/components/visualization/InteractiveGraphCanvas.tsx[0m:[93m49[0m:[93m3[0m
        [7m49[0m   data: GraphData;
        [7m  [0m [96m  ~~~~[0m
        'data' is declared here.
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m247[0m:[93m33[0m - [91merror[0m[90m TS2741: [0mProperty 'data' is missing in type '{ onNodeSelect: Mock<any, any, any>; onEdgeSelect: Mock<any, any, any>; layoutAlgorithm: "force"; enablePhysics: boolean; showPerformanceMetrics: boolean; }' but required in type 'InteractiveGraphCanvasProps'.

    [7m247[0m     const { unmount } = render(<InteractiveGraphCanvas {...defaultProps} />);
    [7m   [0m [91m                                ~~~~~~~~~~~~~~~~~~~~~~[0m

      [96mclient/src/components/visualization/InteractiveGraphCanvas.tsx[0m:[93m49[0m:[93m3[0m
        [7m49[0m   data: GraphData;
        [7m  [0m [96m  ~~~~[0m
        'data' is declared here.
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m258[0m:[93m49[0m - [91merror[0m[90m TS2322: [0mType '{ onNodeSelect: Mock<any, any, any>; onEdgeSelect: Mock<any, any, any>; layoutAlgorithm: "force"; enablePhysics: boolean; showPerformanceMetrics: boolean; }' is not assignable to type 'IntrinsicAttributes & InteractiveGraphCanvasProps'.
      Property 'onNodeSelect' does not exist on type 'IntrinsicAttributes & InteractiveGraphCanvasProps'.

    [7m258[0m       <InteractiveGraphCanvas {...defaultProps} onNodeSelect={onNodeSelect} />,
    [7m   [0m [91m                                                ~~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m274[0m:[93m49[0m - [91merror[0m[90m TS2322: [0mType '{ onEdgeSelect: Mock<any, any, any>; onNodeSelect: Mock<any, any, any>; layoutAlgorithm: "force"; enablePhysics: boolean; showPerformanceMetrics: boolean; }' is not assignable to type 'IntrinsicAttributes & InteractiveGraphCanvasProps'.
      Property 'onEdgeSelect' does not exist on type 'IntrinsicAttributes & InteractiveGraphCanvasProps'.

    [7m274[0m       <InteractiveGraphCanvas {...defaultProps} onEdgeSelect={onEdgeSelect} />,
    [7m   [0m [91m                                                ~~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m289[0m:[93m8[0m - [91merror[0m[90m TS2741: [0mProperty 'data' is missing in type '{ className: string; onNodeSelect: Mock<any, any, any>; onEdgeSelect: Mock<any, any, any>; layoutAlgorithm: "force"; enablePhysics: boolean; showPerformanceMetrics: boolean; }' but required in type 'InteractiveGraphCanvasProps'.

    [7m289[0m       <InteractiveGraphCanvas {...defaultProps} className="custom-class" />,
    [7m   [0m [91m       ~~~~~~~~~~~~~~~~~~~~~~[0m

      [96mclient/src/components/visualization/InteractiveGraphCanvas.tsx[0m:[93m49[0m:[93m3[0m
        [7m49[0m   data: GraphData;
        [7m  [0m [96m  ~~~~[0m
        'data' is declared here.
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m293[0m:[93m23[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveClass' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m293[0m     expect(container).toHaveClass('custom-class');
    [7m   [0m [91m                      ~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m298[0m:[93m13[0m - [91merror[0m[90m TS2741: [0mProperty 'data' is missing in type '{ onNodeSelect: Mock<any, any, any>; onEdgeSelect: Mock<any, any, any>; layoutAlgorithm: "force"; enablePhysics: boolean; showPerformanceMetrics: boolean; }' but required in type 'InteractiveGraphCanvasProps'.

    [7m298[0m     render(<InteractiveGraphCanvas {...defaultProps} />);
    [7m   [0m [91m            ~~~~~~~~~~~~~~~~~~~~~~[0m

      [96mclient/src/components/visualization/InteractiveGraphCanvas.tsx[0m:[93m49[0m:[93m3[0m
        [7m49[0m   data: GraphData;
        [7m  [0m [96m  ~~~~[0m
        'data' is declared here.
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m304[0m:[93m29[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveValue' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m304[0m     expect(algorithmSelect).toHaveValue('circular');
    [7m   [0m [91m                            ~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m307[0m:[93m29[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveValue' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m307[0m     expect(algorithmSelect).toHaveValue('grid');
    [7m   [0m [91m                            ~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m310[0m:[93m29[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveValue' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m310[0m     expect(algorithmSelect).toHaveValue('hierarchical');
    [7m   [0m [91m                            ~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m313[0m:[93m29[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveValue' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m313[0m     expect(algorithmSelect).toHaveValue('force');
    [7m   [0m [91m                            ~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m320[0m:[93m9[0m - [91merror[0m[90m TS2322: [0mType '{ showPerformanceMetrics: boolean; onNodeSelect: Mock<any, any, any>; onEdgeSelect: Mock<any, any, any>; layoutAlgorithm: "force"; enablePhysics: boolean; }' is not assignable to type 'IntrinsicAttributes & InteractiveGraphCanvasProps'.
      Property 'showPerformanceMetrics' does not exist on type 'IntrinsicAttributes & InteractiveGraphCanvasProps'.

    [7m320[0m         showPerformanceMetrics={true}
    [7m   [0m [91m        ~~~~~~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m325[0m:[93m32[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m325[0m     expect(performanceMetrics).toBeInTheDocument();
    [7m   [0m [91m                               ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m328[0m:[93m42[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m328[0m     expect(screen.getByText(/FPS: \d+/)).toBeInTheDocument();
    [7m   [0m [91m                                         ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m329[0m:[93m44[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m329[0m     expect(screen.getByText(/Nodes: \d+/)).toBeInTheDocument();
    [7m   [0m [91m                                           ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m330[0m:[93m44[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m330[0m     expect(screen.getByText(/Edges: \d+/)).toBeInTheDocument();
    [7m   [0m [91m                                           ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx[0m:[93m334[0m:[93m54[0m - [91merror[0m[90m TS2322: [0mType '{ enablePhysics: boolean; onNodeSelect: Mock<any, any, any>; onEdgeSelect: Mock<any, any, any>; layoutAlgorithm: "force"; showPerformanceMetrics: boolean; }' is not assignable to type 'IntrinsicAttributes & InteractiveGraphCanvasProps'.
      Property 'enablePhysics' does not exist on type 'IntrinsicAttributes & InteractiveGraphCanvasProps'.

    [7m334[0m     render(<InteractiveGraphCanvas {...defaultProps} enablePhysics={true} />);
    [7m   [0m [91m                                                     ~~~~~~~~~~~~~[0m

FAIL server server/src/tests/ai.integration.test.ts
  ● Test suite failed to run

    [96mserver/src/tests/ai.integration.test.ts[0m:[93m44[0m:[93m42[0m - [91merror[0m[90m TS2345: [0mArgument of type '{ records: { get: Mock<UnknownFunction>; }[]; }' is not assignable to parameter of type 'never'.

    [7m 44[0m         run: jest.fn().mockResolvedValue({
    [7m   [0m [91m                                         ~[0m
    [7m 45[0m           records: [
    [7m   [0m [91m~~~~~~~~~~~~~~~~~~~~[0m
    [7m...[0m 
    [7m 58[0m           ],
    [7m   [0m [91m~~~~~~~~~~~~[0m
    [7m 59[0m         }),
    [7m   [0m [91m~~~~~~~~~[0m
    [96mserver/src/tests/ai.integration.test.ts[0m:[93m364[0m:[93m42[0m - [91merror[0m[90m TS2345: [0mArgument of type 'Error' is not assignable to parameter of type 'never'.

    [7m364[0m         run: jest.fn().mockRejectedValue(new Error('Neo4j connection failed')),
    [7m   [0m [91m                                         ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m

FAIL server server/src/resolvers/__tests__/WargameResolver.test.ts
  ● Test suite failed to run

    [96mserver/src/resolvers/__tests__/WargameResolver.test.ts[0m:[93m289[0m:[93m37[0m - [91merror[0m[90m TS2551: [0mProperty 'updateCrisisScenario' does not exist on type 'WargameResolver'. Did you mean 'deleteCrisisScenario'?

    [7m289[0m       const result = await resolver.updateCrisisScenario(
    [7m   [0m [91m                                    ~~~~~~~~~~~~~~~~~~~~[0m

      [96mserver/src/resolvers/WargameResolver.ts[0m:[93m204[0m:[93m9[0m
        [7m204[0m   async deleteCrisisScenario(
        [7m   [0m [96m        ~~~~~~~~~~~~~~~~~~~~[0m
        'deleteCrisisScenario' is declared here.

FAIL server server/src/conductor/__tests__/mcp-client.test.ts
  ● Test suite failed to run

    [96mserver/src/conductor/__tests__/mcp-client.test.ts[0m:[93m63[0m:[93m38[0m - [91merror[0m[90m TS2345: [0mArgument of type '(event: string, callback: Function) => void' is not assignable to parameter of type '(event: string | symbol, listener: (this: WebSocket, ...args: any[]) => void) => WebSocket'.
      Type 'void' is not assignable to type 'WebSocket'.

    [7m63[0m       mockWs.once.mockImplementation((event: string, callback: Function) => {
    [7m  [0m [91m                                     ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
    [96mserver/src/conductor/__tests__/mcp-client.test.ts[0m:[93m78[0m:[93m38[0m - [91merror[0m[90m TS2345: [0mArgument of type '(event: string, callback: Function) => void' is not assignable to parameter of type '(event: string | symbol, listener: (this: WebSocket, ...args: any[]) => void) => WebSocket'.
      Type 'void' is not assignable to type 'WebSocket'.

    [7m78[0m       mockWs.once.mockImplementation((event: string, callback: Function) => {
    [7m  [0m [91m                                     ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
    [96mserver/src/conductor/__tests__/mcp-client.test.ts[0m:[93m97[0m:[93m38[0m - [91merror[0m[90m TS2345: [0mArgument of type '(event: string, callback: Function) => void' is not assignable to parameter of type '(event: string | symbol, listener: (this: WebSocket, ...args: any[]) => void) => WebSocket'.
      Type 'void' is not assignable to type 'WebSocket'.

    [7m97[0m       mockWs.once.mockImplementation((event: string, callback: Function) => {
    [7m  [0m [91m                                     ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
    [96mserver/src/conductor/__tests__/mcp-client.test.ts[0m:[93m111[0m:[93m38[0m - [91merror[0m[90m TS2345: [0mArgument of type '(event: string, callback: Function) => void' is not assignable to parameter of type '(event: string | symbol, listener: (this: WebSocket, ...args: any[]) => void) => WebSocket'.
      Type 'void' is not assignable to type 'WebSocket'.

    [7m111[0m       mockWs.once.mockImplementation((event: string, callback: Function) => {
    [7m   [0m [91m                                     ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
    [96mserver/src/conductor/__tests__/mcp-client.test.ts[0m:[93m142[0m:[93m7[0m - [91merror[0m[90m TS2684: [0mThe 'this' context of type 'void' is not assignable to method's 'this' of type 'WebSocket'.

    [7m142[0m       messageHandler(Buffer.from(JSON.stringify(response)));
    [7m   [0m [91m      ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
    [96mserver/src/conductor/__tests__/mcp-client.test.ts[0m:[93m169[0m:[93m7[0m - [91merror[0m[90m TS2684: [0mThe 'this' context of type 'void' is not assignable to method's 'this' of type 'WebSocket'.

    [7m169[0m       messageHandler(Buffer.from(JSON.stringify(errorResponse)));
    [7m   [0m [91m      ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
    [96mserver/src/conductor/__tests__/mcp-client.test.ts[0m:[93m195[0m:[93m38[0m - [91merror[0m[90m TS2345: [0mArgument of type '(event: string, callback: Function) => void' is not assignable to parameter of type '(event: string | symbol, listener: (this: WebSocket, ...args: any[]) => void) => WebSocket'.
      Type 'void' is not assignable to type 'WebSocket'.

    [7m195[0m       mockWs.once.mockImplementation((event: string, callback: Function) => {
    [7m   [0m [91m                                     ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
    [96mserver/src/conductor/__tests__/mcp-client.test.ts[0m:[93m215[0m:[93m38[0m - [91merror[0m[90m TS2345: [0mArgument of type '(event: string, callback: Function) => void' is not assignable to parameter of type '(event: string | symbol, listener: (this: WebSocket, ...args: any[]) => void) => WebSocket'.
      Type 'void' is not assignable to type 'WebSocket'.

    [7m215[0m       mockWs.once.mockImplementation((event: string, callback: Function) => {
    [7m   [0m [91m                                     ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
    [96mserver/src/conductor/__tests__/mcp-client.test.ts[0m:[93m242[0m:[93m7[0m - [91merror[0m[90m TS2684: [0mThe 'this' context of type 'void' is not assignable to method's 'this' of type 'WebSocket'.

    [7m242[0m       messageHandler(Buffer.from(JSON.stringify(response)));
    [7m   [0m [91m      ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
    [96mserver/src/conductor/__tests__/mcp-client.test.ts[0m:[93m260[0m:[93m38[0m - [91merror[0m[90m TS2345: [0mArgument of type '(event: string, callback: Function) => void' is not assignable to parameter of type '(event: string | symbol, listener: (this: WebSocket, ...args: any[]) => void) => WebSocket'.
      Type 'void' is not assignable to type 'WebSocket'.

    [7m260[0m       mockWs.once.mockImplementation((event: string, callback: Function) => {
    [7m   [0m [91m                                     ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
    [96mserver/src/conductor/__tests__/mcp-client.test.ts[0m:[93m281[0m:[93m38[0m - [91merror[0m[90m TS2304: [0mCannot find name 'mockServerConfig'.

    [7m281[0m     registry.register('test-server', mockServerConfig);
    [7m   [0m [91m                                     ~~~~~~~~~~~~~~~~[0m
    [96mserver/src/conductor/__tests__/mcp-client.test.ts[0m:[93m284[0m:[93m36[0m - [91merror[0m[90m TS2304: [0mCannot find name 'mockServerConfig'.

    [7m284[0m     expect(retrieved).toEqual({ ...mockServerConfig, name: 'test-server' });
    [7m   [0m [91m                                   ~~~~~~~~~~~~~~~~[0m
    [96mserver/src/conductor/__tests__/mcp-client.test.ts[0m:[93m288[0m:[93m38[0m - [91merror[0m[90m TS2304: [0mCannot find name 'mockServerConfig'.

    [7m288[0m     registry.register('test-server', mockServerConfig);
    [7m   [0m [91m                                     ~~~~~~~~~~~~~~~~[0m
    [96mserver/src/conductor/__tests__/mcp-client.test.ts[0m:[93m295[0m:[93m34[0m - [91merror[0m[90m TS2304: [0mCannot find name 'mockServerConfig'.

    [7m295[0m     registry.register('server1', mockServerConfig);
    [7m   [0m [91m                                 ~~~~~~~~~~~~~~~~[0m
    [96mserver/src/conductor/__tests__/mcp-client.test.ts[0m:[93m296[0m:[93m34[0m - [91merror[0m[90m TS2304: [0mCannot find name 'mockServerConfig'.

    [7m296[0m     registry.register('server2', mockServerConfig);
    [7m   [0m [91m                                 ~~~~~~~~~~~~~~~~[0m
    [96mserver/src/conductor/__tests__/mcp-client.test.ts[0m:[93m305[0m:[93m10[0m - [91merror[0m[90m TS2552: [0mCannot find name 'mockServerConfig'. Did you mean 'server1Config'?

    [7m305[0m       ...mockServerConfig,
    [7m   [0m [91m         ~~~~~~~~~~~~~~~~[0m

      [96mserver/src/conductor/__tests__/mcp-client.test.ts[0m:[93m304[0m:[93m11[0m
        [7m304[0m     const server1Config = {
        [7m   [0m [96m          ~~~~~~~~~~~~~[0m
        'server1Config' is declared here.
    [96mserver/src/conductor/__tests__/mcp-client.test.ts[0m:[93m315[0m:[93m10[0m - [91merror[0m[90m TS2552: [0mCannot find name 'mockServerConfig'. Did you mean 'server1Config'?

    [7m315[0m       ...mockServerConfig,
    [7m   [0m [91m         ~~~~~~~~~~~~~~~~[0m

      [96mserver/src/conductor/__tests__/mcp-client.test.ts[0m:[93m304[0m:[93m11[0m
        [7m304[0m     const server1Config = {
        [7m   [0m [96m          ~~~~~~~~~~~~~[0m
        'server1Config' is declared here.

FAIL server server/tests/integration/startRecipe.int.test.ts
  ● Test suite failed to run

    [96mserver/tests/integration/startRecipe.int.test.ts[0m:[93m28[0m:[93m43[0m - [91merror[0m[90m TS2345: [0mArgument of type '"test-uuid-123"' is not assignable to parameter of type '`${string}-${string}-${string}-${string}-${string}`'.

    [7m28[0m     mockCrypto.randomUUID.mockReturnValue('test-uuid-123');
    [7m  [0m [91m                                          ~~~~~~~~~~~~~~~[0m
    [96mserver/tests/integration/startRecipe.int.test.ts[0m:[93m311[0m:[93m30[0m - [91merror[0m[90m TS2345: [0mArgument of type '"run-uuid-123"' is not assignable to parameter of type '`${string}-${string}-${string}-${string}-${string}`'.

    [7m311[0m         .mockReturnValueOnce('run-uuid-123')
    [7m   [0m [91m                             ~~~~~~~~~~~~~~[0m
    [96mserver/tests/integration/startRecipe.int.test.ts[0m:[93m312[0m:[93m30[0m - [91merror[0m[90m TS2345: [0mArgument of type '"audit-uuid-456"' is not assignable to parameter of type '`${string}-${string}-${string}-${string}-${string}`'.

    [7m312[0m         .mockReturnValueOnce('audit-uuid-456');
    [7m   [0m [91m                             ~~~~~~~~~~~~~~~~[0m

FAIL server server/src/tests/entityModel.test.js
  ● Test suite failed to run

    Jest encountered an unexpected token

    Jest failed to parse a file. This happens e.g. when your code or its dependencies use non-standard JavaScript syntax, or when Jest is not configured to support such syntax.

    Out of the box Jest supports Babel, which will be used to transform your files into valid JS based on your Babel configuration.

    By default "node_modules" folder is ignored by transformers.

    Here's what you can do:
     • If you are trying to use ECMAScript Modules, see https://jestjs.io/docs/ecmascript-modules for how to enable it.
     • If you are trying to use TypeScript, see https://jestjs.io/docs/getting-started#using-typescript
     • To have some of your "node_modules" files transformed, you can specify a custom "transformIgnorePatterns" in your config.
     • If you need a custom transformation specify a "transform" option in your config.
     • If you simply want to mock your non-JS modules (e.g. binary assets) you can stub them out with the "moduleNameMapper" config option.

    You'll find more details and examples of these config options in the docs:
    https://jestjs.io/docs/configuration
    For information about custom transformations, see:
    https://jestjs.io/docs/code-transformation

    Details:

    /Users/brianlong/Developer/summit/server/src/services/EntityModelService.js:8
    import logger from '../utils/logger.js';
    ^^^^^^

    SyntaxError: Cannot use import statement outside a module

       7 |   EntityModelService,
       8 |   entityModelService,
    >  9 | } = require('../services/EntityModelService');
         |     ^
      10 | const { migrationManager } = require('../db/migrations/index');
      11 | const {
      12 |   connectNeo4j,

      at Runtime.createScriptFromCode (node_modules/.pnpm/jest-runtime@29.7.0/node_modules/jest-runtime/build/index.js:1505:14)
      at Object.<anonymous> (server/src/tests/entityModel.test.js:9:5)

FAIL server server/tests/integration/ticket-linking-flow.test.ts
  ● Test suite failed to run

    [96mserver/tests/integration/ticket-linking-flow.test.ts[0m:[93m3[0m:[93m8[0m - [91merror[0m[90m TS1192: [0mModule '"/Users/brianlong/Developer/summit/server/src/app"' has no default export.

    [7m3[0m import app from '../../src/app.js';
    [7m [0m [91m       ~~~[0m
    [96mserver/tests/integration/ticket-linking-flow.test.ts[0m:[93m28[0m:[93m72[0m - [91merror[0m[90m TS2345: [0mArgument of type 'null' is not assignable to parameter of type 'never'.

    [7m28[0m       ticketLinkService.addTicketRunLink = jest.fn().mockResolvedValue(null);
    [7m  [0m [91m                                                                       ~~~~[0m
    [96mserver/tests/integration/ticket-linking-flow.test.ts[0m:[93m88[0m:[93m44[0m - [91merror[0m[90m TS2345: [0mArgument of type '{ rows: { provider: string; external_id: string; title: string; assignee: string; labels: string[]; project: null; repo: string; }[]; }' is not assignable to parameter of type 'never'.

    [7m 88[0m       mockPool.query.mockResolvedValueOnce({
    [7m   [0m [91m                                           ~[0m
    [7m 89[0m         rows: [
    [7m   [0m [91m~~~~~~~~~~~~~~~[0m
    [7m...[0m 
    [7m 99[0m         ],
    [7m   [0m [91m~~~~~~~~~~[0m
    [7m100[0m       });
    [7m   [0m [91m~~~~~~~[0m
    [96mserver/tests/integration/ticket-linking-flow.test.ts[0m:[93m103[0m:[93m44[0m - [91merror[0m[90m TS2345: [0mArgument of type '{ rows: { id: string; }[]; }' is not assignable to parameter of type 'never'.

    [7m103[0m       mockPool.query.mockResolvedValueOnce({
    [7m   [0m [91m                                           ~[0m
    [7m104[0m         rows: [{ id: 'run-abc-123' }],
    [7m   [0m [91m~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
    [7m105[0m       });
    [7m   [0m [91m~~~~~~~[0m
    [96mserver/tests/integration/ticket-linking-flow.test.ts[0m:[93m108[0m:[93m44[0m - [91merror[0m[90m TS2345: [0mArgument of type '{ rows: undefined[]; }' is not assignable to parameter of type 'never'.

    [7m108[0m       mockPool.query.mockResolvedValueOnce({
    [7m   [0m [91m                                           ~[0m
    [7m109[0m         rows: [],
    [7m   [0m [91m~~~~~~~~~~~~~~~~~[0m
    [7m110[0m       });
    [7m   [0m [91m~~~~~~~[0m
    [96mserver/tests/integration/ticket-linking-flow.test.ts[0m:[93m165[0m:[93m28[0m - [91merror[0m[90m TS2345: [0mArgument of type 'null' is not assignable to parameter of type 'never'.

    [7m165[0m         .mockResolvedValue(null);
    [7m   [0m [91m                           ~~~~[0m
    [96mserver/tests/integration/ticket-linking-flow.test.ts[0m:[93m243[0m:[93m28[0m - [91merror[0m[90m TS2345: [0mArgument of type 'Error' is not assignable to parameter of type 'never'.

    [7m243[0m         .mockRejectedValue(new Error('Run nonexistent-run not found'));
    [7m   [0m [91m                           ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
    [96mserver/tests/integration/ticket-linking-flow.test.ts[0m:[93m270[0m:[93m72[0m - [91merror[0m[90m TS2345: [0mArgument of type 'null' is not assignable to parameter of type 'never'.

    [7m270[0m       ticketLinkService.addTicketRunLink = jest.fn().mockResolvedValue(null);
    [7m   [0m [91m                                                                       ~~~~[0m

FAIL server server/tests/db/postgres.pool.test.ts
  ● Test suite failed to run

    [96mserver/tests/db/postgres.pool.test.ts[0m:[93m29[0m:[93m39[0m - [91merror[0m[90m TS2554: [0mExpected 0 arguments, but got 1.

    [7m29[0m         return this.pool.queryHandler(queryConfig);
    [7m  [0m [91m                                      ~~~~~~~~~~~[0m
    [96mserver/tests/db/postgres.pool.test.ts[0m:[93m55[0m:[93m25[0m - [91merror[0m[90m TS2554: [0mExpected 0 arguments, but got 1.

    [7m55[0m       this.queryHandler(config),
    [7m  [0m [91m                        ~~~~~~[0m

FAIL server server/tests/federal-integration.test.ts
  ● Test suite failed to run

    [96mserver/tests/federal-integration.test.ts[0m:[93m4[0m:[93m10[0m - [91merror[0m[90m TS2724: [0m'"../src/federal/hsm-enforcement"' has no exported member named 'HSMEnforcement'. Did you mean 'hsmEnforcement'?

    [7m4[0m import { HSMEnforcement } from '../src/federal/hsm-enforcement';
    [7m [0m [91m         ~~~~~~~~~~~~~~[0m

      [96mserver/src/federal/hsm-enforcement.ts[0m:[93m439[0m:[93m14[0m
        [7m439[0m export const hsmEnforcement = new HSMEnforcement({
        [7m   [0m [96m             ~~~~~~~~~~~~~~[0m
        'hsmEnforcement' is declared here.
    [96mserver/tests/federal-integration.test.ts[0m:[93m5[0m:[93m36[0m - [91merror[0m[90m TS2307: [0mCannot find module '../src/federal/audit-logger' or its corresponding type declarations.

    [7m5[0m import { FederalAuditLogger } from '../src/federal/audit-logger';
    [7m [0m [91m                                   ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
    [96mserver/tests/federal-integration.test.ts[0m:[93m127[0m:[93m59[0m - [91merror[0m[90m TS2345: [0mArgument of type '{ _type: string; predicateType: string; subject: { name: string; digest: { sha256: string; }; }[]; predicate: { builder: { id: string; }; buildType: string; invocation: { configSource: { uri: string; digest: { ...; }; entryPoint: string; }; }; metadata: { ...; }; materials: any[]; buildConfig: {}; }; }' is not assignable to parameter of type 'string'.

    [7m127[0m       const result = await slsa3Verifier.verifyProvenance(mockProvenance, {
    [7m   [0m [91m                                                          ~~~~~~~~~~~~~~[0m
    [96mserver/tests/federal-integration.test.ts[0m:[93m143[0m:[93m59[0m - [91merror[0m[90m TS2345: [0mArgument of type '{ _type: string; predicateType: string; subject: { name: string; digest: { sha256: string; }; }[]; predicate: { builder: { id: string; }; buildType: string; invocation: { configSource: { uri: string; digest: { ...; }; entryPoint: string; }; }; metadata: { ...; }; materials: any[]; buildConfig: {}; }; }' is not assignable to parameter of type 'string'.

    [7m143[0m       const result = await slsa3Verifier.verifyProvenance(invalidProvenance, {
    [7m   [0m [91m                                                          ~~~~~~~~~~~~~~~~~[0m

FAIL server server/src/conductor/__tests__/router.test.ts
  ● MoERouter › route › routes export requests to EXPORT_TOOL

    expect(received).toBe(expected) // Object.is equality

    Expected: "EXPORT_TOOL"
    Received: "FILES_TOOL"

      55 |
      56 |       const decision = router.route(input);
    > 57 |       expect(decision.expert).toBe('EXPORT_TOOL');
         |                               ^
      58 |       expect(decision.reason).toContain('export/report generation');
      59 |     });
      60 |

      at Object.<anonymous> (server/src/conductor/__tests__/router.test.ts:57:31)

  ● MoERouter › route › routes investigation context queries to RAG_TOOL

    expect(received).toBe(expected) // Object.is equality

    Expected: "RAG_TOOL"
    Received: "LLM_LIGHT"

      91 |
      92 |       const decision = router.route(input);
    > 93 |       expect(decision.expert).toBe('RAG_TOOL');
         |                               ^
      94 |       expect(decision.reason).toContain('investigation context');
      95 |     });
      96 |

      at Object.<anonymous> (server/src/conductor/__tests__/router.test.ts:93:31)

  ● MoERouter › route › falls back to LLM_LIGHT when no specific tool matches

    expect(received).toContain(expected) // indexOf

    Expected substring: "Fallback"
    Received string:    "simple query"

      103 |       const decision = router.route(input);
      104 |       expect(decision.expert).toBe('LLM_LIGHT');
    > 105 |       expect(decision.reason).toContain('Fallback');
          |                               ^
      106 |     });
      107 |   });
      108 |

      at Object.<anonymous> (server/src/conductor/__tests__/router.test.ts:105:31)

FAIL server server/__tests__/nl2cypher-guardrails.test.ts
  ● Test suite failed to run

    [96mserver/__tests__/nl2cypher-guardrails.test.ts[0m:[93m7[0m:[93m10[0m - [91merror[0m[90m TS2305: [0mModule '"../src/app"' has no exported member 'app'.

    [7m7[0m import { app } from '../src/app';
    [7m [0m [91m         ~~~[0m

FAIL server server/src/tests/entityModelStructure.test.js
  ● Console

    console.log
      [dotenv@17.2.1] injecting env (90) from .env -- tip: ⚙️  load multiple .env files with { path: ['.env.local', '.env'] }

      at _log (node_modules/.pnpm/dotenv@17.2.1/node_modules/dotenv/lib/main.js:139:11)

    console.log
      [dotenv@17.2.1] injecting env (0) from .env -- tip: 📡 auto-backup env with Radar: https://dotenvx.com/radar

      at _log (node_modules/.pnpm/dotenv@17.2.1/node_modules/dotenv/lib/main.js:139:11)

    console.warn
      Migration directory not found, skipping naming convention test

      65 |       } catch (error) {
      66 |         // Directory might not exist in clean environment
    > 67 |         console.warn(
         |                 ^
      68 |           'Migration directory not found, skipping naming convention test',
      69 |         );
      70 |       }

      at Object.<anonymous> (server/src/tests/entityModelStructure.test.js:67:17)

  ● Entity Model Structure › Entity Model Service Structure › should have EntityModelService class

    Jest encountered an unexpected token

    Jest failed to parse a file. This happens e.g. when your code or its dependencies use non-standard JavaScript syntax, or when Jest is not configured to support such syntax.

    Out of the box Jest supports Babel, which will be used to transform your files into valid JS based on your Babel configuration.

    By default "node_modules" folder is ignored by transformers.

    Here's what you can do:
     • If you are trying to use ECMAScript Modules, see https://jestjs.io/docs/ecmascript-modules for how to enable it.
     • If you are trying to use TypeScript, see https://jestjs.io/docs/getting-started#using-typescript
     • To have some of your "node_modules" files transformed, you can specify a custom "transformIgnorePatterns" in your config.
     • If you need a custom transformation specify a "transform" option in your config.
     • If you simply want to mock your non-JS modules (e.g. binary assets) you can stub them out with the "moduleNameMapper" config option.

    You'll find more details and examples of these config options in the docs:
    https://jestjs.io/docs/configuration
    For information about custom transformations, see:
    https://jestjs.io/docs/code-transformation

    Details:

    /Users/brianlong/Developer/summit/server/src/services/EntityModelService.js:8
    import logger from '../utils/logger.js';
    ^^^^^^

    SyntaxError: Cannot use import statement outside a module

      77 |         EntityModelService,
      78 |         entityModelService,
    > 79 |       } = require('../services/EntityModelService');
         |           ^
      80 |
      81 |       expect(EntityModelService).toBeDefined();
      82 |       expect(typeof EntityModelService).toBe('function');

      at Runtime.createScriptFromCode (node_modules/.pnpm/jest-runtime@29.7.0/node_modules/jest-runtime/build/index.js:1505:14)
      at Object.<anonymous> (server/src/tests/entityModelStructure.test.js:79:11)

  ● Entity Model Structure › Entity Model Service Structure › should have required service methods

    Jest encountered an unexpected token

    Jest failed to parse a file. This happens e.g. when your code or its dependencies use non-standard JavaScript syntax, or when Jest is not configured to support such syntax.

    Out of the box Jest supports Babel, which will be used to transform your files into valid JS based on your Babel configuration.

    By default "node_modules" folder is ignored by transformers.

    Here's what you can do:
     • If you are trying to use ECMAScript Modules, see https://jestjs.io/docs/ecmascript-modules for how to enable it.
     • If you are trying to use TypeScript, see https://jestjs.io/docs/getting-started#using-typescript
     • To have some of your "node_modules" files transformed, you can specify a custom "transformIgnorePatterns" in your config.
     • If you need a custom transformation specify a "transform" option in your config.
     • If you simply want to mock your non-JS modules (e.g. binary assets) you can stub them out with the "moduleNameMapper" config option.

    You'll find more details and examples of these config options in the docs:
    https://jestjs.io/docs/configuration
    For information about custom transformations, see:
    https://jestjs.io/docs/code-transformation

    Details:

    /Users/brianlong/Developer/summit/server/src/services/EntityModelService.js:8
    import logger from '../utils/logger.js';
    ^^^^^^

    SyntaxError: Cannot use import statement outside a module

      86 |
      87 |     test('should have required service methods', () => {
    > 88 |       const { entityModelService } = require('../services/EntityModelService');
         |                                      ^
      89 |
      90 |       const requiredMethods = [
      91 |         'initialize',

      at Runtime.createScriptFromCode (node_modules/.pnpm/jest-runtime@29.7.0/node_modules/jest-runtime/build/index.js:1505:14)
      at Object.<anonymous> (server/src/tests/entityModelStructure.test.js:88:38)

  ● Entity Model Structure › Migration Scripts › should have npm script commands

    expect(received).toHaveProperty(path)

    Expected path: "migrate:status"
    Received path: []

    Received value: {"build": "tsc", "codegen": "graphql-codegen --config codegen.yml", "codegen:watch": "graphql-codegen --config codegen.yml --watch", "dev": "cross-env PORT=4000 nodemon --watch 'src/**/*' --exec 'npx tsx' src/index.ts", "dev:worker": "cross-env NODE_ENV=development CONDUCTOR_ROLE=worker WORKER_PORT=4100 nodemon --watch 'src/**/*.ts' --exec 'node --loader ts-node/esm' src/conductor/worker-entrypoint.ts", "format": "prettier --write .", "lint": "eslint .", "lint:fix": "eslint . --fix", "migrate": "ts-node scripts/migrate.ts up", "seed": "ts-node scripts/seed-data.ts", "seed:demo": "ts-node scripts/seed-demo.ts", "seed:large": "SEED_ENTITIES=50000 SEED_RELATIONSHIPS=250000 ts-node scripts/seed-data.ts", "seed:small": "SEED_ENTITIES=1000 SEED_RELATIONSHIPS=5000 ts-node scripts/seed-data.ts", "start": "node dist/index.js", "test": "jest", "test:coverage": "jest --coverage", "test:watch": "jest --watch", "typecheck": "tsc --noEmit", "typecheck:core": "tsc -p tsconfig.core.json --noEmit"}

      129 |
      130 |       expect(packageJson.scripts).toHaveProperty('migrate');
    > 131 |       expect(packageJson.scripts).toHaveProperty('migrate:status');
          |                                   ^
      132 |       expect(packageJson.scripts).toHaveProperty('migrate:create');
      133 |
      134 |       expect(packageJson.scripts.migrate).toContain('migrate-neo4j.js migrate');

      at Object.<anonymous> (server/src/tests/entityModelStructure.test.js:131:35)

  ● Entity Model Structure › Migration Content Validation › initial migration should have comprehensive constraints

    expect(received).toMatch(expected)

    Expected pattern: /entity_type.*INDEX/
    Received string:  "async up(session) {
        console.log('🔄 Setting up Neo4j entity model...');·
        // === NODE CONSTRAINTS ===
        // Unique constraints for primary keys
        const nodeConstraints = [
          'CREATE CONSTRAINT entity_id_unique IF NOT EXISTS FOR (e:Entity) REQUIRE e.id IS UNIQUE',
          'CREATE CONSTRAINT user_id_unique IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE',
          'CREATE CONSTRAINT investigation_id_unique IF NOT EXISTS FOR (i:Investigation) REQUIRE i.id IS UNIQUE',·
          // Email constraints
          'CREATE CONSTRAINT user_email_unique IF NOT EXISTS FOR (u:User) REQUIRE u.email IS UNIQUE',
          'CREATE CONSTRAINT user_username_unique IF NOT EXISTS FOR (u:User) REQUIRE u.username IS UNIQUE',·
          // Required field constraints
          'CREATE CONSTRAINT entity_type_exists IF NOT EXISTS FOR (e:Entity) REQUIRE e.type IS NOT NULL',
          'CREATE CONSTRAINT entity_label_exists IF NOT EXISTS FOR (e:Entity) REQUIRE e.label IS NOT NULL',
          'CREATE CONSTRAINT investigation_title_exists IF NOT EXISTS FOR (i:Investigation) REQUIRE i.title IS NOT NULL',
          'CREATE CONSTRAINT user_email_exists IF NOT EXISTS FOR (u:User) REQUIRE u.email IS NOT NULL',
        ];·
        for (const constraint of nodeConstraints) {
          try {
            await session.run(constraint);
            console.log(`✅ Created constraint: ${constraint.split(' ')[2]}`);
          } catch (error) {
            if (
              !error.message.includes('already exists') &&
              !error.message.includes('An equivalent')
            ) {
              console.warn(`⚠️  Failed to create constraint: ${error.message}`);
            }
          }
        }·
        // === RELATIONSHIP CONSTRAINTS ===
        const relationshipConstraints = [
          'CREATE CONSTRAINT relationship_id_unique IF NOT EXISTS FOR ()-[r:RELATIONSHIP]-() REQUIRE r.id IS UNIQUE',
          'CREATE CONSTRAINT created_by_id_unique IF NOT EXISTS FOR ()-[r:CREATED_BY]-() REQUIRE r.id IS UNIQUE',
          'CREATE CONSTRAINT belongs_to_id_unique IF NOT EXISTS FOR ()-[r:BELONGS_TO]-() REQUIRE r.id IS UNIQUE',
          'CREATE CONSTRAINT assigned_to_id_unique IF NOT EXISTS FOR ()-[r:ASSIGNED_TO]-() REQUIRE r.id IS UNIQUE',
        ];·
        for (const constraint of relationshipConstraints) {
          try {
            await session.run(constraint);
            console.log(
              `✅ Created relationship constraint: ${constraint.split(' ')[2]}`,
            );
          } catch (error) {
            if (
              !error.message.includes('already exists') &&
              !error.message.includes('An equivalent')
            ) {
              console.warn(
                `⚠️  Failed to create relationship constraint: ${error.message}`,
              );
            }
          }
        }·
        // === PERFORMANCE INDEXES ===
        const performanceIndexes = [
          // Entity indexes
          'CREATE INDEX entity_type_idx IF NOT EXISTS FOR (e:Entity) ON (e.type)',
          'CREATE INDEX entity_investigation_idx IF NOT EXISTS FOR (e:Entity) ON (e.investigationId)',
          'CREATE INDEX entity_created_by_idx IF NOT EXISTS FOR (e:Entity) ON (e.createdBy)',
          'CREATE INDEX entity_created_at_idx IF NOT EXISTS FOR (e:Entity) ON (e.createdAt)',
          'CREATE INDEX entity_updated_at_idx IF NOT EXISTS FOR (e:Entity) ON (e.updatedAt)',
          'CREATE INDEX entity_confidence_idx IF NOT EXISTS FOR (e:Entity) ON (e.confidence)',·
          // Investigation indexes
          'CREATE INDEX investigation_status_idx IF NOT EXISTS FOR (i:Investigation) ON (i.status)',
          'CREATE INDEX investigation_priority_idx IF NOT EXISTS FOR (i:Investigation) ON (i.priority)',
          'CREATE INDEX investigation_created_by_idx IF NOT EXISTS FOR (i:Investigation) ON (i.createdBy)',
          'CREATE INDEX investigation_created_at_idx IF NOT EXISTS FOR (i:Investigation) ON (i.createdAt)',
          'CREATE INDEX investigation_updated_at_idx IF NOT EXISTS FOR (i:Investigation) ON (i.updatedAt)',·
          // User indexes
          'CREATE INDEX user_role_idx IF NOT EXISTS FOR (u:User) ON (u.role)',
          'CREATE INDEX user_active_idx IF NOT EXISTS FOR (u:User) ON (u.isActive)',
          'CREATE INDEX user_last_login_idx IF NOT EXISTS FOR (u:User) ON (u.lastLogin)',·
          // Relationship indexes
          'CREATE INDEX relationship_type_idx IF NOT EXISTS FOR ()-[r:RELATIONSHIP]-() ON (r.type)',
          'CREATE INDEX relationship_investigation_idx IF NOT EXISTS FOR ()-[r:RELATIONSHIP]-() ON (r.investigationId)',
          'CREATE INDEX relationship_created_at_idx IF NOT EXISTS FOR ()-[r:RELATIONSHIP]-() ON (r.createdAt)',
          'CREATE INDEX relationship_confidence_idx IF NOT EXISTS FOR ()-[r:RELATIONSHIP]-() ON (r.confidence)',
        ];·
        for (const index of performanceIndexes) {
          try {
            await session.run(index);
            console.log(`✅ Created index: ${index.split(' ')[2]}`);
          } catch (error) {
            if (
              !error.message.includes('already exists') &&
              !error.message.includes('An equivalent')
            ) {
              console.warn(`⚠️  Failed to create index: ${error.message}`);
            }
          }
        }·
        // === FULL-TEXT SEARCH INDEXES ===
        const fulltextIndexes = [
          'CREATE FULLTEXT INDEX entity_search_idx IF NOT EXISTS FOR (e:Entity) ON EACH [e.label, e.description]',
          'CREATE FULLTEXT INDEX investigation_search_idx IF NOT EXISTS FOR (i:Investigation) ON EACH [i.title, i.description]',
          'CREATE FULLTEXT INDEX user_search_idx IF NOT EXISTS FOR (u:User) ON EACH [u.firstName, u.lastName, u.username, u.email]',
        ];·
        for (const index of fulltextIndexes) {
          try {
            await session.run(index);
            console.log(`✅ Created fulltext index: ${index.split(' ')[3]}`);
          } catch (error) {
            if (
              !error.message.includes('already exists') &&
              !error.message.includes('An equivalent')
            ) {
              console.warn(`⚠️  Failed to create fulltext index: ${error.message}`);
            }
          }
        }·
        // === COMPOSITE INDEXES FOR COMPLEX QUERIES ===
        const compositeIndexes = [
          'CREATE INDEX entity_type_investigation_idx IF NOT EXISTS FOR (e:Entity) ON (e.type, e.investigationId)',
          'CREATE INDEX entity_confidence_type_idx IF NOT EXISTS FOR (e:Entity) ON (e.confidence, e.type)',
          'CREATE INDEX investigation_status_priority_idx IF NOT EXISTS FOR (i:Investigation) ON (i.status, i.priority)',
          'CREATE INDEX relationship_type_confidence_idx IF NOT EXISTS FOR ()-[r:RELATIONSHIP]-() ON (r.type, r.confidence)',
        ];·
        for (const index of compositeIndexes) {
          try {
            await session.run(index);
            console.log(`✅ Created composite index: ${index.split(' ')[2]}`);
          } catch (error) {
            if (
              !error.message.includes('already exists') &&
              !error.message.includes('An equivalent')
            ) {
              console.warn(
                `⚠️  Failed to create composite index: ${error.message}`,
              );
            }
          }
        }·
        // === RANGE INDEXES FOR NUMERIC AND DATE QUERIES ===
        const rangeIndexes = [
          'CREATE RANGE INDEX entity_confidence_range_idx IF NOT EXISTS FOR (e:Entity) ON (e.confidence)',
          'CREATE RANGE INDEX entity_created_range_idx IF NOT EXISTS FOR (e:Entity) ON (e.createdAt)',
          'CREATE RANGE INDEX relationship_confidence_range_idx IF NOT EXISTS FOR ()-[r:RELATIONSHIP]-() ON (r.confidence)',
          'CREATE RANGE INDEX investigation_created_range_idx IF NOT EXISTS FOR (i:Investigation) ON (i.createdAt)',
        ];·
        for (const index of rangeIndexes) {
          try {
            await session.run(index);
            console.log(`✅ Created range index: ${index.split(' ')[3]}`);
          } catch (error) {
            if (
              !error.message.includes('already exists') &&
              !error.message.includes('An equivalent')
            ) {
              console.warn(`⚠️  Failed to create range index: ${error.message}`);
            }
          }
        }·
        console.log('✅ Neo4j entity model setup completed successfully');
      }"

      159 |
      160 |       // Should include key indexes
    > 161 |       expect(migrationString).toMatch(/entity_type.*INDEX/);
          |                               ^
      162 |       expect(migrationString).toMatch(/investigation_status.*INDEX/);
      163 |       expect(migrationString).toMatch(/FULLTEXT.*INDEX/);
      164 |

      at Object.<anonymous> (server/src/tests/entityModelStructure.test.js:161:31)

  ● Entity Model Structure › Entity Model Constants and Types › should define entity types from GraphQL schema file

    ENOENT: no such file or directory, open '/Users/brianlong/Developer/summit/server/src/graphql/schema/core.js'

      195 |
      196 |       const schemaPath = path.join(__dirname, '../graphql/schema/core.js');
    > 197 |       const schemaContent = await fs.readFile(schemaPath, 'utf8');
          |                             ^
      198 |
      199 |       // Should define EntityType enum
      200 |       expect(schemaContent).toMatch(/enum EntityType/);

      at Object.<anonymous> (server/src/tests/entityModelStructure.test.js:197:29)

  ● Entity Model Structure › Entity Model Constants and Types › should define relationship types from GraphQL schema file

    ENOENT: no such file or directory, open '/Users/brianlong/Developer/summit/server/src/graphql/schema/core.js'

      211 |
      212 |       const schemaPath = path.join(__dirname, '../graphql/schema/core.js');
    > 213 |       const schemaContent = await fs.readFile(schemaPath, 'utf8');
          |                             ^
      214 |
      215 |       // Should define RelationshipType enum
      216 |       expect(schemaContent).toMatch(/enum RelationshipType/);

      at Object.<anonymous> (server/src/tests/entityModelStructure.test.js:213:29)

  ● Entity Model Structure › Database Configuration Integration › should integrate migration system with database config

    ENOENT: no such file or directory, open '/Users/brianlong/Developer/summit/server/src/config/database.js'

      227 |
      228 |       const dbConfigPath = path.join(__dirname, '../config/database.js');
    > 229 |       const dbConfigContent = await fs.readFile(dbConfigPath, 'utf8');
          |                               ^
      230 |
      231 |       // Should have migration integration
      232 |       expect(dbConfigContent).toMatch(/runNeo4jMigrations|migrationManager/);

      at Object.<anonymous> (server/src/tests/entityModelStructure.test.js:229:31)

FAIL server server/tests/security/crypto-pipeline.test.ts
  ● Test suite failed to run

    [96mserver/tests/security/crypto-pipeline.test.ts[0m:[93m9[0m:[93m8[0m - [91merror[0m[90m TS2307: [0mCannot find module '../src/security/crypto/index.js' or its corresponding type declarations.

    [7m9[0m } from '../src/security/crypto/index.js';
    [7m [0m [91m       ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m

FAIL client client/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx
  ● Test suite failed to run

    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m56[0m:[93m53[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m56[0m     expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    [7m  [0m [91m                                                    ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m57[0m:[93m47[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m57[0m     expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
    [7m  [0m [91m                                              ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m60[0m:[93m42[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m60[0m     expect(screen.getByRole('combobox')).toBeInTheDocument();
    [7m  [0m [91m                                         ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m61[0m:[93m43[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m61[0m     expect(screen.getByText('Real-time')).toBeInTheDocument();
    [7m  [0m [91m                                          ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m62[0m:[93m51[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m62[0m     expect(screen.getByLabelText('Refresh Data')).toBeInTheDocument();
    [7m  [0m [91m                                                  ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m63[0m:[93m50[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m63[0m     expect(screen.getByLabelText('Export Data')).toBeInTheDocument();
    [7m  [0m [91m                                                 ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m64[0m:[93m47[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m64[0m     expect(screen.getByLabelText('Settings')).toBeInTheDocument();
    [7m  [0m [91m                                              ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m71[0m:[93m48[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m71[0m     expect(screen.getByText('Total Entities')).toBeInTheDocument();
    [7m  [0m [91m                                               ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m72[0m:[93m46[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m72[0m     expect(screen.getByText('Active Users')).toBeInTheDocument();
    [7m  [0m [91m                                             ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m73[0m:[93m48[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m73[0m     expect(screen.getByText('Avg Query Time')).toBeInTheDocument();
    [7m  [0m [91m                                               ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m74[0m:[93m52[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m74[0m     expect(screen.getByText('Data Quality Score')).toBeInTheDocument();
    [7m  [0m [91m                                                   ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m75[0m:[93m49[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m75[0m     expect(screen.getByText('Security Alerts')).toBeInTheDocument();
    [7m  [0m [91m                                                ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m76[0m:[93m48[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m76[0m     expect(screen.getByText('API Calls/Hour')).toBeInTheDocument();
    [7m  [0m [91m                                               ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m79[0m:[93m40[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m79[0m     expect(screen.getByText(/15,842/)).toBeInTheDocument();
    [7m  [0m [91m                                       ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m80[0m:[93m40[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m80[0m     expect(screen.getByText(/94\.2%/)).toBeInTheDocument();
    [7m  [0m [91m                                       ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m86[0m:[93m61[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m86[0m     expect(screen.getByText('Real-time monitoring active')).toBeInTheDocument();
    [7m  [0m [91m                                                            ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m87[0m:[93m51[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m87[0m     expect(screen.getByText('Updates every 60s')).toBeInTheDocument();
    [7m  [0m [91m                                                  ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m99[0m:[93m29[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m99[0m     expect(timeRangeSelect).toBeInTheDocument();
    [7m  [0m [91m                            ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m102[0m:[93m47[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m102[0m     expect(screen.getByText('Last 24 Hours')).toBeInTheDocument();
    [7m   [0m [91m                                              ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m113[0m:[93m28[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeChecked' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m113[0m     expect(realTimeSwitch).toBeChecked();
    [7m   [0m [91m                           ~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m132[0m:[93m45[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m132[0m     expect(screen.getByRole('progressbar')).toBeInTheDocument();
    [7m   [0m [91m                                            ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m140[0m:[93m53[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'Matchers<void, HTMLElement>'.

    [7m140[0m       expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    [7m   [0m [91m                                                    ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m148[0m:[93m42[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m148[0m     expect(screen.getByText('Overview')).toBeInTheDocument();
    [7m   [0m [91m                                         ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m149[0m:[93m45[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m149[0m     expect(screen.getByText('Performance')).toBeInTheDocument();
    [7m   [0m [91m                                            ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m150[0m:[93m39[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m150[0m     expect(screen.getByText('Usage')).toBeInTheDocument();
    [7m   [0m [91m                                      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m151[0m:[93m42[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m151[0m     expect(screen.getByText('Security')).toBeInTheDocument();
    [7m   [0m [91m                                         ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m158[0m:[93m7[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m158[0m     ).toBeInTheDocument();
    [7m   [0m [91m      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m165[0m:[93m7[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m165[0m     ).toBeInTheDocument();
    [7m   [0m [91m      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m196[0m:[93m45[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m196[0m     expect(screen.getByRole('progressbar')).toBeInTheDocument();
    [7m   [0m [91m                                            ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m199[0m:[93m27[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeDisabled' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m199[0m     expect(refreshButton).toBeDisabled();
    [7m   [0m [91m                          ~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m206[0m:[93m51[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m206[0m     expect(screen.getByLabelText('Refresh Data')).toBeInTheDocument();
    [7m   [0m [91m                                                  ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m207[0m:[93m50[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m207[0m     expect(screen.getByLabelText('Export Data')).toBeInTheDocument();
    [7m   [0m [91m                                                 ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m208[0m:[93m47[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m208[0m     expect(screen.getByLabelText('Settings')).toBeInTheDocument();
    [7m   [0m [91m                                              ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m209[0m:[93m42[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m209[0m     expect(screen.getByRole('combobox')).toBeInTheDocument();
    [7m   [0m [91m                                         ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m213[0m:[93m21[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m213[0m     expect(tabList).toBeInTheDocument();
    [7m   [0m [91m                    ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m220[0m:[93m40[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m220[0m     expect(screen.getByText(/15,842/)).toBeInTheDocument();
    [7m   [0m [91m                                       ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m221[0m:[93m40[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m221[0m     expect(screen.getByText(/94\.2%/)).toBeInTheDocument();
    [7m   [0m [91m                                       ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/analytics/__tests__/EnhancedAnalyticsDashboard.test.tsx[0m:[93m222[0m:[93m39[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m222[0m     expect(screen.getByText(/245ms/)).toBeInTheDocument();
    [7m   [0m [91m                                      ~~~~~~~~~~~~~~~~~[0m

PASS server server/src/tests/notificationService.test.js
FAIL client client/src/components/timeline/__tests__/TemporalAnalysis.test.tsx
  ● Test suite failed to run

    [96mclient/src/components/timeline/__tests__/TemporalAnalysis.test.tsx[0m:[93m91[0m:[93m51[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m91[0m     expect(screen.getByText(/Temporal Analysis/)).toBeInTheDocument();
    [7m  [0m [91m                                                  ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/timeline/__tests__/TemporalAnalysis.test.tsx[0m:[93m92[0m:[93m39[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m92[0m     expect(screen.getByText(/Reset/)).toBeInTheDocument();
    [7m  [0m [91m                                      ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/timeline/__tests__/TemporalAnalysis.test.tsx[0m:[93m98[0m:[93m58[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m98[0m     expect(screen.getByTestId('timeline-visualization')).toBeInTheDocument();
    [7m  [0m [91m                                                         ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/timeline/__tests__/TemporalAnalysis.test.tsx[0m:[93m104[0m:[93m52[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m104[0m     expect(screen.getByTestId('event-statistics')).toBeInTheDocument();
    [7m   [0m [91m                                                   ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/timeline/__tests__/TemporalAnalysis.test.tsx[0m:[93m114[0m:[93m17[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m114[0m     expect(btn).toBeInTheDocument();
    [7m   [0m [91m                ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/timeline/__tests__/TemporalAnalysis.test.tsx[0m:[93m117[0m:[93m17[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m117[0m     expect(btn).toBeInTheDocument();
    [7m   [0m [91m                ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/timeline/__tests__/TemporalAnalysis.test.tsx[0m:[93m128[0m:[93m17[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m128[0m     expect(viz).toBeInTheDocument();
    [7m   [0m [91m                ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/timeline/__tests__/TemporalAnalysis.test.tsx[0m:[93m134[0m:[93m43[0m - [91merror[0m[90m TS2322: [0mType '{ enableZoom: boolean; events: ({ id: string; timestamp: number; title: string; description: string; type: "system"; severity: "low"; entities: string[]; confidence: number; } | { id: string; timestamp: number; ... 5 more ...; confidence: number; })[]; onEventSelect: Mock<...>; onTimeRangeChange: Mock<...>; showClus...' is not assignable to type 'IntrinsicAttributes & TemporalAnalysisProps'.
      Property 'enableZoom' does not exist on type 'IntrinsicAttributes & TemporalAnalysisProps'.

    [7m134[0m       <TemporalAnalysis {...defaultProps} enableZoom={true} />,
    [7m   [0m [91m                                          ~~~~~~~~~~[0m
    [96mclient/src/components/timeline/__tests__/TemporalAnalysis.test.tsx[0m:[93m140[0m:[93m17[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m140[0m     expect(viz).toBeInTheDocument();
    [7m   [0m [91m                ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/timeline/__tests__/TemporalAnalysis.test.tsx[0m:[93m148[0m:[93m25[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m148[0m     expect(timelineViz).toBeInTheDocument();
    [7m   [0m [91m                        ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/timeline/__tests__/TemporalAnalysis.test.tsx[0m:[93m153[0m:[93m43[0m - [91merror[0m[90m TS2322: [0mType '{ investigationId: string; events: ({ id: string; timestamp: number; title: string; description: string; type: "system"; severity: "low"; entities: string[]; confidence: number; } | { id: string; timestamp: number; ... 5 more ...; confidence: number; })[]; ... 4 more ...; enableZoom: boolean; }' is not assignable to type 'IntrinsicAttributes & TemporalAnalysisProps'.
      Property 'investigationId' does not exist on type 'IntrinsicAttributes & TemporalAnalysisProps'.

    [7m153[0m       <TemporalAnalysis {...defaultProps} investigationId="inv-456" />,
    [7m   [0m [91m                                          ~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/timeline/__tests__/TemporalAnalysis.test.tsx[0m:[93m156[0m:[93m58[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m156[0m     expect(screen.getByTestId('timeline-visualization')).toBeInTheDocument();
    [7m   [0m [91m                                                         ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/timeline/__tests__/TemporalAnalysis.test.tsx[0m:[93m162[0m:[93m43[0m - [91merror[0m[90m TS2322: [0mType '{ onEventSelect: Mock<any, any, any>; events: ({ id: string; timestamp: number; title: string; description: string; type: "system"; severity: "low"; entities: string[]; confidence: number; } | { ...; })[]; onTimeRangeChange: Mock<...>; showClusters: boolean; showAnomalies: boolean; enableZoom: boolean; }' is not assignable to type 'IntrinsicAttributes & TemporalAnalysisProps'.
      Property 'onEventSelect' does not exist on type 'IntrinsicAttributes & TemporalAnalysisProps'.

    [7m162[0m       <TemporalAnalysis {...defaultProps} onEventSelect={onEventSelect} />,
    [7m   [0m [91m                                          ~~~~~~~~~~~~~[0m
    [96mclient/src/components/timeline/__tests__/TemporalAnalysis.test.tsx[0m:[93m167[0m:[93m25[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m167[0m     expect(timelineViz).toBeInTheDocument();
    [7m   [0m [91m                        ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/timeline/__tests__/TemporalAnalysis.test.tsx[0m:[93m183[0m:[93m19[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m183[0m     expect(reset).toBeInTheDocument();
    [7m   [0m [91m                  ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/timeline/__tests__/TemporalAnalysis.test.tsx[0m:[93m191[0m:[93m25[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m191[0m     expect(timelineViz).toBeInTheDocument();
    [7m   [0m [91m                        ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/timeline/__tests__/TemporalAnalysis.test.tsx[0m:[93m196[0m:[93m43[0m - [91merror[0m[90m TS2322: [0mType '{ enableZoom: boolean; events: ({ id: string; timestamp: number; title: string; description: string; type: "system"; severity: "low"; entities: string[]; confidence: number; } | { id: string; timestamp: number; ... 5 more ...; confidence: number; })[]; onEventSelect: Mock<...>; onTimeRangeChange: Mock<...>; showClus...' is not assignable to type 'IntrinsicAttributes & TemporalAnalysisProps'.
      Property 'enableZoom' does not exist on type 'IntrinsicAttributes & TemporalAnalysisProps'.

    [7m196[0m       <TemporalAnalysis {...defaultProps} enableZoom={false} />,
    [7m   [0m [91m                                          ~~~~~~~~~~[0m
    [96mclient/src/components/timeline/__tests__/TemporalAnalysis.test.tsx[0m:[93m201[0m:[93m25[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m201[0m     expect(timelineViz).toBeInTheDocument();
    [7m   [0m [91m                        ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/timeline/__tests__/TemporalAnalysis.test.tsx[0m:[93m215[0m:[93m23[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveClass' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m215[0m     expect(container).toHaveClass('custom-temporal-class');
    [7m   [0m [91m                      ~~~~~~~~~~~[0m
    [96mclient/src/components/timeline/__tests__/TemporalAnalysis.test.tsx[0m:[93m222[0m:[93m25[0m - [91merror[0m[90m TS2339: [0mProperty 'toHaveStyle' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m222[0m     expect(timelineViz).toHaveStyle({ width: '100%' });
    [7m   [0m [91m                        ~~~~~~~~~~~[0m
    [96mclient/src/components/timeline/__tests__/TemporalAnalysis.test.tsx[0m:[93m232[0m:[93m25[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m232[0m     expect(timelineViz).toBeInTheDocument();
    [7m   [0m [91m                        ~~~~~~~~~~~~~~~~~[0m
    [96mclient/src/components/timeline/__tests__/TemporalAnalysis.test.tsx[0m:[93m243[0m:[93m25[0m - [91merror[0m[90m TS2339: [0mProperty 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.

    [7m243[0m     expect(timelineViz).toBeInTheDocument();
    [7m   [0m [91m                        ~~~~~~~~~~~~~~~~~[0m

PASS server server/src/tests/piiOntologyEngine.test.ts
FAIL server server/tests/legal-hold-orchestrator.test.ts
  ● Test suite failed to run

    [96mserver/tests/legal-hold-orchestrator.test.ts[0m:[93m203[0m:[93m14[0m - [91merror[0m[90m TS2304: [0mCannot find name 'EDiscoveryCollectionRequest'.

    [7m203[0m     request: EDiscoveryCollectionRequest,
    [7m   [0m [91m             ~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
    [96mserver/tests/legal-hold-orchestrator.test.ts[0m:[93m204[0m:[93m14[0m - [91merror[0m[90m TS2304: [0mCannot find name 'EDiscoveryCollectionResult'.

    [7m204[0m   ): Promise<EDiscoveryCollectionResult> {
    [7m   [0m [91m             ~~~~~~~~~~~~~~~~~~~~~~~~~~[0m

FAIL server server/tests/services/AuthService.test.js
  ● Test suite failed to run

    [96mserver/src/services/AuthService.ts[0m:[93m102[0m:[93m5[0m - [91merror[0m[90m TS2740: [0mType 'ManagedPostgresPool' is missing the following properties from type 'Pool': totalCount, idleCount, waitingCount, expiredCount, and 17 more.

    [7m102[0m     this.pool = getPostgresPool();
    [7m   [0m [91m    ~~~~~~~~~[0m
    [96mserver/src/services/AuthService.ts[0m:[93m214[0m:[93m23[0m - [91merror[0m[90m TS2769: [0mNo overload matches this call.
      Overload 1 of 5, '(payload: string | object | Buffer<ArrayBufferLike>, secretOrPrivateKey: null, options?: SignOptions & { algorithm: "none"; }): string', gave the following error.
        Argument of type 'string' is not assignable to parameter of type 'null'.
      Overload 2 of 5, '(payload: string | object | Buffer<ArrayBufferLike>, secretOrPrivateKey: Buffer<ArrayBufferLike> | Secret | PrivateKeyInput | JsonWebKeyInput, options?: SignOptions): string', gave the following error.
        Type 'string' is not assignable to type 'number | StringValue'.
      Overload 3 of 5, '(payload: string | object | Buffer<ArrayBufferLike>, secretOrPrivateKey: Buffer<ArrayBufferLike> | Secret | PrivateKeyInput | JsonWebKeyInput, callback: SignCallback): void', gave the following error.
        Object literal may only specify known properties, and 'expiresIn' does not exist in type 'SignCallback'.

    [7m214[0m     const token = jwt.sign(tokenPayload, config.jwt.secret, {
    [7m   [0m [91m                      ~~~~[0m

      [96mnode_modules/@types/jsonwebtoken/index.d.ts[0m:[93m43[0m:[93m5[0m
        [7m43[0m     expiresIn?: StringValue | number;
        [7m  [0m [96m    ~~~~~~~~~[0m
        The expected type comes from property 'expiresIn' which is declared here on type 'SignOptions'

FAIL server server/src/config/distributed/__tests__/distributed-config-service.test.ts
  ● Test suite failed to run

    [96mserver/src/config/distributed/__tests__/distributed-config-service.test.ts[0m:[93m76[0m:[93m11[0m - [91merror[0m[90m TS2741: [0mProperty 'enableCaching' is missing in type '{ enableStreaming: true; }' but required in type '{ enableCaching: boolean; enableStreaming: boolean; }'.

    [7m76[0m           features: { enableStreaming: true },
    [7m  [0m [91m          ~~~~~~~~[0m

      [96mserver/src/config/distributed/__tests__/distributed-config-service.test.ts[0m:[93m33[0m:[93m7[0m
        [7m33[0m       enableCaching: true,
        [7m  [0m [96m      ~~~~~~~~~~~~~~~~~~~[0m
        'enableCaching' is declared here.
      [96mserver/src/config/distributed/__tests__/distributed-config-service.test.ts[0m:[93m32[0m:[93m5[0m
        [7m32[0m     features: {
        [7m  [0m [96m    ~~~~~~~~~~~[0m
        [7m33[0m       enableCaching: true,
        [7m  [0m [96m~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
        [7m34[0m       enableStreaming: false,
        [7m  [0m [96m~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
        [7m35[0m     },
        [7m  [0m [96m~~~~~[0m
        The expected type comes from property 'features' which is declared here on type 'Partial<{ endpoint: string; retries: number; features: { enableCaching: boolean; enableStreaming: boolean; }; database: { host: string; password: { __secretRef: { provider: string; key: string; }; }; }; }>'
    [96mserver/src/config/distributed/__tests__/distributed-config-service.test.ts[0m:[93m135[0m:[93m19[0m - [91merror[0m[90m TS2741: [0mProperty 'enableCaching' is missing in type '{ enableStreaming: true; }' but required in type '{ enableCaching: boolean; enableStreaming: boolean; }'.

    [7m135[0m         config: { features: { enableStreaming: true } },
    [7m   [0m [91m                  ~~~~~~~~[0m

      [96mserver/src/config/distributed/__tests__/distributed-config-service.test.ts[0m:[93m33[0m:[93m7[0m
        [7m33[0m       enableCaching: true,
        [7m  [0m [96m      ~~~~~~~~~~~~~~~~~~~[0m
        'enableCaching' is declared here.
      [96mserver/src/config/distributed/__tests__/distributed-config-service.test.ts[0m:[93m32[0m:[93m5[0m
        [7m32[0m     features: {
        [7m  [0m [96m    ~~~~~~~~~~~[0m
        [7m33[0m       enableCaching: true,
        [7m  [0m [96m~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
        [7m34[0m       enableStreaming: false,
        [7m  [0m [96m~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
        [7m35[0m     },
        [7m  [0m [96m~~~~~[0m
        The expected type comes from property 'features' which is declared here on type 'Partial<{ endpoint: string; retries: number; features: { enableCaching: boolean; enableStreaming: boolean; }; database: { host: string; password: { __secretRef: { provider: string; key: string; }; }; }; }>'
    [96mserver/src/config/distributed/__tests__/distributed-config-service.test.ts[0m:[93m164[0m:[93m23[0m - [91merror[0m[90m TS2741: [0mProperty 'enableCaching' is missing in type '{ enableStreaming: true; }' but required in type '{ enableCaching: boolean; enableStreaming: boolean; }'.

    [7m164[0m             config: { features: { enableStreaming: true } },
    [7m   [0m [91m                      ~~~~~~~~[0m

      [96mserver/src/config/distributed/__tests__/distributed-config-service.test.ts[0m:[93m33[0m:[93m7[0m
        [7m33[0m       enableCaching: true,
        [7m  [0m [96m      ~~~~~~~~~~~~~~~~~~~[0m
        'enableCaching' is declared here.
      [96mserver/src/config/distributed/__tests__/distributed-config-service.test.ts[0m:[93m32[0m:[93m5[0m
        [7m32[0m     features: {
        [7m  [0m [96m    ~~~~~~~~~~~[0m
        [7m33[0m       enableCaching: true,
        [7m  [0m [96m~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
        [7m34[0m       enableStreaming: false,
        [7m  [0m [96m~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
        [7m35[0m     },
        [7m  [0m [96m~~~~~[0m
        The expected type comes from property 'features' which is declared here on type 'Partial<{ endpoint: string; retries: number; features: { enableCaching: boolean; enableStreaming: boolean; }; database: { host: string; password: { __secretRef: { provider: string; key: string; }; }; }; }>'

/Users/brianlong/Developer/summit/server/src/services/ticket-links.ts:22
    if (runExists.rows.length === 0) {
                  ^

TypeError: Cannot read properties of undefined (reading 'rows')
    at addTicketRunLink (/Users/brianlong/Developer/summit/server/src/services/ticket-links.ts:36:17)

Node.js v20.19.5
# Python tests if present
bash: line 1: warning: here-document at line 1 delimited by end-of-file (wanted `PY')
bash: -c: line 2: syntax error: unexpected end of file from `if' command on line 1
make: *** [smoke] Error 2
