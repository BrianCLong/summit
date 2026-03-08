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
exports.CommandPalette = CommandPalette;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const react_router_dom_1 = require("react-router-dom");
function CommandPalette({ open, onClose, }) {
    const navigate = (0, react_router_dom_1.useNavigate)();
    const [query, setQuery] = (0, react_1.useState)('');
    const commands = (0, react_1.useMemo)(() => [
        {
            id: 'runbooks',
            title: 'Open Runbooks',
            action: () => navigate('/conductor'),
        },
        {
            id: 'rollouts',
            title: 'View Rollouts',
            action: () => navigate('/conductor'),
        },
        {
            id: 'slo',
            title: 'Open SLO Dashboard',
            action: () => navigate('/conductor'),
        },
        {
            id: 'entities',
            title: 'Search Entities',
            action: () => navigate('/search'),
        },
        {
            id: 'graph',
            title: 'Open Graph Explorer',
            action: () => navigate('/graph'),
        },
    ], [navigate]);
    const filtered = (0, react_1.useMemo)(() => {
        const q = query.trim().toLowerCase();
        if (!q)
            return commands;
        return commands.filter((c) => c.title.toLowerCase().includes(q));
    }, [commands, query]);
    (0, react_1.useEffect)(() => {
        function onKey(e) {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                if (!open)
                    onClose(); // ensure re-render to open from parent
            }
        }
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);
    return (<material_1.Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <material_1.DialogContent>
        <material_1.Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Command Palette — type to filter, Enter to execute (Esc to close)
        </material_1.Typography>
        <material_1.TextField autoFocus fullWidth placeholder="Jump to… (runbooks, rollouts, SLO, graph)" value={query} onChange={(e) => setQuery(e.target.value)}/>
        <material_1.List dense>
          {filtered.map((c) => (<material_1.ListItemButton key={c.id} onClick={() => {
                c.action();
                onClose();
            }}>
              <material_1.ListItemText primary={c.title} secondary={c.hint}/>
            </material_1.ListItemButton>))}
        </material_1.List>
      </material_1.DialogContent>
    </material_1.Dialog>);
}
