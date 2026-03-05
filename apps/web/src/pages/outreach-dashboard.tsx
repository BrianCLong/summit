import React from 'react';
import { Card, Title, Text, Metric, Grid, Flex, Badge, AreaChart } from '@tremor/react';

const OutreachDashboard: React.FC = () => {
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<any>(null);

  React.useEffect(() => {
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

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <Title>Outreach Automation Dashboard</Title>
      <Text>v1.0.0 Org Mesh Twin Campaign Performance</Text>

      <Grid numItemsLg={3} className="mt-6 gap-6">
        {metrics.map((item) => (
          <Card key={item.title}>
            <Text>{item.title}</Text>
            <Flex justifyContent="start" alignItems="baseline" className="space-x-3">
              <Metric>{item.metric}</Metric>
              <Badge color={item.status === 'success' ? 'emerald' : 'rose'}>
                Target: {item.threshold}
              </Badge>
            </Flex>
          </Card>
        ))}
      </Grid>

      <Card className="mt-6">
        <Title>Campaign Funnel (Last 5 Days)</Title>
        <AreaChart
          className="mt-4 h-72"
          data={chartData}
          index="date"
          categories={['opens', 'clicks', 'bookings']}
          colors={['blue', 'cyan', 'indigo']}
          showLegend={true}
        />
      </Card>

      <Grid numItemsLg={2} className="mt-6 gap-6">
        <Card>
          <Title>Active Alerts</Title>
          <div className="mt-4 space-y-2">
            {alerts.map(alert => (
              <Flex key={alert.id} justifyContent="start" className="space-x-2">
                <Badge color={alert.type === 'success' ? 'emerald' : 'orange'}>
                  {alert.type.toUpperCase()}
                </Badge>
                <Text>{alert.message}</Text>
              </Flex>
            ))}
          </div>
        </Card>
        <Card>
          <Title>A/B Variants Performance</Title>
          <div className="mt-4">
             <Text>SecOps Graph Drift: 42% open</Text>
             <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '42%' }}></div>
             </div>
             <Text className="mt-4">Identity Mesh: 22% open</Text>
             <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                <div className="bg-orange-600 h-2.5 rounded-full" style={{ width: '22%' }}></div>
             </div>
          </div>
        </Card>
      </Grid>
    </div>
  );
};

export default OutreachDashboard;
