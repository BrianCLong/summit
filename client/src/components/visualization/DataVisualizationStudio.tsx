import React, { useState, useEffect } from 'react';

interface ChartConfig {
  id: string;
  title: string;
  type:
    | 'bar'
    | 'line'
    | 'scatter'
    | 'heatmap'
    | 'sankey'
    | 'treemap'
    | 'network'
    | 'timeline'
    | 'geographic'
    | 'radar';
  dataSource: string;
  fields: {
    x?: string;
    y?: string;
    category?: string;
    size?: string;
    color?: string;
    time?: string;
    location?: string;
  };
  filters: Array<{
    field: string;
    operator: 'equals' | 'contains' | 'greater' | 'less' | 'between' | 'in';
    value: any;
  }>;
  styling: {
    colorScheme: 'category' | 'sequential' | 'diverging' | 'custom';
    colors?: string[];
    size: { width: number; height: number };
    margins: { top: number; right: number; bottom: number; left: number };
  };
}

interface DataSource {
  id: string;
  name: string;
  type:
    | 'entities'
    | 'relationships'
    | 'events'
    | 'metrics'
    | 'logs'
    | 'external';
  fields: Array<{
    name: string;
    type: 'string' | 'number' | 'date' | 'boolean' | 'category';
    description: string;
  }>;
  recordCount: number;
  lastUpdated: Date;
}

interface VisualizationTemplate {
  id: string;
  name: string;
  description: string;
  category:
    | 'threat-intel'
    | 'network-analysis'
    | 'temporal'
    | 'geographic'
    | 'financial'
    | 'forensic';
  chartType: ChartConfig['type'];
  presetConfig: Partial<ChartConfig>;
  tags: string[];
}

interface DataVisualizationStudioProps {
  investigationId?: string;
  onChartCreate?: (chart: ChartConfig) => void;
  onChartUpdate?: (chartId: string, chart: ChartConfig) => void;
  onChartDelete?: (chartId: string) => void;
  onExportChart?: (
    chartId: string,
    format: 'png' | 'svg' | 'pdf' | 'json',
  ) => void;
  className?: string;
}

const DataVisualizationStudio: React.FC<DataVisualizationStudioProps> = ({
  investigationId,
  onChartCreate = () => {},
  onChartUpdate = () => {},
  onChartDelete = () => {},
  onExportChart = () => {},
  className = '',
}) => {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [charts, setCharts] = useState<ChartConfig[]>([]);
  const [selectedChart, setSelectedChart] = useState<ChartConfig | null>(null);
  const [isEditingChart, setIsEditingChart] = useState(false);
  const [templates, setTemplates] = useState<VisualizationTemplate[]>([]);
  const [activeView, setActiveView] = useState<
    'gallery' | 'builder' | 'templates'
  >('gallery');
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

  const chartTypes = [
    {
      type: 'bar',
      name: 'Bar Chart',
      icon: '📊',
      description: 'Compare categories',
    },
    {
      type: 'line',
      name: 'Line Chart',
      icon: '📈',
      description: 'Show trends over time',
    },
    {
      type: 'scatter',
      name: 'Scatter Plot',
      icon: '🔍',
      description: 'Explore relationships',
    },
    {
      type: 'heatmap',
      name: 'Heat Map',
      icon: '🔥',
      description: 'Show intensity patterns',
    },
    {
      type: 'sankey',
      name: 'Sankey Diagram',
      icon: '🌊',
      description: 'Flow analysis',
    },
    {
      type: 'treemap',
      name: 'Tree Map',
      icon: '🗂️',
      description: 'Hierarchical data',
    },
    {
      type: 'network',
      name: 'Network Graph',
      icon: '🕸️',
      description: 'Node relationships',
    },
    {
      type: 'timeline',
      name: 'Timeline',
      icon: '⏰',
      description: 'Temporal sequences',
    },
    {
      type: 'geographic',
      name: 'Map',
      icon: '🗺️',
      description: 'Geographic data',
    },
    {
      type: 'radar',
      name: 'Radar Chart',
      icon: '🎯',
      description: 'Multi-dimensional comparison',
    },
  ];

  const colorSchemes = {
    category: [
      '#1f77b4',
      '#ff7f0e',
      '#2ca02c',
      '#d62728',
      '#9467bd',
      '#8c564b',
      '#e377c2',
      '#7f7f7f',
      '#bcbd22',
      '#17becf',
    ],
    sequential: [
      '#f7fbff',
      '#deebf7',
      '#c6dbef',
      '#9ecae1',
      '#6baed6',
      '#4292c6',
      '#2171b5',
      '#08519c',
      '#08306b',
    ],
    diverging: [
      '#d73027',
      '#f46d43',
      '#fdae61',
      '#fee08b',
      '#ffffbf',
      '#e6f598',
      '#abdda4',
      '#66c2a5',
      '#3288bd',
      '#5e4fa2',
    ],
  };

  useEffect(() => {
    generateMockDataSources();
    generateVisualizationTemplates();
    generateSampleCharts();
  }, [investigationId]);

  const generateMockDataSources = () => {
    const mockDataSources: DataSource[] = [
      {
        id: 'entities',
        name: 'Entities',
        type: 'entities',
        fields: [
          { name: 'type', type: 'category', description: 'Entity type' },
          {
            name: 'confidence',
            type: 'number',
            description: 'Confidence score',
          },
          {
            name: 'risk_level',
            type: 'category',
            description: 'Risk assessment',
          },
          { name: 'created_date', type: 'date', description: 'Creation date' },
          { name: 'frequency', type: 'number', description: 'Frequency count' },
        ],
        recordCount: 1247,
        lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
      {
        id: 'relationships',
        name: 'Relationships',
        type: 'relationships',
        fields: [
          {
            name: 'relationship_type',
            type: 'category',
            description: 'Type of relationship',
          },
          {
            name: 'strength',
            type: 'number',
            description: 'Relationship strength',
          },
          {
            name: 'frequency',
            type: 'number',
            description: 'Interaction frequency',
          },
          { name: 'first_seen', type: 'date', description: 'First observed' },
          { name: 'last_seen', type: 'date', description: 'Last observed' },
        ],
        recordCount: 2156,
        lastUpdated: new Date(Date.now() - 1 * 60 * 60 * 1000),
      },
      {
        id: 'events',
        name: 'Timeline Events',
        type: 'events',
        fields: [
          {
            name: 'event_type',
            type: 'category',
            description: 'Type of event',
          },
          { name: 'severity', type: 'category', description: 'Event severity' },
          { name: 'timestamp', type: 'date', description: 'Event time' },
          {
            name: 'duration',
            type: 'number',
            description: 'Duration in minutes',
          },
          {
            name: 'location',
            type: 'string',
            description: 'Geographic location',
          },
        ],
        recordCount: 3482,
        lastUpdated: new Date(Date.now() - 30 * 60 * 1000),
      },
      {
        id: 'threat_metrics',
        name: 'Threat Metrics',
        type: 'metrics',
        fields: [
          {
            name: 'threat_score',
            type: 'number',
            description: 'Calculated threat score',
          },
          {
            name: 'category',
            type: 'category',
            description: 'Threat category',
          },
          {
            name: 'indicator_count',
            type: 'number',
            description: 'Number of indicators',
          },
          {
            name: 'confidence',
            type: 'number',
            description: 'Assessment confidence',
          },
          {
            name: 'last_updated',
            type: 'date',
            description: 'Last update time',
          },
        ],
        recordCount: 892,
        lastUpdated: new Date(Date.now() - 15 * 60 * 1000),
      },
    ];

    setDataSources(mockDataSources);
  };

  const generateVisualizationTemplates = () => {
    const defaultMargins = {
      top: 24,
      right: 24,
      bottom: 24,
      left: 24,
    };
    const mockTemplates: VisualizationTemplate[] = [
      {
        id: 'threat-overview',
        name: 'Threat Intelligence Overview',
        description:
          'Comprehensive threat landscape visualization with risk levels and categories',
        category: 'threat-intel',
        chartType: 'bar',
        presetConfig: {
          type: 'bar',
          dataSource: 'threat_metrics',
          fields: { x: 'category', y: 'threat_score', color: 'confidence' },
          styling: {
            colorScheme: 'diverging',
            size: { width: 800, height: 400 },
            margins: defaultMargins,
          },
        },
        tags: ['threat', 'overview', 'security'],
      },
      {
        id: 'entity-network',
        name: 'Entity Relationship Network',
        description:
          'Interactive network showing entity connections and relationship strengths',
        category: 'network-analysis',
        chartType: 'network',
        presetConfig: {
          type: 'network',
          dataSource: 'relationships',
          fields: { category: 'relationship_type', size: 'strength' },
          styling: {
            colorScheme: 'category',
            size: { width: 800, height: 600 },
            margins: defaultMargins,
          },
        },
        tags: ['network', 'relationships', 'entities'],
      },
      {
        id: 'temporal-events',
        name: 'Event Timeline Analysis',
        description:
          'Timeline visualization of events with severity and duration analysis',
        category: 'temporal',
        chartType: 'timeline',
        presetConfig: {
          type: 'timeline',
          dataSource: 'events',
          fields: {
            time: 'timestamp',
            category: 'event_type',
            size: 'duration',
            color: 'severity',
          },
          styling: {
            colorScheme: 'sequential',
            size: { width: 1000, height: 300 },
            margins: defaultMargins,
          },
        },
        tags: ['timeline', 'events', 'temporal'],
      },
      {
        id: 'geographic-heatmap',
        name: 'Geographic Activity Heat Map',
        description:
          'Heat map showing geographic distribution of activities and threats',
        category: 'geographic',
        chartType: 'heatmap',
        presetConfig: {
          type: 'heatmap',
          dataSource: 'events',
          fields: { location: 'location', color: 'severity' },
          styling: {
            colorScheme: 'sequential',
            size: { width: 800, height: 500 },
            margins: defaultMargins,
          },
        },
        tags: ['geographic', 'heatmap', 'location'],
      },
      {
        id: 'risk-assessment-radar',
        name: 'Multi-Dimensional Risk Assessment',
        description:
          'Radar chart for comprehensive risk assessment across multiple dimensions',
        category: 'threat-intel',
        chartType: 'radar',
        presetConfig: {
          type: 'radar',
          dataSource: 'entities',
          fields: { category: 'type', y: 'confidence', color: 'risk_level' },
          styling: {
            colorScheme: 'diverging',
            size: { width: 500, height: 500 },
            margins: defaultMargins,
          },
        },
        tags: ['risk', 'assessment', 'multi-dimensional'],
      },
    ];

    setTemplates(mockTemplates);
  };

  const generateSampleCharts = () => {
    const sampleCharts: ChartConfig[] = [
      {
        id: 'chart-1',
        title: 'Entity Types Distribution',
        type: 'bar',
        dataSource: 'entities',
        fields: { x: 'type', y: 'frequency', color: 'risk_level' },
        filters: [],
        styling: {
          colorScheme: 'category',
          size: { width: 600, height: 400 },
          margins: { top: 20, right: 30, bottom: 40, left: 50 },
        },
      },
      {
        id: 'chart-2',
        title: 'Threat Score Trends',
        type: 'line',
        dataSource: 'threat_metrics',
        fields: { x: 'last_updated', y: 'threat_score', category: 'category' },
        filters: [],
        styling: {
          colorScheme: 'category',
          size: { width: 800, height: 300 },
          margins: { top: 20, right: 30, bottom: 60, left: 50 },
        },
      },
    ];

    setCharts(sampleCharts);
  };

  const createNewChart = (template?: VisualizationTemplate) => {
    const newChart: ChartConfig = {
      id: `chart-${Date.now()}`,
      title: template ? template.name : 'New Visualization',
      type: template?.chartType || 'bar',
      dataSource: template?.presetConfig.dataSource || dataSources[0]?.id || '',
      fields: template?.presetConfig.fields || {},
      filters: [],
      styling: {
        colorScheme: 'category',
        size: { width: 600, height: 400 },
        margins: { top: 20, right: 30, bottom: 40, left: 50 },
        ...template?.presetConfig.styling,
      },
    };

    setSelectedChart(newChart);
    setIsEditingChart(true);
    setActiveView('builder');
    generatePreviewData(newChart);
  };

  const generatePreviewData = async (chart: ChartConfig) => {
    setIsGeneratingPreview(true);

    // Simulate data generation delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const mockData = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      category: `Category ${String.fromCharCode(65 + (i % 5))}`,
      value: Math.random() * 100,
      timestamp: new Date(Date.now() - (50 - i) * 24 * 60 * 60 * 1000),
      risk: ['low', 'medium', 'high', 'critical'][
        Math.floor(Math.random() * 4)
      ],
      confidence: Math.random() * 100,
    }));

    setPreviewData(mockData);
    setIsGeneratingPreview(false);
  };

  const saveChart = () => {
    if (selectedChart) {
      if (charts.find((c) => c.id === selectedChart.id)) {
        setCharts((prev) =>
          prev.map((c) => (c.id === selectedChart.id ? selectedChart : c)),
        );
        onChartUpdate(selectedChart.id, selectedChart);
      } else {
        setCharts((prev) => [...prev, selectedChart]);
        onChartCreate(selectedChart);
      }
      setIsEditingChart(false);
    }
  };

  const deleteChart = (chartId: string) => {
    setCharts((prev) => prev.filter((c) => c.id !== chartId));
    onChartDelete(chartId);
    if (selectedChart?.id === chartId) {
      setSelectedChart(null);
    }
  };

  const exportChart = (
    chart: ChartConfig,
    format: 'png' | 'svg' | 'pdf' | 'json',
  ) => {
    onExportChart(chart.id, format);
  };

  return (
    <div className={`data-visualization-studio ${className}`}>
      {/* Header */}
      <div className="mb-6 border-b pb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Data Visualization Studio</h2>
          <div className="flex gap-2">
            <button
              onClick={() => createNewChart()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              + New Visualization
            </button>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => setActiveView('gallery')}
            className={`px-4 py-2 rounded-md ${activeView === 'gallery' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            📊 Gallery ({charts.length})
          </button>
          <button
            onClick={() => setActiveView('builder')}
            className={`px-4 py-2 rounded-md ${activeView === 'builder' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            🔧 Chart Builder
          </button>
          <button
            onClick={() => setActiveView('templates')}
            className={`px-4 py-2 rounded-md ${activeView === 'templates' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            📋 Templates ({templates.length})
          </button>
        </div>
      </div>

      {/* Gallery View */}
      {activeView === 'gallery' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {charts.map((chart) => (
            <div
              key={chart.id}
              className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">{chart.title}</h3>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setSelectedChart(chart);
                      setIsEditingChart(true);
                      setActiveView('builder');
                      generatePreviewData(chart);
                    }}
                    className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                    title="Edit"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => exportChart(chart, 'png')}
                    className="p-1 text-green-600 hover:bg-green-100 rounded"
                    title="Export"
                  >
                    💾
                  </button>
                  <button
                    onClick={() => deleteChart(chart.id)}
                    className="p-1 text-red-600 hover:bg-red-100 rounded"
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <div className="aspect-video bg-gray-100 rounded mb-3 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl mb-1">
                    {chartTypes.find((t) => t.type === chart.type)?.icon ||
                      '📊'}
                  </div>
                  <div className="text-sm text-gray-600">{chart.type}</div>
                </div>
              </div>

              <div className="text-sm text-gray-600">
                <div>
                  Source:{' '}
                  {dataSources.find((ds) => ds.id === chart.dataSource)?.name ||
                    chart.dataSource}
                </div>
                <div>Updated: {new Date().toLocaleDateString()}</div>
              </div>
            </div>
          ))}

          {charts.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-lg font-medium mb-2">
                No visualizations yet
              </h3>
              <p className="mb-4">
                Create your first visualization to get started
              </p>
              <button
                onClick={() => createNewChart()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Create Visualization
              </button>
            </div>
          )}
        </div>
      )}

      {/* Templates View */}
      {activeView === 'templates' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <div
                key={template.id}
                className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold">{template.name}</h3>
                  <span className="px-2 py-1 bg-gray-100 text-xs rounded capitalize">
                    {template.category.replace('-', ' ')}
                  </span>
                </div>

                <p className="text-sm text-gray-600 mb-4">
                  {template.description}
                </p>

                <div className="mb-4">
                  <div className="text-2xl mb-2">
                    {chartTypes.find((t) => t.type === template.chartType)
                      ?.icon || '📊'}
                  </div>
                  <div className="text-sm font-medium">
                    {
                      chartTypes.find((t) => t.type === template.chartType)
                        ?.name
                    }
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mb-4">
                  {template.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <button
                  onClick={() => createNewChart(template)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Use Template
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chart Builder View */}
      {activeView === 'builder' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-lg border p-4">
              <h3 className="font-semibold mb-4">Chart Configuration</h3>

              {selectedChart && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={selectedChart.title}
                      onChange={(e) =>
                        setSelectedChart({
                          ...selectedChart,
                          title: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-md text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Chart Type
                    </label>
                    <select
                      value={selectedChart.type}
                      onChange={(e) =>
                        setSelectedChart({
                          ...selectedChart,
                          type: e.target.value as any,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-md text-sm"
                    >
                      {chartTypes.map((type) => (
                        <option key={type.type} value={type.type}>
                          {type.icon} {type.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Data Source
                    </label>
                    <select
                      value={selectedChart.dataSource}
                      onChange={(e) =>
                        setSelectedChart({
                          ...selectedChart,
                          dataSource: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-md text-sm"
                    >
                      {dataSources.map((ds) => (
                        <option key={ds.id} value={ds.id}>
                          {ds.name} ({ds.recordCount} records)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Color Scheme
                    </label>
                    <select
                      value={selectedChart.styling.colorScheme}
                      onChange={(e) =>
                        setSelectedChart({
                          ...selectedChart,
                          styling: {
                            ...selectedChart.styling,
                            colorScheme: e.target.value as any,
                          },
                        })
                      }
                      className="w-full px-3 py-2 border rounded-md text-sm"
                    >
                      <option value="category">Category</option>
                      <option value="sequential">Sequential</option>
                      <option value="diverging">Diverging</option>
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={saveChart}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      💾 Save Chart
                    </button>
                    <button
                      onClick={() => generatePreviewData(selectedChart)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      🔄
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Preview Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border p-4 h-96">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Preview</h3>
                {selectedChart && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => exportChart(selectedChart, 'png')}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
                    >
                      PNG
                    </button>
                    <button
                      onClick={() => exportChart(selectedChart, 'svg')}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
                    >
                      SVG
                    </button>
                    <button
                      onClick={() => exportChart(selectedChart, 'pdf')}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
                    >
                      PDF
                    </button>
                  </div>
                )}
              </div>

              <div className="h-full flex items-center justify-center bg-gray-50 rounded">
                {isGeneratingPreview ? (
                  <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                    <div className="text-sm text-gray-600">
                      Generating preview...
                    </div>
                  </div>
                ) : selectedChart ? (
                  <div className="text-center">
                    <div className="text-4xl mb-4">
                      {chartTypes.find((t) => t.type === selectedChart.type)
                        ?.icon || '📊'}
                    </div>
                    <h4 className="text-lg font-medium mb-2">
                      {selectedChart.title}
                    </h4>
                    <div className="text-sm text-gray-600">
                      {
                        chartTypes.find((t) => t.type === selectedChart.type)
                          ?.name
                      }{' '}
                      •
                      {
                        dataSources.find(
                          (ds) => ds.id === selectedChart.dataSource,
                        )?.name
                      }
                    </div>
                    <div className="mt-4 text-xs text-gray-500">
                      Preview shows sample data representation
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-400">
                    <div className="text-4xl mb-2">📊</div>
                    <div>Select or create a chart to preview</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataVisualizationStudio;
