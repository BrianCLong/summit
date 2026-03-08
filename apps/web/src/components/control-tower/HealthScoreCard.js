"use strict";
/**
 * Health Score Card - Displays operational health score with components
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthScoreCard = void 0;
const react_1 = __importDefault(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const HealthScoreCard = ({ score, trend, change, components, isLoading = false, }) => {
    const theme = (0, material_1.useTheme)();
    const getScoreColor = (value) => {
        if (value >= 80)
            return theme.palette.success.main;
        if (value >= 60)
            return theme.palette.warning.main;
        return theme.palette.error.main;
    };
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
    const getTrendIcon = () => {
        switch (trend) {
            case 'UP':
                return <icons_material_1.TrendingUp sx={{ color: theme.palette.success.main }}/>;
            case 'DOWN':
                return <icons_material_1.TrendingDown sx={{ color: theme.palette.error.main }}/>;
            default:
                return <icons_material_1.TrendingFlat sx={{ color: theme.palette.grey[500] }}/>;
        }
    };
    if (isLoading) {
        return (<material_1.Paper elevation={0} sx={{ p: 3, border: `1px solid ${theme.palette.divider}` }}>
        <material_1.Skeleton variant="text" width="40%" height={32}/>
        <material_1.Skeleton variant="rectangular" height={24} sx={{ mt: 2, borderRadius: 1 }}/>
        <material_1.Box display="flex" gap={2} mt={2}>
          {[1, 2, 3, 4].map((i) => (<material_1.Skeleton key={i} variant="text" width={80}/>))}
        </material_1.Box>
      </material_1.Paper>);
    }
    return (<material_1.Paper elevation={0} sx={{
            p: 3,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 2,
        }}>
      <material_1.Typography variant="subtitle2" color="textSecondary" textTransform="uppercase" letterSpacing={1} mb={1}>
        Operational Health Score
      </material_1.Typography>

      {/* Main Score Bar */}
      <material_1.Box display="flex" alignItems="center" gap={2} mb={2}>
        <material_1.Box flex={1}>
          <material_1.LinearProgress variant="determinate" value={score} sx={{
            height: 12,
            borderRadius: 6,
            bgcolor: theme.palette.grey[200],
            '& .MuiLinearProgress-bar': {
                bgcolor: getScoreColor(score),
                borderRadius: 6,
            },
        }}/>
        </material_1.Box>

        <material_1.Box display="flex" alignItems="center" gap={1}>
          <material_1.Typography variant="h4" fontWeight={700} color={getScoreColor(score)}>
            {score}
          </material_1.Typography>
          <material_1.Typography variant="body2" color="textSecondary">
            /100
          </material_1.Typography>
        </material_1.Box>

        <material_1.Box display="flex" alignItems="center" gap={0.5}>
          {getTrendIcon()}
          <material_1.Typography variant="body2" color={change >= 0 ? 'success.main' : 'error.main'}>
            {change >= 0 ? '+' : ''}
            {change} from yesterday
          </material_1.Typography>
        </material_1.Box>
      </material_1.Box>

      {/* Component Scores */}
      <material_1.Box display="flex" gap={2} flexWrap="wrap">
        {components.map((component) => (<material_1.Box key={component.name} display="flex" alignItems="center" gap={1}>
            <material_1.Typography variant="body2" color="textSecondary">
              {component.name}:
            </material_1.Typography>
            <material_1.Typography variant="body2" fontWeight={600} color={getStatusColor(component.status)}>
              {component.score}
            </material_1.Typography>
            <material_1.Chip size="small" label={component.status === 'HEALTHY' ? '✓' : '●'} sx={{
                height: 20,
                minWidth: 20,
                bgcolor: getStatusColor(component.status),
                color: 'white',
                '& .MuiChip-label': { px: 0.5 },
            }}/>
          </material_1.Box>))}
      </material_1.Box>
    </material_1.Paper>);
};
exports.HealthScoreCard = HealthScoreCard;
exports.default = exports.HealthScoreCard;
