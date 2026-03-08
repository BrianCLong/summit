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
exports.default = PolicyExplainDialog;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const useFocusTrap_1 = require("../utils/useFocusTrap");
const PolicyExplain_1 = __importDefault(require("./PolicyExplain"));
function PolicyExplainDialog({ open, onClose, context, }) {
    const ref = (0, react_1.useRef)(null);
    (0, useFocusTrap_1.useFocusTrap)(ref, open, onClose);
    if (!open)
        return null;
    return (<material_1.Dialog open={open} onClose={onClose} aria-modal="true" aria-labelledby="policy-explain-title" maxWidth="md" fullWidth>
      <div ref={ref}>
        <material_1.DialogTitle id="policy-explain-title">Policy Explain</material_1.DialogTitle>
        <material_1.DialogContent dividers>
          <PolicyExplain_1.default context={context}/>
        </material_1.DialogContent>
        <material_1.DialogActions>
          <material_1.Button onClick={onClose}>Close</material_1.Button>
        </material_1.DialogActions>
      </div>
    </material_1.Dialog>);
}
