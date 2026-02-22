import React from 'react';
import { Card, Metric, Text, Title, BarList, Grid, Flex, BadgeDelta, AreaChart } from '@tremor/react';

const chartdata = [
  { date: 'Jan 22', SemiAnalysis: 2890, 'The Pragmatic Engineer': 2338 },
  { date: 'Feb 22', SemiAnalysis: 2756, 'The Pragmatic Engineer': 2103 },
  { date: 'Mar 22', SemiAnalysis: 3322, 'The Pragmatic Engineer': 2194 },
  { date: 'Apr 22', SemiAnalysis: 3470, 'The Pragmatic Engineer': 2108 },
  { date: 'May 22', SemiAnalysis: 3475, 'The Pragmatic Engineer': 1812 },
  { date: 'Jun 22', SemiAnalysis: 3129, 'The Pragmatic Engineer': 1726 },
];

const categories = [
  { title: 'Sales', metric: '$ 12,699', metricPrev: '$ 9,456', delta: '34.3%', deltaType: 'moderateIncrease' },
  { title: 'Profit', metric: '$ 40,598', metricPrev: '$ 45,564', delta: '10.9%', deltaType: 'moderateDecrease' },
  { title: 'Customers', metric: '1,072', metricPrev: '856', delta: '25.3%', deltaType: 'moderateIncrease' },
];

const data = [
  { name: '/api/v1/approvals', value: 456 },
  { name: '/api/v1/preflight', value: 351 },
  { name: '/api/v1/search', value: 271 },
  { name: '/api/v1/receipts', value: 191 },
];

export default function TenantOpsPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <Title>Tenant Operations: Acme Corp</Title>
      <Text>Overview of system performance and cost attribution.</Text>

      <Grid numItemsSm={2} numItemsLg={3} className="gap-6 mt-6">
        <Card>
          <Flex alignItems="start">
            <div className="truncate">
              <Text>Total Cost (MTD)</Text>
              <Metric>$ 1,230.50</Metric>
            </div>
            <BadgeDelta deltaType="increase">12%</BadgeDelta>
          </Flex>
          <Flex className="mt-4 space-x-2">
            <div className="truncate">
              <Text>Previous Month</Text>
              <Text>$ 1,098.00</Text>
            </div>
          </Flex>
        </Card>

        <Card>
          <Flex alignItems="start">
            <div className="truncate">
              <Text>Avg Latency (p95)</Text>
              <Metric>145ms</Metric>
            </div>
            <BadgeDelta deltaType="decrease">-5%</BadgeDelta>
          </Flex>
           <Flex className="mt-4 space-x-2">
            <div className="truncate">
              <Text>SLO Target</Text>
              <Text>200ms</Text>
            </div>
          </Flex>
        </Card>

        <Card>
          <Flex alignItems="start">
            <div className="truncate">
              <Text>Error Rate</Text>
              <Metric>0.02%</Metric>
            </div>
            <BadgeDelta deltaType="unchanged">0%</BadgeDelta>
          </Flex>
           <Flex className="mt-4 space-x-2">
            <div className="truncate">
              <Text>SLO Target</Text>
              <Text>&lt; 0.1%</Text>
            </div>
          </Flex>
        </Card>
      </Grid>

      <div className="mt-6">
        <Card>
          <Title>Cost Attribution by Service</Title>
          <AreaChart
            className="h-72 mt-4"
            data={chartdata}
            index="date"
            categories={['SemiAnalysis', 'The Pragmatic Engineer']}
            colors={['indigo', 'cyan']}
          />
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <Title>Top Endpoints by Volume</Title>
          <Flex className="mt-4">
            <Text>
              <span className="font-bold">Endpoint</span>
            </Text>
            <Text>
              <span className="font-bold">Requests</span>
            </Text>
          </Flex>
          <BarList data={data} className="mt-2" />
        </Card>
      </div>
    </div>
  );
}
++ b/client/jest.config.cjs
     '^@emotion/styled$': '<rootDir>/../node_modules/@emotion/styled',
   },
   transform: {
-    '^.+\\.(ts|tsx)$': ['ts-jest', {
    '^.+\\.(ts|tsx)$': ["ts-jest", {
       useESM: true,
       tsconfig: {
         jsx: 'react-jsx',
++ b/docs/roadmap/STATUS.json
     "total": 16,
     "ga_blockers": []
   }
-}
\ No newline at end of file
}
++ b/evidence/index.json
         "stamp": "evidence/EVD-INTSUM-2026-THREAT-HORIZON-001/stamp.json"
       }
     },
-    {
    "EVD-NARRATIVE-CI-METRICS-001": {
       "evidence_id": "EVD-NARRATIVE-CI-METRICS-001",
       "files": {
         "report": "evidence/EVD-NARRATIVE-CI-METRICS-001/report.json",
++ b/package.json
     "investigation"
   ],
   "author": "IntelGraph Team",
  "packageManager": "pnpm@10.0.0",
   "license": "MIT",
   "engines": {
     "node": ">=18.18",
     "typescript-eslint": "^8.50.1",
     "uuid": "^13.0.0",
     "vitest": "^4.0.16",
-    "zod": "^4.2.1"
    "zod": "^4.2.1",
    "@types/hapi__catbox": "^10.2.6",
    "@types/hapi__shot": "^4.1.6"
   },
   "lint-staged": {
     "server/**/*.{ts,js}": [
       "ignoreCves": []
     },
     "overrides": {
      "@electron/node-gyp": "10.2.0-electron.1",
       "entities": "^4.5.0",
       "d3-color": ">=3.1.0",
       "node-fetch": ">=2.6.7",
++ b/pnpm-lock.yaml
   excludeLinksFromLockfile: false

 overrides:
  '@electron/node-gyp': 10.2.0-electron.1
   entities: ^4.5.0
   d3-color: '>=3.1.0'
   node-fetch: '>=2.6.7'
       '@semantic-release/npm':
         specifier: ^12.0.2
         version: 12.0.2(semantic-release@24.2.9(typescript@5.9.3))
      '@types/hapi__catbox':
        specifier: ^10.2.6
        version: 10.2.6
      '@types/hapi__shot':
        specifier: ^4.1.6
        version: 4.1.6
       '@types/jest':
         specifier: ^29.5.14
         version: 29.5.14
         version: 30.2.0(@types/node@20.19.27)(babel-plugin-macros@3.1.0)(esbuild-register@3.6.0(esbuild@0.27.2))(ts-node@10.9.2(@swc/core@1.15.3(@swc/helpers@0.5.17))(@types/node@20.19.27)(typescript@5.9.3))
       ts-jest:
         specifier: ^29.4.5
-        version: 29.4.6(@babel/core@7.29.0)(@jest/transform@30.2.0)(@jest/types@30.2.0)(babel-jest@30.2.0(@babel/core@7.29.0))(esbuild@0.27.2)(jest-util@30.2.0)(jest@30.2.0(@types/node@20.19.27)(babel-plugin-macros@3.1.0)(esbuild-register@3.6.0(esbuild@0.27.2))(ts-node@10.9.2(@swc/core@1.15.3(@swc/helpers@0.5.17))(@types/node@20.19.27)(typescript@5.9.3)))(typescript@5.9.3)
        version: 29.4.6(@babel/core@7.28.5)(@jest/transform@30.2.0)(@jest/types@30.2.0)(babel-jest@30.2.0(@babel/core@7.28.5))(esbuild@0.27.2)(jest-util@30.2.0)(jest@30.2.0(@types/node@20.19.27)(babel-plugin-macros@3.1.0)(esbuild-register@3.6.0(esbuild@0.27.2))(ts-node@10.9.2(@swc/core@1.15.3(@swc/helpers@0.5.17))(@types/node@20.19.27)(typescript@5.9.3)))(typescript@5.9.3)
       tsx:
         specifier: ^4.6.2
         version: 4.21.0
         version: 7.1.4
       ts-jest:
