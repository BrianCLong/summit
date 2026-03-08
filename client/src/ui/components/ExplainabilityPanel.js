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
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
/**
 * ExplainabilityPanel renders a list of why_paths and exposes copy/export actions.
 * The list is keyboard accessible with ARIA roles.
 */
const ExplainabilityPanel = ({ paths, onSelect, onStrategyChange, }) => {
    const [index, setIndex] = (0, react_1.useState)(0);
    const [strategy, setStrategy] = (0, react_1.useState)('v2');
    const humanText = (0, react_1.useCallback)(() => paths.map((p) => `${p.from} → ${p.to} (${p.relId})`).join('\n'), [paths]);
    const copy = (0, react_1.useCallback)(async () => {
        const payload = JSON.stringify({ why_paths: paths, text: humanText() }, null, 2);
        await navigator.clipboard.writeText(payload);
    }, [paths, humanText]);
    const exportJson = (0, react_1.useCallback)(() => {
        const payload = JSON.stringify({ why_paths: paths, text: humanText() }, null, 2);
        const blob = new Blob([payload], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'why_paths.json';
        a.click();
        URL.revokeObjectURL(url);
    }, [paths, humanText]);
    const handleKey = (e) => {
        if (e.key === 'ArrowDown') {
            setIndex((i) => Math.min(i + 1, paths.length - 1));
            e.preventDefault();
        }
        else if (e.key === 'ArrowUp') {
            setIndex((i) => Math.max(i - 1, 0));
            e.preventDefault();
        }
        else if (e.key === 'Enter') {
            onSelect?.(paths[index]);
        }
    };
    const sorted = (0, react_1.useMemo)(() => {
        if (strategy === 'v2') {
            return [...paths].sort((a, b) => (b.supportScore || 0) - (a.supportScore || 0));
        }
        return paths;
    }, [paths, strategy]);
    const changeStrategy = (s) => {
        setStrategy(s);
        onStrategyChange?.(s);
    };
    return (<material_1.Box aria-label="Explainability paths" role="region">
      <material_1.Box display="flex" gap={1} mb={1}>
        <material_1.Button size="small" onClick={copy} aria-label="Copy why paths">
          Copy
        </material_1.Button>
        <material_1.Button size="small" onClick={exportJson} aria-label="Export why paths">
          Export
        </material_1.Button>
        <material_1.Select size="small" value={strategy} onChange={(e) => changeStrategy(e.target.value)} aria-label="Ranking strategy">
          <material_1.MenuItem value="v1">v1</material_1.MenuItem>
          <material_1.MenuItem value="v2">v2</material_1.MenuItem>
        </material_1.Select>
      </material_1.Box>
      <material_1.List role="listbox" tabIndex={0} aria-activedescendant={sorted[index]?.relId} onKeyDown={handleKey} sx={{ maxHeight: 200, overflow: 'auto' }}>
        {sorted.map((p, i) => (<material_1.ListItemButton key={p.relId} id={p.relId} role="option" selected={i === index} onClick={() => onSelect?.(p)} component="li" sx={{ cursor: 'pointer' }}>
            <material_1.Typography variant="body2">
              {p.from} → {p.to}
            </material_1.Typography>
          </material_1.ListItemButton>))}
      </material_1.List>
    </material_1.Box>);
};
exports.default = ExplainabilityPanel;
