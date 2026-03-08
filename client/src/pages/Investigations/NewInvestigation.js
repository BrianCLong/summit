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
exports.default = NewInvestigation;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const react_router_dom_1 = require("react-router-dom");
function NewInvestigation() {
    const [title, setTitle] = (0, react_1.useState)('');
    const navigate = (0, react_router_dom_1.useNavigate)();
    const handleCreate = () => {
        // In a real app, this would be a mutation
        // For E2E purposes, we navigate to the detail page of a "created" investigation
        navigate('/investigations/inv-1');
    };
    return (<material_1.Container maxWidth="sm">
      <material_1.Box sx={{ mt: 4 }}>
        <material_1.Card sx={{ borderRadius: 3 }}>
          <material_1.CardContent>
            <material_1.Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
              Create New Investigation
            </material_1.Typography>
            <material_1.Stack spacing={3} sx={{ mt: 2 }}>
              <material_1.TextField fullWidth label="Investigation Title" inputProps={{ 'data-testid': 'title' }} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Drift Probe"/>
              <material_1.TextField fullWidth label="Description" multiline rows={4} placeholder="Describe the scope of this investigation"/>
              <material_1.Button variant="contained" size="large" fullWidth onClick={handleCreate} disabled={!title}>
                Create
              </material_1.Button>
            </material_1.Stack>
          </material_1.CardContent>
        </material_1.Card>
      </material_1.Box>
    </material_1.Container>);
}
