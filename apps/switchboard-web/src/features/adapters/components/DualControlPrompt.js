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
exports.DualControlPrompt = void 0;
const react_1 = __importStar(require("react"));
const DualControlPrompt = ({ adapter, action, onCancel, onConfirm, }) => {
    const [approver, setApprover] = (0, react_1.useState)('');
    const [justification, setJustification] = (0, react_1.useState)('');
    const disableConfirm = (0, react_1.useMemo)(() => approver.trim().length < 3 || justification.trim().length < 10, [approver, justification]);
    const actionLabel = (0, react_1.useMemo)(() => {
        switch (action) {
            case 'enable':
                return 'Enable';
            case 'disable':
                return 'Disable';
            case 'uninstall':
                return 'Uninstall';
            case 'install':
                return 'Install';
            default:
                return 'Verify';
        }
    }, [action]);
    return (<div className="dual-control-backdrop" role="dialog" aria-modal="true">
      <div className="dual-control-card">
        <h3>{actionLabel} {adapter.name}</h3>
        <p>
          {adapter.name} requires dual control. Capture the peer approver and rationale before we
          call the Switchboard API.
        </p>
        <div className="dual-control-form">
          <label htmlFor="approver-input">Second approver</label>
          <input id="approver-input" placeholder="email or handle" value={approver} onChange={(event) => setApprover(event.target.value)}/>
          <label htmlFor="justification-input">Justification</label>
          <textarea id="justification-input" rows={3} placeholder="Explain why this action is needed" value={justification} onChange={(event) => setJustification(event.target.value)}/>
        </div>
        <div className="modal-actions">
          <button className="button" onClick={onCancel}>
            Cancel
          </button>
          <button className="button primary" disabled={disableConfirm} onClick={() => onConfirm({ approver, justification })}>
            Confirm &amp; send
          </button>
        </div>
      </div>
    </div>);
};
exports.DualControlPrompt = DualControlPrompt;
