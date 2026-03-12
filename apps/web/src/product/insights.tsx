import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { BarChart, List, AlertCircle, PlusCircle } from 'lucide-react';

interface ProductInsight {
  id: string;
  type: string;
  summary: string;
  tenantCount: number;
  priority: 'low' | 'medium' | 'high';
}

/**
 * Product Insights Dashboard
 * Visualizes feature requests and insights harvested by the Feedback Loop Agent.
 */
export const ProductInsightsDashboard: React.FC = () => {
  // In production, this would be fetched from IntelGraph via an API hook
  const [insights] = React.useState<ProductInsight[]>([
    { id: '1', type: 'feature-request', summary: 'Multi-cloud support', tenantCount: 12, priority: 'high' },
    { id: '2', type: 'performance', summary: 'Latency in agent handoff', tenantCount: 5, priority: 'medium' },
    { id: '3', type: 'feature-request', summary: 'Real-time dashboard', tenantCount: 8, priority: 'high' },
    { id: '4', type: 'drift-anomaly', summary: 'Policy drift in tenant clusters', tenantCount: 3, priority: 'high' },
  ]);

  const handleAutoIssue = (insight: ProductInsight) => {
    console.log(`Creating auto-issue for: ${insight.summary}`);
    // Simulate API call to Maestro Conductor
    alert(`Auto-issue created: "Top req: ${insight.summary} from ${insight.tenantCount} tenants."`);
  };

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-50 flex items-center gap-2">
          <BarChart className="h-6 w-6 text-emerald-400" />
          Product Insights & Evolution
        </h1>
        <Badge variant="outline" className="text-emerald-400 border-emerald-400/30 bg-emerald-400/10">
          Agent Loop Active
        </Badge>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {insights.sort((a, b) => b.tenantCount - a.tenantCount).map((insight) => (
          <Card key={insight.id} className="bg-slate-900 border-slate-800 shadow-lg">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <Badge variant={insight.priority === 'high' ? 'destructive' : 'default'}>
                  {insight.priority.toUpperCase()}
                </Badge>
                <span className="text-slate-400 text-xs flex items-center gap-1">
                  <List className="h-3 w-3" />
                  {insight.tenantCount} tenants
                </span>
              </div>
              <CardTitle className="text-lg mt-2 text-slate-100">{insight.summary}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-400 mb-4">
                Automated signal harvesting identified this as a {insight.type.replace('-', ' ')}.
              </p>
              <Button
                onClick={() => handleAutoIssue(insight)}
                variant="outline"
                size="sm"
                className="w-full gap-2 border-emerald-500/50 hover:bg-emerald-500/10 text-emerald-400"
              >
                <PlusCircle className="h-4 w-4" />
                Auto-issue GitHub
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-slate-900/50 border-slate-800 border-dashed">
        <CardContent className="flex flex-col items-center py-12 text-center">
          <AlertCircle className="h-12 w-12 text-slate-600 mb-4" />
          <h3 className="text-slate-300 font-medium">Feedback Loop Engine</h3>
          <p className="text-slate-500 text-sm max-w-md mt-2">
            Jules is currently harvesting signals from trials and usage anomalies to auto-improve the Summit roadmap.
          </p>
          <div className="mt-6 flex gap-4">
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-slate-200">92%</span>
              <span className="text-[10px] uppercase text-slate-500 font-semibold tracking-wider">Signal Accuracy</span>
            </div>
            <div className="w-px h-8 bg-slate-800" />
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-slate-200">2.4h</span>
              <span className="text-[10px] uppercase text-slate-500 font-semibold tracking-wider">Cycle Time</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductInsightsDashboard;
