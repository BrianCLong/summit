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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Workspaces;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const Grid_1 = __importDefault(require("@mui/material/Grid"));
function Workspaces() {
    const workspaces = (0, react_1.useMemo)(() => [
        {
            id: 'ops',
            name: 'Operations',
            description: 'Live missions, tasking, and joint coordination.',
            badge: 'Primary',
        },
        {
            id: 'fraud',
            name: 'Financial Crimes',
            description: 'Fraud, AML, and sanctions investigations.',
        },
        {
            id: 'cyber',
            name: 'Cyber Defense',
            description: 'Detections, investigations, and incident response.',
        },
    ], []);
    const [active, setActive] = (0, react_1.useState)('ops');
    return (<material_1.Box sx={{ py: 2 }}>
      <material_1.Typography variant="h4" gutterBottom>
        Workspaces
      </material_1.Typography>
      <material_1.Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        Switch context without leaving your current page. Commands preserve the
        browser history so back navigation continues to work.
      </material_1.Typography>
      <Grid_1.default container spacing={2}>
        {workspaces.map((workspace) => (<Grid_1.default xs={12} md={4} key={workspace.id}>
            <material_1.Card variant={active === workspace.id ? 'outlined' : undefined} sx={{
                borderColor: active === workspace.id ? 'primary.main' : 'divider',
            }}>
              <material_1.CardActionArea onClick={() => setActive(workspace.id)}>
                <material_1.CardContent>
                  <material_1.Stack direction="row" spacing={1} alignItems="center">
                    <material_1.Typography variant="h6">{workspace.name}</material_1.Typography>
                    {workspace.badge && (<material_1.Chip size="small" color="primary" label={workspace.badge}/>)}
                  </material_1.Stack>
                  <material_1.Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {workspace.description}
                  </material_1.Typography>
                  {active === workspace.id && (<material_1.Typography variant="caption" color="primary" sx={{ display: 'block', mt: 1 }}>
                      Active workspace
                    </material_1.Typography>)}
                </material_1.CardContent>
              </material_1.CardActionArea>
            </material_1.Card>
          </Grid_1.default>))}
      </Grid_1.default>
    </material_1.Box>);
}
