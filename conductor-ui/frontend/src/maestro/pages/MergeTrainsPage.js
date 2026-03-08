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
exports.MergeTrainsPage = void 0;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const api_1 = require("../api");
const MergeTrainsPage = () => {
    const [train, setTrain] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    (0, react_1.useEffect)(() => {
        loadData();
    }, []);
    const loadData = async () => {
        try {
            const data = await api_1.api.mergeTrain.getStatus();
            setTrain(data);
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
    if (!train)
        return <material_1.Typography>No active merge train.</material_1.Typography>;
    return (<material_1.Box>
      <material_1.Typography variant="h4" sx={{ mb: 3 }}>Merge Train Operations</material_1.Typography>
      <material_1.Grid container spacing={3}>
         <material_1.Grid item xs={12} md={4}>
             <material_1.Paper sx={{ p: 3, textAlign: 'center' }}>
                 <icons_material_1.Train sx={{ fontSize: 60, color: 'primary.main', mb: 2 }}/>
                 <material_1.Typography variant="h5" gutterBottom>Comet Express</material_1.Typography>
                 <material_1.Chip label={train.status} color={train.status === 'active' ? 'success' : 'default'}/>
                 <material_1.Box sx={{ mt: 3 }}>
                     <material_1.Typography variant="h3">{train.queueLength}</material_1.Typography>
                     <material_1.Typography color="textSecondary">PRs in Queue</material_1.Typography>
                 </material_1.Box>
                 <material_1.Box sx={{ mt: 2 }}>
                     <material_1.Typography variant="h6">{train.throughput}/day</material_1.Typography>
                     <material_1.Typography color="textSecondary">Throughput</material_1.Typography>
                 </material_1.Box>
             </material_1.Paper>
         </material_1.Grid>
         <material_1.Grid item xs={12} md={8}>
             <material_1.Paper sx={{ p: 3 }}>
                 <material_1.Typography variant="h6" gutterBottom>Active Queue</material_1.Typography>
                 <material_1.List>
                     {train.activePRs.map((pr) => (<material_1.ListItem key={pr.number} divider>
                             <material_1.ListItemIcon><icons_material_1.GitHub /></material_1.ListItemIcon>
                             <material_1.ListItemText primary={`#${pr.number} ${pr.title}`} secondary={`by ${pr.author}`}/>
                             <material_1.Chip label={pr.status} size="small" color={pr.status === 'running' ? 'primary' : 'default'}/>
                         </material_1.ListItem>))}
                 </material_1.List>
             </material_1.Paper>
         </material_1.Grid>
      </material_1.Grid>
    </material_1.Box>);
};
exports.MergeTrainsPage = MergeTrainsPage;
