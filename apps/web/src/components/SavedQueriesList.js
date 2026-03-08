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
exports.SavedQueriesList = void 0;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const SavedQueriesList = ({ onSelect }) => {
    const [queries, setQueries] = (0, react_1.useState)([]);
    (0, react_1.useEffect)(() => {
        fetch('/api/query-studio/saved')
            .then(res => res.json())
            .then(data => {
            if (Array.isArray(data))
                setQueries(data);
        })
            .catch(err => console.error(err));
    }, []);
    return (<material_1.Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <material_1.Typography variant="h6" gutterBottom>Saved Queries</material_1.Typography>
        <material_1.List sx={{ flex: 1, overflow: 'auto' }}>
        {queries.map((q) => (<material_1.ListItem key={q.id} disablePadding>
            <material_1.ListItemButton onClick={() => onSelect(q.cypher)}>
                <material_1.ListItemText primary={q.name} secondary={q.description || q.created_by}/>
            </material_1.ListItemButton>
            </material_1.ListItem>))}
        {queries.length === 0 && (<material_1.Typography variant="body2" color="text.secondary">No saved queries found.</material_1.Typography>)}
        </material_1.List>
    </material_1.Box>);
};
exports.SavedQueriesList = SavedQueriesList;
