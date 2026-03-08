"use strict";
/**
 * Active Situations - Displays grouped operational issues requiring attention
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActiveSituations = void 0;
const react_1 = __importDefault(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const ActiveSituations = ({ situations, onSituationClick, isLoading = false, }) => {
    const theme = (0, material_1.useTheme)();
    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'CRITICAL':
                return theme.palette.error.main;
            case 'WARNING':
                return theme.palette.warning.main;
            case 'INFO':
                return theme.palette.info.main;
            default:
                return theme.palette.grey[500];
        }
    };
    const getSeverityIcon = (severity) => {
        const color = getSeverityColor(severity);
        switch (severity) {
            case 'CRITICAL':
                return <icons_material_1.Error sx={{ color }}/>;
            case 'WARNING':
                return <icons_material_1.Warning sx={{ color }}/>;
            default:
                return <icons_material_1.Info sx={{ color }}/>;
        }
    };
    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'P1':
                return theme.palette.error.main;
            case 'P2':
                return theme.palette.warning.main;
            default:
                return theme.palette.grey[500];
        }
    };
    const formatTimeAgo = (date) => {
        const now = new Date();
        const diffMs = now.getTime() - new Date(date).getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 60)
            return `${diffMins} min ago`;
        if (diffMins < 1440)
            return `${Math.floor(diffMins / 60)} hours ago`;
        return `${Math.floor(diffMins / 1440)} days ago`;
    };
    if (isLoading) {
        return (<material_1.Paper elevation={0} sx={{ p: 2, border: `1px solid ${theme.palette.divider}`, height: '100%' }}>
        <material_1.Skeleton variant="text" width="50%" height={32}/>
        {[1, 2, 3].map((i) => (<material_1.Skeleton key={i} variant="rectangular" height={100} sx={{ mt: 2, borderRadius: 1 }}/>))}
      </material_1.Paper>);
    }
    return (<material_1.Paper elevation={0} sx={{
            p: 2,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 2,
            height: '100%',
        }}>
      <material_1.Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <material_1.Typography variant="h6" fontWeight={600}>
          🔴 Active Situations ({situations.length})
        </material_1.Typography>
      </material_1.Box>

      <material_1.Box sx={{
            maxHeight: 400,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
        }}>
        {situations.length === 0 ? (<material_1.Box textAlign="center" py={4}>
            <material_1.Typography color="textSecondary">
              No active situations - all clear! 🎉
            </material_1.Typography>
          </material_1.Box>) : (situations.map((situation) => (<material_1.Card key={situation.id} variant="outlined" sx={{
                borderLeft: `4px solid ${getSeverityColor(situation.severity)}`,
                '&:hover': {
                    bgcolor: theme.palette.action.hover,
                    cursor: 'pointer',
                },
            }} onClick={() => onSituationClick(situation.id)}>
              <material_1.CardContent sx={{ pb: 1 }}>
                <material_1.Box display="flex" alignItems="flex-start" gap={1} mb={1}>
                  {getSeverityIcon(situation.severity)}
                  <material_1.Box flex={1}>
                    <material_1.Box display="flex" alignItems="center" gap={1}>
                      <material_1.Chip size="small" label={situation.priority} sx={{
                bgcolor: getPriorityColor(situation.priority),
                color: 'white',
                fontWeight: 600,
                height: 20,
            }}/>
                      <material_1.Typography variant="subtitle2" fontWeight={600}>
                        {situation.title}
                      </material_1.Typography>
                    </material_1.Box>
                    <material_1.Typography variant="body2" color="textSecondary" mt={0.5}>
                      {situation.eventCount} related events • Started{' '}
                      {formatTimeAgo(situation.startedAt)}
                    </material_1.Typography>
                    {situation.owner && (<material_1.Typography variant="body2" color="textSecondary">
                        Assigned: @{situation.owner.name}
                      </material_1.Typography>)}
                  </material_1.Box>
                </material_1.Box>
              </material_1.CardContent>

              <material_1.CardActions sx={{ px: 2, pb: 1.5, pt: 0 }}>
                <material_1.Button size="small" onClick={(e) => { e.stopPropagation(); onSituationClick(situation.id); }}>
                  View
                </material_1.Button>
                <material_1.Button size="small" color="warning" onClick={(e) => e.stopPropagation()}>
                  Escalate
                </material_1.Button>
              </material_1.CardActions>
            </material_1.Card>)))}
      </material_1.Box>

      <material_1.Box mt={2}>
        <material_1.Button size="small" fullWidth variant="outlined">
          + Create Situation
        </material_1.Button>
      </material_1.Box>
    </material_1.Paper>);
};
exports.ActiveSituations = ActiveSituations;
exports.default = exports.ActiveSituations;
