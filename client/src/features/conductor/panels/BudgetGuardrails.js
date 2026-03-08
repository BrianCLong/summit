"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BudgetGuardrails = BudgetGuardrails;
const react_1 = __importDefault(require("react"));
const material_1 = require("@mui/material");
function suggestionFor(rule) {
    const map = {
        'budget.daily.usd': 'Reduce LLM_HEAVY usage or increase daily budget cap in Policy → Budgets.',
        'rps.max': 'Lower request rate or raise CONDUCTOR_RPS_MAX within safe limits.',
        'route.p95': 'Investigate slow expert; roll back canary or adjust routing weights.',
    };
    return map[rule] || 'Review policy and adjust parameters or workload.';
}
function BudgetGuardrails({ denials = [] }) {
    return (<material_1.Card>
      <material_1.CardContent>
        <material_1.Typography variant="h6" gutterBottom>
          Budget Guardrails
        </material_1.Typography>
        {denials.length === 0 ? (<material_1.Typography variant="body2" color="text.secondary">
            No budget denials recorded. Cost guard active.
          </material_1.Typography>) : (<material_1.List dense>
            {denials.map((d, i) => (<material_1.ListItem key={i} divider>
                <material_1.ListItemText primary={d.reason} secondary={`${d.time} • ${d.tenant || 'tenant'} • case ${d.caseId || '-'} • ${suggestionFor(d.rule)}`}/>
                <material_1.Chip size="small" label={d.rule}/>
              </material_1.ListItem>))}
          </material_1.List>)}
      </material_1.CardContent>
    </material_1.Card>);
}
