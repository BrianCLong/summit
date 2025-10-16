import {
  jsx as _jsx,
  jsxs as _jsxs,
  Fragment as _Fragment,
} from 'react/jsx-runtime';
import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Paper,
  Tabs,
  Tab,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  RefreshOutlined as RefreshIcon,
  InfoOutlined as InfoIcon,
  TrendingUpOutlined as TrendingUpIcon,
  TrendingDownOutlined as TrendingDownIcon,
  RemoveOutlined as SteadyIcon,
} from '@mui/icons-material';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  AreaChart,
  Area,
  Bar,
  ComposedChart,
  CartesianGrid,
} from 'recharts';
import { api } from '../api';
export default function ServingLaneTrends() {
  const { getServingMetrics } = api();
  const [data, setData] = useState([]);
  const [backends, setBackends] = useState([]);
  const [selectedBackend, setSelectedBackend] = useState('all');
  const [selectedTimeRange, setSelectedTimeRange] = useState('1h');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(null);
  const fetchData = async () => {
    try {
      setError(null);
      const r = await getServingMetrics({
        backend: selectedBackend === 'all' ? undefined : selectedBackend,
        timeRange: selectedTimeRange,
      });
      if (r.series) {
        const metrics = r.series.map((p) => ({
          timestamp: p.ts,
          time: new Date(p.ts).toLocaleTimeString(),
          queueDepth: p.qDepth || 0,
          batchSize: p.batch || 0,
          kvCacheHitRate: p.kvHit || 0,
          p95Latency: p.p95Latency || 0,
          throughput: p.throughput || 0,
          utilizationCpu: p.utilizationCpu || 0,
          utilizationGpu: p.utilizationGpu || 0,
          memoryUsage: p.memoryUsage || 0,
          backend: p.backend || 'unknown',
          model: p.model || 'unknown',
          requestsPerSecond: p.rps || 0,
          errorRate: p.errorRate || 0,
          ...p,
        }));
        setData(metrics);
      }
      if (r.backends) {
        setBackends(r.backends);
      }
      setLoading(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch serving metrics',
      );
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchData();
    // Set up refresh interval
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    setRefreshInterval(interval);
    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [selectedBackend, selectedTimeRange]);
  const calculateTrend = (data, key) => {
    if (data.length < 2) return 'steady';
    const recent = data.slice(-5);
    const values = recent.map((d) => Number(d[key]) || 0);
    const first = values[0];
    const last = values[values.length - 1];
    if (last > first * 1.1) return 'up';
    if (last < first * 0.9) return 'down';
    return 'steady';
  };
  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up':
        return _jsx(TrendingUpIcon, { color: 'success' });
      case 'down':
        return _jsx(TrendingDownIcon, { color: 'error' });
      default:
        return _jsx(SteadyIcon, { color: 'action' });
    }
  };
  const getCurrentValue = (data, key) => {
    if (data.length === 0) return 0;
    return Number(data[data.length - 1][key]) || 0;
  };
  const formatValue = (value, type) => {
    switch (type) {
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'latency':
        return `${value.toFixed(0)}ms`;
      case 'throughput':
        return `${value.toFixed(1)} rps`;
      case 'memory':
        return `${(value / 1024 / 1024).toFixed(1)} MB`;
      default:
        return value.toFixed(0);
    }
  };
  const renderMetricCard = (title, dataKey, type, color) => {
    const currentValue = getCurrentValue(data, dataKey);
    const trend = calculateTrend(data, dataKey);
    return _jsx(Card, {
      children: _jsxs(CardContent, {
        children: [
          _jsxs(Box, {
            sx: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 1,
            },
            children: [
              _jsx(Typography, {
                variant: 'subtitle2',
                color: 'textSecondary',
                children: title,
              }),
              _jsx(Tooltip, {
                title: `Trend: ${trend}`,
                children: getTrendIcon(trend),
              }),
            ],
          }),
          _jsx(Typography, {
            variant: 'h4',
            component: 'div',
            sx: { mb: 1 },
            children: formatValue(currentValue, type),
          }),
          _jsx(Box, {
            sx: { height: 120 },
            children: _jsx(ResponsiveContainer, {
              width: '100%',
              height: '100%',
              children: _jsxs(AreaChart, {
                data: data,
                children: [
                  _jsx('defs', {
                    children: _jsxs('linearGradient', {
                      id: `gradient-${dataKey}`,
                      x1: '0',
                      y1: '0',
                      x2: '0',
                      y2: '1',
                      children: [
                        _jsx('stop', {
                          offset: '5%',
                          stopColor: color,
                          stopOpacity: 0.3,
                        }),
                        _jsx('stop', {
                          offset: '95%',
                          stopColor: color,
                          stopOpacity: 0.1,
                        }),
                      ],
                    }),
                  }),
                  _jsx(Area, {
                    type: 'monotone',
                    dataKey: dataKey,
                    stroke: color,
                    fill: `url(#gradient-${dataKey})`,
                    strokeWidth: 2,
                  }),
                  _jsx(RechartsTooltip, {
                    labelFormatter: (value) =>
                      new Date(value).toLocaleTimeString(),
                    formatter: (value) => [formatValue(value, type), title],
                  }),
                ],
              }),
            }),
          }),
        ],
      }),
    });
  };
  const renderOverviewTab = () =>
    _jsxs(Grid, {
      container: true,
      spacing: 3,
      children: [
        _jsx(Grid, {
          item: true,
          xs: 12,
          sm: 6,
          md: 3,
          children: renderMetricCard(
            'Queue Depth',
            'queueDepth',
            'number',
            '#8884d8',
          ),
        }),
        _jsx(Grid, {
          item: true,
          xs: 12,
          sm: 6,
          md: 3,
          children: renderMetricCard(
            'Batch Size',
            'batchSize',
            'number',
            '#82ca9d',
          ),
        }),
        _jsx(Grid, {
          item: true,
          xs: 12,
          sm: 6,
          md: 3,
          children: renderMetricCard(
            'KV Cache Hit Rate',
            'kvCacheHitRate',
            'percentage',
            '#ffc658',
          ),
        }),
        _jsx(Grid, {
          item: true,
          xs: 12,
          sm: 6,
          md: 3,
          children: renderMetricCard(
            'P95 Latency',
            'p95Latency',
            'latency',
            '#ff7c7c',
          ),
        }),
        _jsx(Grid, {
          item: true,
          xs: 12,
          md: 6,
          children: _jsx(Card, {
            children: _jsxs(CardContent, {
              children: [
                _jsx(Typography, {
                  variant: 'h6',
                  gutterBottom: true,
                  children: 'Performance Trends',
                }),
                _jsx(Box, {
                  sx: { height: 300 },
                  children: _jsx(ResponsiveContainer, {
                    width: '100%',
                    height: '100%',
                    children: _jsxs(ComposedChart, {
                      data: data,
                      children: [
                        _jsx(CartesianGrid, { strokeDasharray: '3 3' }),
                        _jsx(XAxis, {
                          dataKey: 'time',
                          tick: { fontSize: 12 },
                        }),
                        _jsx(YAxis, { yAxisId: 'left' }),
                        _jsx(YAxis, { yAxisId: 'right', orientation: 'right' }),
                        _jsx(RechartsTooltip, {}),
                        _jsx(Legend, {}),
                        _jsx(Bar, {
                          yAxisId: 'left',
                          dataKey: 'throughput',
                          fill: '#8884d8',
                          name: 'Throughput (RPS)',
                        }),
                        _jsx(Line, {
                          yAxisId: 'right',
                          type: 'monotone',
                          dataKey: 'p95Latency',
                          stroke: '#ff7c7c',
                          name: 'P95 Latency (ms)',
                        }),
                      ],
                    }),
                  }),
                }),
              ],
            }),
          }),
        }),
        _jsx(Grid, {
          item: true,
          xs: 12,
          md: 6,
          children: _jsx(Card, {
            children: _jsxs(CardContent, {
              children: [
                _jsx(Typography, {
                  variant: 'h6',
                  gutterBottom: true,
                  children: 'Resource Utilization',
                }),
                _jsx(Box, {
                  sx: { height: 300 },
                  children: _jsx(ResponsiveContainer, {
                    width: '100%',
                    height: '100%',
                    children: _jsxs(AreaChart, {
                      data: data,
                      children: [
                        _jsx(CartesianGrid, { strokeDasharray: '3 3' }),
                        _jsx(XAxis, {
                          dataKey: 'time',
                          tick: { fontSize: 12 },
                        }),
                        _jsx(YAxis, {}),
                        _jsx(RechartsTooltip, {}),
                        _jsx(Legend, {}),
                        _jsx(Area, {
                          type: 'monotone',
                          dataKey: 'utilizationCpu',
                          stackId: '1',
                          stroke: '#8884d8',
                          fill: '#8884d8',
                          name: 'CPU %',
                        }),
                        _jsx(Area, {
                          type: 'monotone',
                          dataKey: 'utilizationGpu',
                          stackId: '1',
                          stroke: '#82ca9d',
                          fill: '#82ca9d',
                          name: 'GPU %',
                        }),
                      ],
                    }),
                  }),
                }),
              ],
            }),
          }),
        }),
      ],
    });
  const renderBackendDetail = () =>
    _jsxs(Grid, {
      container: true,
      spacing: 3,
      children: [
        _jsx(Grid, {
          item: true,
          xs: 12,
          children: _jsx(Card, {
            children: _jsxs(CardContent, {
              children: [
                _jsxs(Box, {
                  sx: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 2,
                  },
                  children: [
                    _jsx(Typography, {
                      variant: 'h6',
                      children: 'Backend Overview',
                    }),
                    _jsx(IconButton, {
                      onClick: () => setDetailDialogOpen(true),
                      children: _jsx(InfoIcon, {}),
                    }),
                  ],
                }),
                _jsx(Grid, {
                  container: true,
                  spacing: 2,
                  children: backends.map((backend) =>
                    _jsx(
                      Grid,
                      {
                        item: true,
                        xs: 12,
                        sm: 6,
                        md: 4,
                        children: _jsxs(Paper, {
                          sx: { p: 2 },
                          children: [
                            _jsxs(Box, {
                              sx: {
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                mb: 1,
                              },
                              children: [
                                _jsx(Typography, {
                                  variant: 'subtitle1',
                                  children: backend.name,
                                }),
                                _jsx(Chip, {
                                  label: backend.status,
                                  color:
                                    backend.status === 'healthy'
                                      ? 'success'
                                      : 'error',
                                  size: 'small',
                                }),
                              ],
                            }),
                            _jsxs(Typography, {
                              variant: 'body2',
                              color: 'textSecondary',
                              gutterBottom: true,
                              children: ['Type: ', backend.type],
                            }),
                            _jsxs(Typography, {
                              variant: 'body2',
                              color: 'textSecondary',
                              gutterBottom: true,
                              children: ['Instances: ', backend.instances],
                            }),
                            _jsxs(Typography, {
                              variant: 'body2',
                              color: 'textSecondary',
                              gutterBottom: true,
                              children: ['Models: ', backend.models.join(', ')],
                            }),
                            _jsxs(Box, {
                              sx: { mt: 2 },
                              children: [
                                _jsxs(Typography, {
                                  variant: 'body2',
                                  gutterBottom: true,
                                  children: [
                                    'Utilization: ',
                                    backend.utilization.toFixed(1),
                                    '%',
                                  ],
                                }),
                                _jsx(LinearProgress, {
                                  variant: 'determinate',
                                  value: backend.utilization,
                                  color:
                                    backend.utilization > 80
                                      ? 'warning'
                                      : 'primary',
                                }),
                              ],
                            }),
                          ],
                        }),
                      },
                      backend.name,
                    ),
                  ),
                }),
              ],
            }),
          }),
        }),
        _jsx(Grid, {
          item: true,
          xs: 12,
          children: _jsx(Card, {
            children: _jsxs(CardContent, {
              children: [
                _jsx(Typography, {
                  variant: 'h6',
                  gutterBottom: true,
                  children: 'Backend-Specific Metrics',
                }),
                _jsx(Box, {
                  sx: { height: 400 },
                  children: _jsx(ResponsiveContainer, {
                    width: '100%',
                    height: '100%',
                    children: _jsxs(LineChart, {
                      data: data,
                      children: [
                        _jsx(CartesianGrid, { strokeDasharray: '3 3' }),
                        _jsx(XAxis, {
                          dataKey: 'time',
                          tick: { fontSize: 12 },
                        }),
                        _jsx(YAxis, {}),
                        _jsx(RechartsTooltip, {}),
                        _jsx(Legend, {}),
                        _jsx(Line, {
                          type: 'monotone',
                          dataKey: 'queueDepth',
                          stroke: '#8884d8',
                          name: 'Queue Depth',
                        }),
                        _jsx(Line, {
                          type: 'monotone',
                          dataKey: 'batchSize',
                          stroke: '#82ca9d',
                          name: 'Batch Size',
                        }),
                        _jsx(Line, {
                          type: 'monotone',
                          dataKey: 'kvCacheHitRate',
                          stroke: '#ffc658',
                          name: 'KV Cache Hit %',
                        }),
                      ],
                    }),
                  }),
                }),
              ],
            }),
          }),
        }),
      ],
    });
  const renderDetailDialog = () =>
    _jsxs(Dialog, {
      open: detailDialogOpen,
      onClose: () => setDetailDialogOpen(false),
      maxWidth: 'md',
      fullWidth: true,
      children: [
        _jsx(DialogTitle, { children: 'Backend Details' }),
        _jsx(DialogContent, {
          children: _jsx(List, {
            children: backends.map((backend) =>
              _jsx(
                ListItem,
                {
                  children: _jsx(ListItemText, {
                    primary: backend.name,
                    secondary: _jsxs(_Fragment, {
                      children: [
                        _jsxs(Typography, {
                          variant: 'body2',
                          children: [
                            'Type: ',
                            backend.type,
                            ' | Status: ',
                            backend.status,
                            ' | Instances: ',
                            backend.instances,
                          ],
                        }),
                        _jsxs(Typography, {
                          variant: 'body2',
                          children: ['Models: ', backend.models.join(', ')],
                        }),
                        _jsxs(Typography, {
                          variant: 'body2',
                          children: [
                            'Last Updated: ',
                            new Date(backend.lastUpdate).toLocaleString(),
                          ],
                        }),
                      ],
                    }),
                  }),
                },
                backend.name,
              ),
            ),
          }),
        }),
      ],
    });
  if (loading) {
    return _jsxs(Box, {
      sx: { p: 2 },
      children: [
        _jsx(LinearProgress, {}),
        _jsx(Typography, {
          variant: 'body2',
          sx: { mt: 1 },
          children: 'Loading serving metrics...',
        }),
      ],
    });
  }
  if (error) {
    return _jsxs(Alert, {
      severity: 'error',
      sx: { m: 2 },
      children: ['Failed to load serving metrics: ', error],
    });
  }
  return _jsxs(Box, {
    sx: { p: 2 },
    children: [
      _jsxs(Box, {
        sx: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 3,
        },
        children: [
          _jsx(Typography, { variant: 'h5', children: 'Serving Lane Trends' }),
          _jsxs(Box, {
            sx: { display: 'flex', alignItems: 'center', gap: 2 },
            children: [
              _jsxs(FormControl, {
                size: 'small',
                sx: { minWidth: 120 },
                children: [
                  _jsx(InputLabel, { children: 'Backend' }),
                  _jsxs(Select, {
                    value: selectedBackend,
                    label: 'Backend',
                    onChange: (e) => setSelectedBackend(e.target.value),
                    children: [
                      _jsx(MenuItem, {
                        value: 'all',
                        children: 'All Backends',
                      }),
                      _jsx(MenuItem, { value: 'vllm', children: 'vLLM' }),
                      _jsx(MenuItem, { value: 'ray', children: 'Ray Serve' }),
                      _jsx(MenuItem, { value: 'triton', children: 'Triton' }),
                      _jsx(MenuItem, { value: 'kserve', children: 'KServe' }),
                    ],
                  }),
                ],
              }),
              _jsxs(FormControl, {
                size: 'small',
                sx: { minWidth: 120 },
                children: [
                  _jsx(InputLabel, { children: 'Time Range' }),
                  _jsxs(Select, {
                    value: selectedTimeRange,
                    label: 'Time Range',
                    onChange: (e) => setSelectedTimeRange(e.target.value),
                    children: [
                      _jsx(MenuItem, { value: '1h', children: 'Last Hour' }),
                      _jsx(MenuItem, { value: '6h', children: 'Last 6 Hours' }),
                      _jsx(MenuItem, {
                        value: '24h',
                        children: 'Last 24 Hours',
                      }),
                      _jsx(MenuItem, { value: '7d', children: 'Last 7 Days' }),
                    ],
                  }),
                ],
              }),
              _jsx(IconButton, {
                onClick: fetchData,
                children: _jsx(RefreshIcon, {}),
              }),
            ],
          }),
        ],
      }),
      _jsxs(Tabs, {
        value: tabValue,
        onChange: (_, newValue) => setTabValue(newValue),
        sx: { mb: 3 },
        children: [
          _jsx(Tab, { label: 'Overview' }),
          _jsx(Tab, { label: 'Backend Details' }),
        ],
      }),
      tabValue === 0 && renderOverviewTab(),
      tabValue === 1 && renderBackendDetail(),
      renderDetailDialog(),
    ],
  });
}
