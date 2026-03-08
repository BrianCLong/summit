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
exports.default = MergeRollbackPanel;
const react_1 = __importStar(require("react"));
const client_1 = require("@apollo/client");
const react_2 = require("@apollo/client/react");
const material_1 = require("@mui/material");
const ROLLBACK_MERGE = (0, client_1.gql) `
  mutation RollbackMergeSnapshot($mergeId: String!, $reason: String!) {
    rollbackMergeSnapshot(mergeId: $mergeId, reason: $reason) {
      success
      snapshotId
      decisionId
    }
  }
`;
function MergeRollbackPanel() {
    const [mergeId, setMergeId] = (0, react_1.useState)('');
    const [reason, setReason] = (0, react_1.useState)('');
    const [rollbackMerge, { data, loading, error }] = (0, react_2.useMutation)(ROLLBACK_MERGE);
    const handleSubmit = async (event) => {
        event.preventDefault();
        await rollbackMerge({
            variables: {
                mergeId,
                reason,
            },
        });
    };
    const successMessage = data?.rollbackMergeSnapshot?.success
        ? `Rollback queued. Snapshot ${data.rollbackMergeSnapshot.snapshotId} restored.`
        : null;
    return (<material_1.Paper sx={{ p: 3 }}>
      <material_1.Typography variant="h6" gutterBottom>
        Merge Rollback
      </material_1.Typography>
      <material_1.Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Restore a merge using its idempotency key (merge ID) and capture a reason
        for audit.
      </material_1.Typography>

      <material_1.Box component="form" onSubmit={handleSubmit} sx={{ display: 'grid', gap: 2 }}>
        <material_1.TextField label="Merge ID" value={mergeId} onChange={(event) => setMergeId(event.target.value)} required fullWidth/>
        <material_1.TextField label="Rollback reason" value={reason} onChange={(event) => setReason(event.target.value)} required fullWidth multiline minRows={2}/>
        <material_1.Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <material_1.Button type="submit" variant="contained" disabled={loading || !mergeId || !reason}>
            {loading ? 'Restoring...' : 'Restore Merge'}
          </material_1.Button>
        </material_1.Box>
      </material_1.Box>

      {error && (<material_1.Alert severity="error" sx={{ mt: 2 }}>
          {error.message}
        </material_1.Alert>)}
      {successMessage && (<material_1.Alert severity="success" sx={{ mt: 2 }}>
          {successMessage}
        </material_1.Alert>)}
    </material_1.Paper>);
}
