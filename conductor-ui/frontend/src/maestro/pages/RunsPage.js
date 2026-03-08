"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunsPage = void 0;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const react_router_dom_1 = require("react-router-dom");
const api_1 = require("../api");
const RunsPage = () => {
    const [runs, setRuns] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const navigate = (0, react_router_dom_1.useNavigate)();
    (0, react_1.useEffect)(() => {
        loadRuns();
    }, []);
    const loadRuns = async () => {
        try {
            const data = await api_1.api.runs.list();
            setRuns(data);
        }
        catch (err) {
            console.error(err);
        }
        finally {
            setLoading(false);
        }
    };
    if (loading)
        return <material_1.CircularProgress />;
    return (<material_1.Box>
      <material_1.Typography variant="h4" sx={{ mb: 3 }}>Runs</material_1.Typography>
      <material_1.TableContainer component={material_1.Paper}>
        <material_1.Table>
          <material_1.TableHead>
            <material_1.TableRow>
              <material_1.TableCell>Run ID</material_1.TableCell>
              <material_1.TableCell>Pipeline</material_1.TableCell>
              <material_1.TableCell>Status</material_1.TableCell>
              <material_1.TableCell>Started At</material_1.TableCell>
              <material_1.TableCell>Duration</material_1.TableCell>
              <material_1.TableCell>Actions</material_1.TableCell>
            </material_1.TableRow>
          </material_1.TableHead>
          <material_1.TableBody>
            {runs.map((run) => (<material_1.TableRow key={run.id} hover>
                <material_1.TableCell>{run.id.substring(0, 8)}...</material_1.TableCell>
                <material_1.TableCell>{run.pipeline}</material_1.TableCell>
                <material_1.TableCell>
                  <StatusChip status={run.status}/>
                </material_1.TableCell>
                <material_1.TableCell>{new Date(run.started_at).toLocaleString()}</material_1.TableCell>
                <material_1.TableCell>{run.duration_ms ? `${(run.duration_ms / 1000).toFixed(1)}s` : '-'}</material_1.TableCell>
                <material_1.TableCell>
                  <material_1.IconButton onClick={() => navigate(`/maestro/runs/${run.id}`)}>
                    <icons_material_1.Visibility />
                  </material_1.IconButton>
                </material_1.TableCell>
              </material_1.TableRow>))}
            {runs.length === 0 && (<material_1.TableRow>
                    <material_1.TableCell colSpan={6} align="center">No runs found</material_1.TableCell>
                </material_1.TableRow>)}
          </material_1.TableBody>
        </material_1.Table>
      </material_1.TableContainer>
    </material_1.Box>);
};
exports.RunsPage = RunsPage;
const StatusChip = ({ status }) => {
    let color = 'default';
    if (status === 'succeeded')
        color = 'success';
    if (status === 'failed')
        color = 'error';
    if (status === 'running')
        color = 'primary';
    if (status === 'queued')
        color = 'warning';
    return <material_1.Chip label={status} color={color} size="small"/>;
};
