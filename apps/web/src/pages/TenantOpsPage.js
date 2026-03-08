"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TenantOpsPage;
const react_1 = __importDefault(require("react"));
const react_2 = require("@tremor/react");
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
function TenantOpsPage() {
    return (<div className="p-8 max-w-7xl mx-auto">
      <react_2.Title>Tenant Operations: Acme Corp</react_2.Title>
      <react_2.Text>Overview of system performance and cost attribution.</react_2.Text>

      <react_2.Grid numItemsSm={2} numItemsLg={3} className="gap-6 mt-6">
        <react_2.Card>
          <react_2.Flex alignItems="start">
            <div className="truncate">
              <react_2.Text>Total Cost (MTD)</react_2.Text>
              <react_2.Metric>$ 1,230.50</react_2.Metric>
            </div>
            <react_2.BadgeDelta deltaType="increase">12%</react_2.BadgeDelta>
          </react_2.Flex>
          <react_2.Flex className="mt-4 space-x-2">
            <div className="truncate">
              <react_2.Text>Previous Month</react_2.Text>
              <react_2.Text>$ 1,098.00</react_2.Text>
            </div>
          </react_2.Flex>
        </react_2.Card>

        <react_2.Card>
          <react_2.Flex alignItems="start">
            <div className="truncate">
              <react_2.Text>Avg Latency (p95)</react_2.Text>
              <react_2.Metric>145ms</react_2.Metric>
            </div>
            <react_2.BadgeDelta deltaType="decrease">-5%</react_2.BadgeDelta>
          </react_2.Flex>
           <react_2.Flex className="mt-4 space-x-2">
            <div className="truncate">
              <react_2.Text>SLO Target</react_2.Text>
              <react_2.Text>200ms</react_2.Text>
            </div>
          </react_2.Flex>
        </react_2.Card>

        <react_2.Card>
          <react_2.Flex alignItems="start">
            <div className="truncate">
              <react_2.Text>Error Rate</react_2.Text>
              <react_2.Metric>0.02%</react_2.Metric>
            </div>
            <react_2.BadgeDelta deltaType="unchanged">0%</react_2.BadgeDelta>
          </react_2.Flex>
           <react_2.Flex className="mt-4 space-x-2">
            <div className="truncate">
              <react_2.Text>SLO Target</react_2.Text>
              <react_2.Text>&lt; 0.1%</react_2.Text>
            </div>
          </react_2.Flex>
        </react_2.Card>
      </react_2.Grid>

      <div className="mt-6">
        <react_2.Card>
          <react_2.Title>Cost Attribution by Service</react_2.Title>
          <react_2.AreaChart className="h-72 mt-4" data={chartdata} index="date" categories={['SemiAnalysis', 'The Pragmatic Engineer']} colors={['indigo', 'cyan']}/>
        </react_2.Card>
      </div>

      <div className="mt-6">
        <react_2.Card>
          <react_2.Title>Top Endpoints by Volume</react_2.Title>
          <react_2.Flex className="mt-4">
            <react_2.Text>
              <span className="font-bold">Endpoint</span>
            </react_2.Text>
            <react_2.Text>
              <span className="font-bold">Requests</span>
            </react_2.Text>
          </react_2.Flex>
          <react_2.BarList data={data} className="mt-2"/>
        </react_2.Card>
      </div>
    </div>);
}
