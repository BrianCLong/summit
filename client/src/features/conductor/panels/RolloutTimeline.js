"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RolloutTimeline = RolloutTimeline;
const react_1 = __importDefault(require("react"));
const material_1 = require("@mui/material");
function RolloutTimeline({ steps, name, }) {
    if (!steps || steps.length === 0) {
        return (<material_1.Card>
        <material_1.CardContent>
          <material_1.Typography variant="h6">Rollout Timeline</material_1.Typography>
          <material_1.Typography variant="body2" color="text.secondary">
            No rollout data. Connect Argo Rollouts API or select a rollout.
          </material_1.Typography>
        </material_1.CardContent>
      </material_1.Card>);
    }
    return (<material_1.Card>
      <material_1.CardContent>
        <material_1.Typography variant="h6" gutterBottom>
          {name || 'Rollout'}
        </material_1.Typography>
        {steps.map((s, i) => (<material_1.Box key={i} sx={{ mb: 1 }}>
            <material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <material_1.Typography variant="body2" sx={{ minWidth: 56 }}>
                {s.weight}%
              </material_1.Typography>
              <material_1.Box sx={{ flex: 1 }}>
                <material_1.LinearProgress variant={s.status === 'completed' ? 'determinate' : 'indeterminate'} value={100}/>
              </material_1.Box>
              <material_1.Chip size="small" label={s.status} color={s.status === 'completed'
                ? 'success'
                : s.status === 'aborted'
                    ? 'error'
                    : 'default'}/>
              {s.analysis && (<material_1.Chip size="small" label={`analysis: ${s.analysis}`} color={s.analysis === 'pass'
                    ? 'success'
                    : s.analysis === 'fail'
                        ? 'error'
                        : 'info'}/>)}
            </material_1.Box>
          </material_1.Box>))}
      </material_1.CardContent>
    </material_1.Card>);
}
