"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = HuntDetail;
const react_1 = __importDefault(require("react"));
const material_1 = require("@mui/material");
const react_router_dom_1 = require("react-router-dom");
const useSafeQuery_1 = require("../../hooks/useSafeQuery");
const icons_material_1 = require("@mui/icons-material");
const material_2 = require("@mui/material");
function HuntDetail() {
    const { id } = (0, react_router_dom_1.useParams)();
    const navigate = (0, react_router_dom_1.useNavigate)();
    const { data } = (0, useSafeQuery_1.useSafeQuery)({
        queryKey: `hunt_${id}`,
        mock: {
            id: id || 'hunt1',
            name: 'Sample Hunt',
            status: 'COMPLETED',
            type: 'IOC',
            tactic: 'Initial Access',
            lastRun: new Date().toISOString(),
            findings: 5,
            severity: 'HIGH',
            description: 'A sample threat hunting operation.',
        },
        deps: [id],
    });
    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'CRITICAL':
                return 'error';
            case 'HIGH':
                return 'warning';
            case 'MEDIUM':
                return 'info';
            default:
                return 'default';
        }
    };
    const getStatusColor = (status) => {
        switch (status) {
            case 'RUNNING':
                return 'primary';
            case 'COMPLETED':
                return 'success';
            case 'FAILED':
                return 'error';
            case 'SCHEDULED':
                return 'info';
            default:
                return 'default';
        }
    };
    return (<material_1.Box sx={{ p: 2 }}>
      <material_1.Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
        <material_2.IconButton onClick={() => navigate('/hunts')}>
          <icons_material_1.ArrowBack />
        </material_2.IconButton>
        <material_1.Typography variant="h5">Hunt Details</material_1.Typography>
      </material_1.Stack>
      <material_1.Card sx={{ borderRadius: 3 }}>
        <material_1.CardContent>
          <material_1.Typography variant="h6" gutterBottom>
            {data?.name}
          </material_1.Typography>
          <material_1.Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <material_1.Chip label={data?.status} color={getStatusColor(data?.status || '')} size="small"/>
            <material_1.Chip label={data?.severity} color={getSeverityColor(data?.severity || '')} size="small"/>
            <material_1.Chip label={data?.type} variant="outlined" size="small"/>
          </material_1.Stack>
          <material_1.Typography variant="body2" color="text.secondary" gutterBottom>
            {data?.description}
          </material_1.Typography>
          <material_1.Typography variant="body2">
            <strong>Tactic:</strong> {data?.tactic}
          </material_1.Typography>
          <material_1.Typography variant="body2">
            <strong>Findings:</strong> {data?.findings}
          </material_1.Typography>
          <material_1.Typography variant="body2">
            <strong>Last Run:</strong>{' '}
            {data?.lastRun ? new Date(data.lastRun).toLocaleString() : 'N/A'}
          </material_1.Typography>
        </material_1.CardContent>
      </material_1.Card>
    </material_1.Box>);
}
