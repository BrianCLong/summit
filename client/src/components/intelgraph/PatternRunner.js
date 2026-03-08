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
exports.PatternRunner = void 0;
const react_1 = __importStar(require("react"));
const PatternRunner = ({ onRun }) => {
    const [templateId, setTemplateId] = (0, react_1.useState)('');
    const [paramsStr, setParamsStr] = (0, react_1.useState)('{}');
    const handleRun = () => {
        try {
            const params = JSON.parse(paramsStr);
            onRun(templateId, params);
        }
        catch (e) {
            alert('Invalid JSON params');
        }
    };
    return (<div className="intelgraph-pattern-runner p-4 border rounded">
      <h3>IntelGraph Pattern Runner</h3>
      <div className="flex flex-col gap-2">
        <label>
          Template ID:
          <input type="text" className="border p-1 w-full" value={templateId} onChange={(e) => setTemplateId(e.target.value)} placeholder="e.g. intelgraph.identity.shared-email-domain"/>
        </label>
        <label>
          Parameters (JSON):
          <textarea className="border p-1 w-full" value={paramsStr} onChange={(e) => setParamsStr(e.target.value)} rows={4}/>
        </label>
        <button className="bg-blue-500 text-white px-4 py-2 rounded" onClick={handleRun}>
          Run Pattern
        </button>
      </div>
    </div>);
};
exports.PatternRunner = PatternRunner;
