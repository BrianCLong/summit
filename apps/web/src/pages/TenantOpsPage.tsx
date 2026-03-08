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
