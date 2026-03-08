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
exports.AutonomicPage = void 0;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const api_1 = require("../api");
const AutonomicPage = () => {
    const [loops, setLoops] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        loadLoops();
    }, []);
    const loadLoops = async () => {
        try {
            const data = await api_1.api.autonomic.listLoops();
            setLoops(data);
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setLoading(false);
        }
    };
    const handleToggle = async (id, currentStatus) => {
        try {
            const newStatus = currentStatus === 'active' ? 'paused' : 'active';
            await api_1.api.autonomic.toggleLoop(id, newStatus);
            setLoops(loops.map(l => l.id === id ? { ...l, status: newStatus } : l));
        }
        catch (err) {
            setError(err.message || 'Failed to toggle loop');
        }
    };
    if (loading)
        return <material_1.CircularProgress />;
    return (<material_1.Box>
      <material_1.Typography variant="h4" sx={{ mb: 3 }}>Autonomic Nervous System</material_1.Typography>
      {error && <material_1.Alert severity="error" sx={{ mb: 2 }}>{error}</material_1.Alert>}

      <material_1.TableContainer component={material_1.Paper}>
        <material_1.Table>
          <material_1.TableHead>
            <material_1.TableRow>
              <material_1.TableCell>Loop Name</material_1.TableCell>
              <material_1.TableCell>Type</material_1.TableCell>
              <material_1.TableCell>Status</material_1.TableCell>
              <material_1.TableCell>Last Decision</material_1.TableCell>
              <material_1.TableCell>Last Run</material_1.TableCell>
              <material_1.TableCell>Control</material_1.TableCell>
            </material_1.TableRow>
          </material_1.TableHead>
          <material_1.TableBody>
            {loops.map((loop) => (<material_1.TableRow key={loop.id}>
                <material_1.TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                  {loop.name}
                </material_1.TableCell>
                <material_1.TableCell>{loop.type.toUpperCase()}</material_1.TableCell>
                <material_1.TableCell>
                    <material_1.Box sx={{ color: loop.status === 'active' ? 'green' : 'gray' }}>
                        {loop.status.toUpperCase()}
                    </material_1.Box>
                </material_1.TableCell>
                <material_1.TableCell>{loop.lastDecision}</material_1.TableCell>
                <material_1.TableCell>{new Date(loop.lastRun).toLocaleString()}</material_1.TableCell>
                <material_1.TableCell>
                  <material_1.Switch checked={loop.status === 'active'} onChange={() => handleToggle(loop.id, loop.status)} color="primary"/>
                </material_1.TableCell>
              </material_1.TableRow>))}
          </material_1.TableBody>
        </material_1.Table>
      </material_1.TableContainer>
    </material_1.Box>);
};
exports.AutonomicPage = AutonomicPage;
