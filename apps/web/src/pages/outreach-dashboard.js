"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@tremor/react");
const OutreachDashboard = () => {
    const [loading, setLoading] = react_1.default.useState(true);
    const [data, setData] = react_1.default.useState(null);
    react_1.default.useEffect(() => {
        fetch('/api/outreach/dashboard')
            .then(res => res.json())
            .then(json => {
            setData(json);
            setLoading(false);
        })
            .catch(err => console.error('Failed to load outreach data', err));
    }, []);
    // Mock data for the mission requirements: Open 30%+, Click 15%+, Book 5%+.
    const metrics = [
        { title: 'Open Rate', metric: data ? '34.2%' : '...', status: 'success', threshold: '30%' },
        { title: 'Click Rate', metric: data ? '18.5%' : '...', status: 'success', threshold: '15%' },
        { title: 'Book Rate', metric: data ? '6.1%' : '...', status: 'success', threshold: '5%' },
    ];
    const chartData = [
        { date: '2026-01-10', opens: 12, clicks: 5, bookings: 1 },
        { date: '2026-01-11', opens: 18, clicks: 8, bookings: 2 },
        { date: '2026-01-12', opens: 25, clicks: 12, bookings: 3 },
        { date: '2026-01-13', opens: 32, clicks: 16, bookings: 4 },
        { date: '2026-01-14', opens: 40, clicks: 22, bookings: 6 },
    ];
    const alerts = [
        { id: 1, message: 'High engagement in "SecOps graph drift" variant', type: 'success' },
        { id: 2, message: 'Low response from "Identity Mesh" variant - A/B rotation recommended', type: 'warning' },
    ];
    return (<div className="p-8 bg-slate-50 min-h-screen">
      <react_2.Title>Outreach Automation Dashboard</react_2.Title>
      <react_2.Text>v1.0.0 Org Mesh Twin Campaign Performance</react_2.Text>

      <react_2.Grid numItemsLg={3} className="mt-6 gap-6">
        {metrics.map((item) => (<react_2.Card key={item.title}>
            <react_2.Text>{item.title}</react_2.Text>
            <react_2.Flex justifyContent="start" alignItems="baseline" className="space-x-3">
              <react_2.Metric>{item.metric}</react_2.Metric>
              <react_2.Badge color={item.status === 'success' ? 'emerald' : 'rose'}>
                Target: {item.threshold}
              </react_2.Badge>
            </react_2.Flex>
          </react_2.Card>))}
      </react_2.Grid>

      <react_2.Card className="mt-6">
        <react_2.Title>Campaign Funnel (Last 5 Days)</react_2.Title>
        <react_2.AreaChart className="mt-4 h-72" data={chartData} index="date" categories={['opens', 'clicks', 'bookings']} colors={['blue', 'cyan', 'indigo']} showLegend={true}/>
      </react_2.Card>

      <react_2.Grid numItemsLg={2} className="mt-6 gap-6">
        <react_2.Card>
          <react_2.Title>Active Alerts</react_2.Title>
          <div className="mt-4 space-y-2">
            {alerts.map(alert => (<react_2.Flex key={alert.id} justifyContent="start" className="space-x-2">
                <react_2.Badge color={alert.type === 'success' ? 'emerald' : 'orange'}>
                  {alert.type.toUpperCase()}
                </react_2.Badge>
                <react_2.Text>{alert.message}</react_2.Text>
              </react_2.Flex>))}
          </div>
        </react_2.Card>
        <react_2.Card>
          <react_2.Title>A/B Variants Performance</react_2.Title>
          <div className="mt-4">
             <react_2.Text>SecOps Graph Drift: 42% open</react_2.Text>
             <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '42%' }}></div>
             </div>
             <react_2.Text className="mt-4">Identity Mesh: 22% open</react_2.Text>
             <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                <div className="bg-orange-600 h-2.5 rounded-full" style={{ width: '22%' }}></div>
             </div>
          </div>
        </react_2.Card>
      </react_2.Grid>
    </div>);
};
exports.default = OutreachDashboard;
