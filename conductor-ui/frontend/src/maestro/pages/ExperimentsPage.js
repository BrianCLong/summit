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
exports.ExperimentsPage = void 0;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const api_1 = require("../api");
const ExperimentsPage = () => {
    const [experiments, setExperiments] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    (0, react_1.useEffect)(() => {
        loadData();
    }, []);
    const loadData = async () => {
        try {
            const data = await api_1.api.experiments.list();
            setExperiments(data);
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
      <material_1.Typography variant="h4" sx={{ mb: 3 }}>Experiments Lab</material_1.Typography>
      <material_1.Grid container spacing={3}>
         {experiments.map(exp => (<material_1.Grid item xs={12} md={6} key={exp.id}>
                 <material_1.Card>
                     <material_1.CardContent>
                         <material_1.Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                             <icons_material_1.Science color="secondary" sx={{ mr: 2 }}/>
                             <material_1.Box>
                                 <material_1.Typography variant="h6">{exp.name}</material_1.Typography>
                                 <material_1.Typography variant="caption" color="textSecondary">{exp.id}</material_1.Typography>
                             </material_1.Box>
                             <material_1.Box sx={{ flexGrow: 1 }}/>
                             <material_1.Chip label={exp.status} color={exp.status === 'running' ? 'success' : 'default'}/>
                         </material_1.Box>
                         <material_1.Typography variant="body1" gutterBottom>{exp.hypothesis}</material_1.Typography>

                         <material_1.Box sx={{ mt: 2, bgcolor: '#f5f5f5', p: 2, borderRadius: 1 }}>
                             <material_1.Typography variant="subtitle2">Results so far:</material_1.Typography>
                             {Object.entries(exp.metrics).map(([key, val]) => (<material_1.Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                                     <material_1.Typography variant="body2">{key}</material_1.Typography>
                                     <material_1.Typography variant="body2" fontWeight="bold" color={Number(val) > 0 ? 'success.main' : 'error.main'}>
                                         {Number(val) > 0 ? '+' : ''}{val}%
                                     </material_1.Typography>
                                 </material_1.Box>))}
                         </material_1.Box>
                     </material_1.CardContent>
                 </material_1.Card>
             </material_1.Grid>))}
      </material_1.Grid>
    </material_1.Box>);
};
exports.ExperimentsPage = ExperimentsPage;
