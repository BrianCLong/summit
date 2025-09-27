import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '../ToastContainer';

interface AnalyticsMetric {
  id: string;
  name: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  unit: string;
  description: string;
}

interface ChartData {
  timestamp: number;
  value: number;
  label?: string;
}

interface AnalyticsWidget {
  id: string;
  title: string;
  type: 'metric' | 'chart' | 'table' | 'graph';
  size: 'small' | 'medium' | 'large';
  data: any;
  refreshRate?: number; // in seconds
}

interface AdvancedAnalyticsDashboardProps {
  investigationId?: string;
  timeRange?: '1h' | '24h' | '7d' | '30d';
  className?: string;
}

const AdvancedAnalyticsDashboard: React.FC<AdvancedAnalyticsDashboardProps> = ({
  investigationId,
  timeRange = '24h',
  className = ''
}) => {
  const [widgets, setWidgets] = useState<AnalyticsWidget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  const refreshIntervalRef = useRef<NodeJS.Timeout>();
  const chartRefs = useRef<{ [key: string]: HTMLCanvasElement | null }>({});
  const toast = useToast();

  // Initialize dashboard with mock analytics data
  useEffect(() => {
    loadAnalyticsData();
    
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        loadAnalyticsData(true); // Silent refresh
        setLastUpdated(new Date());
      }, 30000); // Refresh every 30 seconds
    }
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [selectedTimeRange, autoRefresh, investigationId]);

  const loadAnalyticsData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const mockWidgets: AnalyticsWidget[] = [
        {
          id: 'entities-processed',
          title: 'Entities Processed',
          type: 'metric',
          size: 'small',
          data: {
            value: 1247,
            change: 12.3,
            trend: 'up',
            unit: 'entities',
            description: 'Total entities analyzed in selected time range'
          }
        },
        {
          id: 'confidence-score',
          title: 'Average Confidence',
          type: 'metric',
          size: 'small',
          data: {
            value: 87.4,
            change: -2.1,
            trend: 'down',
            unit: '%',
            description: 'Average confidence score across all analyses'
          }
        },
        {
          id: 'investigations-active',
          title: 'Active Investigations',
          type: 'metric',
          size: 'small',
          data: {
            value: 23,
            change: 0,
            trend: 'stable',
            unit: 'cases',
            description: 'Currently active investigation cases'
          }
        },
        {
          id: 'threat-level',
          title: 'Threat Level',
          type: 'metric',
          size: 'small',
          data: {
            value: 6.8,
            change: 1.2,
            trend: 'up',
            unit: '/10',
            description: 'Current overall threat assessment level'
          }
        },
        {
          id: 'activity-timeline',
          title: 'Analysis Activity',
          type: 'chart',
          size: 'large',
          data: generateTimeSeriesData(24, selectedTimeRange)
        },
        {
          id: 'entity-distribution',
          title: 'Entity Type Distribution',
          type: 'chart',
          size: 'medium',
          data: {
            type: 'pie',
            labels: ['Persons', 'Organizations', 'IP Addresses', 'Emails', 'Documents', 'URLs'],
            values: [342, 189, 156, 234, 87, 239],
            colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4']
          }
        },
        {
          id: 'top-entities',
          title: 'High Priority Entities',
          type: 'table',
          size: 'medium',
          data: {
            headers: ['Entity', 'Type', 'Confidence', 'Risk Score', 'Investigations'],
            rows: [
              ['john.doe@suspicious.com', 'Email', '94%', '8.2', '3'],
              ['192.168.1.100', 'IP Address', '91%', '7.8', '2'],
              ['APT Group Alpha', 'Organization', '89%', '9.1', '5'],
              ['malware.exe', 'File', '96%', '8.7', '1'],
              ['darknet-forum.onion', 'URL', '88%', '7.3', '4']
            ]
          }
        },
        {
          id: 'network-topology',
          title: 'Network Analysis',
          type: 'graph',
          size: 'large',
          data: {
            nodes: generateNetworkNodes(20),
            edges: generateNetworkEdges(35),
            metrics: {
              density: 0.23,
              clustering: 0.67,
              centrality: 'john.doe@suspicious.com'
            }
          }
        }
      ];
      
      setWidgets(mockWidgets);
      
      if (!silent) {
        toast.success('Analytics Updated', 'Dashboard data refreshed successfully');
      }
      
    } catch (error) {
      console.error('Failed to load analytics:', error);
      toast.error('Analytics Error', 'Failed to load dashboard data');
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const generateTimeSeriesData = (points: number, range: string): ChartData[] => {
    const now = Date.now();
    const intervals = {
      '1h': 60 * 1000, // 1 minute intervals
      '24h': 60 * 60 * 1000, // 1 hour intervals
      '7d': 6 * 60 * 60 * 1000, // 6 hour intervals
      '30d': 24 * 60 * 60 * 1000 // 1 day intervals
    };
    
    const interval = intervals[range as keyof typeof intervals];
    const data: ChartData[] = [];
    
    for (let i = points - 1; i >= 0; i--) {
      data.push({
        timestamp: now - (i * interval),
        value: Math.floor(Math.random() * 100) + 50,
        label: new Date(now - (i * interval)).toLocaleTimeString()
      });
    }
    
    return data;
  };

  const generateNetworkNodes = (count: number) => {
    const types = ['person', 'organization', 'ip', 'email', 'file'];
    const nodes = [];
    
    for (let i = 0; i < count; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      nodes.push({
        id: `node-${i}`,
        label: `${type}-${i}`,
        type,
        size: Math.random() * 20 + 10,
        risk: Math.random() * 10,
        x: Math.random() * 400,
        y: Math.random() * 300
      });
    }
    
    return nodes;
  };

  const generateNetworkEdges = (count: number) => {
    const edges = [];
    
    for (let i = 0; i < count; i++) {
      edges.push({
        id: `edge-${i}`,
        source: `node-${Math.floor(Math.random() * 20)}`,
        target: `node-${Math.floor(Math.random() * 20)}`,
        weight: Math.random(),
        type: ['communication', 'financial', 'location', 'association'][Math.floor(Math.random() * 4)]
      });
    }
    
    return edges;
  };

  const renderMetricWidget = (widget: AnalyticsWidget) => {
    const data = widget.data;
    const trendIcon = data.trend === 'up' ? '📈' : data.trend === 'down' ? '📉' : '➡️';
    const trendColor = data.trend === 'up' ? 'text-green-600' : data.trend === 'down' ? 'text-red-600' : 'text-gray-600';
    
    return (
      <div className="p-6 bg-white rounded-lg border shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-900">{widget.title}</h3>
          <span className="text-lg">{trendIcon}</span>
        </div>
        
        <div className="mb-2">
          <div className="text-2xl font-bold text-gray-900">
            {data.value.toLocaleString()}{data.unit}
          </div>
          <div className={`text-sm flex items-center gap-1 ${trendColor}`}>
            {data.change !== 0 && (
              <>
                <span>{data.change > 0 ? '+' : ''}{data.change}%</span>
                <span className="text-gray-500">vs previous period</span>
              </>
            )}
          </div>
        </div>
        
        <p className="text-xs text-gray-500">{data.description}</p>
      </div>
    );
  };

  const renderChartWidget = (widget: AnalyticsWidget) => {
    return (
      <div className="p-6 bg-white rounded-lg border shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-900">{widget.title}</h3>
          <button className="text-gray-400 hover:text-gray-600">⚙️</button>
        </div>
        
        <div className="h-40 bg-gray-50 rounded flex items-center justify-center">
          {widget.data.type === 'pie' ? (
            <div className="text-center">
              <div className="text-3xl mb-2">📊</div>
              <div className="text-sm text-gray-600">Pie Chart Visualization</div>
              <div className="mt-2 text-xs text-gray-500">
                {widget.data.labels.length} categories
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-3xl mb-2">📈</div>
              <div className="text-sm text-gray-600">Time Series Chart</div>
              <div className="mt-2 text-xs text-gray-500">
                {widget.data.length} data points
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTableWidget = (widget: AnalyticsWidget) => {
    const data = widget.data;
    
    return (
      <div className="p-6 bg-white rounded-lg border shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-900">{widget.title}</h3>
          <button className="text-gray-400 hover:text-gray-600">↗️</button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                {data.headers.map((header: string, i: number) => (
                  <th key={i} className="text-left py-2 px-3 font-medium text-gray-900">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row: string[], i: number) => (
                <tr key={i} className="border-b hover:bg-gray-50">
                  {row.map((cell, j) => (
                    <td key={j} className="py-2 px-3 text-gray-700">
                      {j === 2 || j === 3 ? ( // Confidence and Risk Score columns
                        <span className={`font-medium ${
                          parseFloat(cell) > 90 || parseFloat(cell) > 8 ? 'text-red-600' :
                          parseFloat(cell) > 80 || parseFloat(cell) > 6 ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {cell}
                        </span>
                      ) : (
                        cell
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderGraphWidget = (widget: AnalyticsWidget) => {
    const data = widget.data;
    
    return (
      <div className="p-6 bg-white rounded-lg border shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-900">{widget.title}</h3>
          <div className="flex gap-2">
            <button className="text-gray-400 hover:text-gray-600" title="Fullscreen">🔍</button>
            <button className="text-gray-400 hover:text-gray-600" title="Export">📤</button>
          </div>
        </div>
        
        <div className="h-64 bg-gray-50 rounded relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-3">🕸️</div>
              <div className="text-sm text-gray-600 mb-2">Network Graph Visualization</div>
              <div className="text-xs text-gray-500 space-y-1">
                <div>Nodes: {data.nodes.length} | Edges: {data.edges.length}</div>
                <div>Density: {data.metrics.density} | Clustering: {data.metrics.clustering}</div>
                <div>Central Entity: {data.metrics.centrality}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderWidget = (widget: AnalyticsWidget) => {
    switch (widget.type) {
      case 'metric': return renderMetricWidget(widget);
      case 'chart': return renderChartWidget(widget);
      case 'table': return renderTableWidget(widget);
      case 'graph': return renderGraphWidget(widget);
      default: return null;
    }
  };

  const getGridCols = (size: string) => {
    switch (size) {
      case 'small': return 'lg:col-span-1';
      case 'medium': return 'lg:col-span-2';
      case 'large': return 'lg:col-span-3';
      default: return 'lg:col-span-1';
    }
  };

  if (isLoading && widgets.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-gray-600">Loading analytics dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`analytics-dashboard ${className}`}>
      {/* Dashboard Controls */}
      <div className="flex items-center justify-between mb-6 bg-white p-4 rounded-lg border shadow-sm">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900">Advanced Analytics</h2>
          {investigationId && (
            <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
              {investigationId}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          {/* Time Range Selector */}
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          
          {/* Auto-refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-2 text-sm rounded-lg border ${
              autoRefresh
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-gray-50 text-gray-600 border-gray-200'
            }`}
          >
            🔄 Auto-refresh
          </button>
          
          {/* Manual Refresh */}
          <button
            onClick={() => loadAnalyticsData()}
            disabled={isLoading}
            className="px-3 py-2 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            ↻ Refresh
          </button>
          
          {/* Export Dashboard */}
          <button
            onClick={() => toast.info('Export', 'Dashboard export functionality coming soon')}
            className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            📊 Export
          </button>
        </div>
      </div>

      {/* Last Updated */}
      <div className="mb-4 text-right">
        <span className="text-xs text-gray-500">
          Last updated: {lastUpdated.toLocaleTimeString()}
          {autoRefresh && <span className="ml-2">• Auto-refresh enabled</span>}
        </span>
      </div>

      {/* Widgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {widgets.map((widget) => (
          <div key={widget.id} className={getGridCols(widget.size)}>
            {renderWidget(widget)}
          </div>
        ))}
      </div>

      {/* Export Modal or Additional Features */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center gap-3">
          <div className="text-blue-600 text-lg">💡</div>
          <div>
            <div className="text-sm font-medium text-blue-900">Pro Tip</div>
            <div className="text-sm text-blue-700">
              Click on widgets to drill down into detailed views. Use Ctrl+click to open in a new tab.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedAnalyticsDashboard;