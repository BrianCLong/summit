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
exports.AgentsPage = void 0;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const api_1 = require("../api");
const AgentsPage = () => {
    const [agents, setAgents] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    (0, react_1.useEffect)(() => {
        loadAgents();
    }, []);
    const loadAgents = async () => {
        try {
            const data = await api_1.api.agents.list();
            setAgents(data);
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
      <material_1.Typography variant="h4" sx={{ mb: 3 }}>Agent Fleet</material_1.Typography>
      <material_1.Grid container spacing={3}>
        {agents.map((agent) => (<material_1.Grid item xs={12} sm={6} md={4} key={agent.id}>
             <material_1.Card>
                <material_1.CardContent>
                    <material_1.Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <material_1.Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                            <icons_material_1.SmartToy />
                        </material_1.Avatar>
                        <material_1.Box>
                            <material_1.Typography variant="h6">{agent.name}</material_1.Typography>
                            <material_1.Typography variant="caption" color="textSecondary">{agent.role}</material_1.Typography>
                        </material_1.Box>
                        <material_1.Box sx={{ flexGrow: 1 }}/>
                        <material_1.Chip label={agent.status} color={agent.status === 'healthy' ? 'success' : 'warning'} size="small"/>
                    </material_1.Box>

                    <material_1.Typography variant="body2" gutterBottom>Model: {agent.model}</material_1.Typography>

                    <material_1.Box sx={{ mt: 2 }}>
                        <material_1.Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <material_1.Typography variant="caption">Success Rate</material_1.Typography>
                            <material_1.Typography variant="caption">{agent.metrics.successRate}%</material_1.Typography>
                        </material_1.Box>
                        <material_1.LinearProgress variant="determinate" value={agent.metrics.successRate} color="success"/>
                    </material_1.Box>

                    <material_1.Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                         <material_1.Typography variant="caption">P95 Latency: {agent.metrics.latencyP95}ms</material_1.Typography>
                         <material_1.Typography variant="caption">Weight: {agent.routingWeight}</material_1.Typography>
                    </material_1.Box>
                </material_1.CardContent>
             </material_1.Card>
          </material_1.Grid>))}
      </material_1.Grid>
    </material_1.Box>);
};
exports.AgentsPage = AgentsPage;
