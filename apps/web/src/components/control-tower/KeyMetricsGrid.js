"use strict";
/**
 * Key Metrics Grid - Displays configurable KPI widgets
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeyMetricsGrid = void 0;
const react_1 = __importDefault(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const KeyMetricsGrid = ({ metrics, isLoading = false, }) => {
    const theme = (0, material_1.useTheme)();
    const getStatusColor = (status) => {
        switch (status) {
            case 'HEALTHY':
                return theme.palette.success.main;
            case 'WARNING':
                return theme.palette.warning.main;
            case 'CRITICAL':
                return theme.palette.error.main;
            default:
                return theme.palette.grey[500];
        }
    };
    const getTrendIcon = (trend, change) => {
        const color = change >= 0 ? theme.palette.success.main : theme.palette.error.main;
        switch (trend) {
            case 'UP':
                return <icons_material_1.TrendingUp sx={{ color, fontSize: 16 }}/>;
            case 'DOWN':
                return <icons_material_1.TrendingDown sx={{ color, fontSize: 16 }}/>;
            default:
                return <icons_material_1.TrendingFlat sx={{ color: theme.palette.grey[500], fontSize: 16 }}/>;
        }
    };
    const renderSparkline = (data = []) => {
        if (data.length === 0)
            return null;
        const max = Math.max(...data);
        const min = Math.min(...data);
        const range = max - min || 1;
        const height = 24;
        const width = 60;
        const step = width / (data.length - 1);
        const points = data
            .map((value, index) => {
            const x = index * step;
            const y = height - ((value - min) / range) * height;
            return `${x},${y}`;
        })
            .join(' ');
        return (<svg width={width} height={height} style={{ marginLeft: 'auto' }}>
        <polyline points={points} fill="none" stroke={theme.palette.primary.main} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>);
    };
    if (isLoading) {
        return (<material_1.Paper elevation={0} sx={{ p: 2, border: `1px solid ${theme.palette.divider}` }}>
        <material_1.Skeleton variant="text" width="30%" height={24}/>
        <material_1.Grid container spacing={2} mt={1}>
          {[1, 2, 3, 4, 5, 6].map((i) => (<material_1.Grid item xs={6} md={4} key={i}>
              <material_1.Skeleton variant="rectangular" height={60} sx={{ borderRadius: 1 }}/>
            </material_1.Grid>))}
        </material_1.Grid>
      </material_1.Paper>);
    }
    return (<material_1.Paper elevation={0} sx={{
            p: 2,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 2,
        }}>
      <material_1.Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <material_1.Typography variant="h6" fontWeight={600}>
          📊 Key Metrics
        </material_1.Typography>
        <material_1.Typography variant="body2" color="primary" sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>
          Edit
        </material_1.Typography>
      </material_1.Box>

      <material_1.Grid container spacing={2}>
        {metrics.map((metric) => (<material_1.Grid item xs={6} md={4} key={metric.id}>
            <material_1.Box sx={{
                p: 1.5,
                borderRadius: 1,
                bgcolor: theme.palette.grey[50],
                borderLeft: `3px solid ${getStatusColor(metric.status)}`,
            }}>
              <material_1.Typography variant="caption" color="textSecondary" display="block" noWrap>
                {metric.name}
              </material_1.Typography>

              <material_1.Box display="flex" alignItems="center" justifyContent="space-between">
                <material_1.Typography variant="h6" fontWeight={700}>
                  {metric.formattedValue}
                </material_1.Typography>
                {renderSparkline(metric.sparkline)}
              </material_1.Box>

              <material_1.Box display="flex" alignItems="center" gap={0.5} mt={0.5}>
                {getTrendIcon(metric.trend, metric.change)}
                <material_1.Typography variant="caption" color={metric.change >= 0 ? 'success.main' : 'error.main'}>
                  {metric.change >= 0 ? '+' : ''}
                  {metric.changePercent !== undefined
                ? `${metric.changePercent}%`
                : metric.change}
                </material_1.Typography>
              </material_1.Box>
            </material_1.Box>
          </material_1.Grid>))}
      </material_1.Grid>
    </material_1.Paper>);
};
exports.KeyMetricsGrid = KeyMetricsGrid;
exports.default = exports.KeyMetricsGrid;
