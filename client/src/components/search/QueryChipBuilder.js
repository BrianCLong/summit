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
exports.QueryChipBuilder = QueryChipBuilder;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const FIELDS = [
    { label: 'Title', value: 'title' },
    { label: 'Content', value: 'content' },
    { label: 'Author', value: 'author' },
    { label: 'Type', value: 'type' },
    { label: 'Created', value: 'createdAt' },
    { label: 'Tags', value: 'tags' },
    { label: 'Status', value: 'status' },
];
const OPERATORS = {
    text: ['contains', 'equals', 'starts with', 'ends with'],
    date: ['after', 'before', 'between'],
    number: ['equals', 'greater than', 'less than', 'between'],
    select: ['equals', 'in', 'not in'],
};
function QueryChipBuilder({ chips, onChipsChange, onSave, onShare, }) {
    const [newChip, setNewChip] = (0, react_1.useState)({});
    const [saveDialogOpen, setSaveDialogOpen] = (0, react_1.useState)(false);
    const addChip = (0, react_1.useCallback)(() => {
        if (!newChip.field || !newChip.operator || !newChip.value)
            return;
        const chip = {
            id: `chip-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            field: newChip.field,
            operator: newChip.operator,
            value: newChip.value,
            type: 'filter',
        };
        onChipsChange([...chips, chip]);
        setNewChip({});
    }, [chips, newChip, onChipsChange]);
    const removeChip = (0, react_1.useCallback)((chipId) => {
        onChipsChange(chips.filter((chip) => chip.id !== chipId));
    }, [chips, onChipsChange]);
    const parseKeyboardDSL = (0, react_1.useCallback)((input) => {
        // Simple DSL parser: field:value OR field>value OR field<value
        const dslPattern = /(\w+)([:\<\>])([^\s]+)/g;
        const matches = Array.from(input.matchAll(dslPattern));
        const newChips = matches.map((match) => ({
            id: `dsl-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            field: match[1],
            operator: match[2] === ':'
                ? 'equals'
                : match[2] === '>'
                    ? 'greater than'
                    : 'less than',
            value: match[3],
            type: 'filter',
        }));
        if (newChips.length > 0) {
            onChipsChange([...chips, ...newChips]);
        }
    }, [chips, onChipsChange]);
    return (<material_1.Paper elevation={1} sx={{ p: 2, mb: 2 }}>
      <material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <icons_material_1.FilterList color="primary"/>
        <material_1.Typography variant="subtitle2">Query Builder</material_1.Typography>

        <material_1.Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
          {onSave && (<material_1.Tooltip title="Save search">
              <material_1.IconButton size="small" onClick={() => setSaveDialogOpen(true)}>
                <icons_material_1.Save />
              </material_1.IconButton>
            </material_1.Tooltip>)}

          {onShare && (<material_1.Tooltip title="Share search">
              <material_1.IconButton size="small" onClick={onShare}>
                <icons_material_1.Share />
              </material_1.IconButton>
            </material_1.Tooltip>)}

          <material_1.Tooltip title="Clear all filters">
            <material_1.IconButton size="small" onClick={() => onChipsChange([])}>
              <icons_material_1.Clear />
            </material_1.IconButton>
          </material_1.Tooltip>
        </material_1.Box>
      </material_1.Box>

      {/* Active filter chips */}
      {chips.length > 0 && (<material_1.Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {chips.map((chip) => (<material_1.Chip key={chip.id} label={`${chip.field} ${chip.operator} ${chip.value}`} onDelete={() => removeChip(chip.id)} color="primary" variant="outlined" size="small"/>))}
        </material_1.Box>)}

      {/* Quick DSL input */}
      <material_1.Box sx={{ mb: 2 }}>
        <material_1.TextField placeholder="Quick search: type:document status:active author:john (or use builder below)" fullWidth size="small" onKeyDown={(e) => {
            if (e.key === 'Enter') {
                const target = e.target;
                parseKeyboardDSL(target.value);
                target.value = '';
            }
        }} helperText="Press Enter to parse. Format: field:value, field>value, field<value"/>
      </material_1.Box>

      {/* Manual chip builder */}
      <material_1.Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
        <material_1.Autocomplete size="small" sx={{ minWidth: 120 }} options={FIELDS} value={FIELDS.find((f) => f.value === newChip.field) || null} onChange={(_, option) => setNewChip((prev) => ({ ...prev, field: option?.value }))} renderInput={(params) => <material_1.TextField {...params} label="Field"/>}/>

        <material_1.Autocomplete size="small" sx={{ minWidth: 100 }} options={OPERATORS.text} // Simplified - would be dynamic based on field type
     value={newChip.operator || null} onChange={(_, value) => setNewChip((prev) => ({ ...prev, operator: value || '' }))} renderInput={(params) => <material_1.TextField {...params} label="Operator"/>}/>

        <material_1.TextField size="small" label="Value" value={newChip.value || ''} onChange={(e) => setNewChip((prev) => ({ ...prev, value: e.target.value }))} onKeyDown={(e) => e.key === 'Enter' && addChip()} sx={{ minWidth: 120 }}/>

        <material_1.Tooltip title="Add filter">
          <material_1.IconButton color="primary" onClick={addChip} disabled={!newChip.field || !newChip.operator || !newChip.value}>
            <icons_material_1.Add />
          </material_1.IconButton>
        </material_1.Tooltip>
      </material_1.Box>

      {chips.length > 0 && (<material_1.Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          {chips.length} active filter{chips.length !== 1 ? 's' : ''}
        </material_1.Typography>)}
    </material_1.Paper>);
}
