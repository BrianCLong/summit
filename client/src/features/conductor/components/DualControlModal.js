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
exports.DualControlModal = DualControlModal;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
function DualControlModal({ open, onClose, onConfirm, actionLabel = 'Confirm', }) {
    const [justification, setJustification] = (0, react_1.useState)('');
    const [approver, setApprover] = (0, react_1.useState)('');
    const valid = justification.trim().length > 5 && /@/.test(approver);
    return (<material_1.Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <material_1.DialogTitle>Dual Control Required</material_1.DialogTitle>
      <material_1.DialogContent>
        <material_1.Typography variant="body2" color="text.secondary" gutterBottom>
          Provide a justification and an approver (email) to proceed. This
          action is audited.
        </material_1.Typography>
        <material_1.Box sx={{ display: 'grid', gap: 2 }}>
          <material_1.TextField label="Justification" value={justification} onChange={(e) => setJustification(e.target.value)} multiline minRows={2} placeholder="Why is this safe and necessary?"/>
          <material_1.TextField label="Second approver (email)" value={approver} onChange={(e) => setApprover(e.target.value)} placeholder="name@example.com"/>
        </material_1.Box>
      </material_1.DialogContent>
      <material_1.DialogActions>
        <material_1.Button onClick={onClose}>Cancel</material_1.Button>
        <material_1.Button disabled={!valid} variant="contained" onClick={() => onConfirm({ justification, approver })}>
          {actionLabel}
        </material_1.Button>
      </material_1.DialogActions>
    </material_1.Dialog>);
}
