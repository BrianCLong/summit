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
exports.OnboardingChecklist = void 0;
// conductor-ui/frontend/src/components/onboarding/OnboardingChecklist.tsx
const react_1 = __importStar(require("react"));
const checklistItems = [
    { id: 'connect-source', text: 'Connect your first data source' },
    { id: 'run-pipeline', text: 'Run a pipeline' },
    { id: 'view-slos', text: 'View SLO dashboard' },
    { id: 'export-evidence', text: 'Export an evidence bundle' },
];
const OnboardingChecklist = () => {
    const [completed, setCompleted] = (0, react_1.useState)([]);
    const handleToggle = (id) => {
        setCompleted((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
    };
    return (<div>
      <h2>Getting Started</h2>
      <ul>
        {checklistItems.map((item) => (<li key={item.id}>
            <label>
              <input type="checkbox" checked={completed.includes(item.id)} onChange={() => handleToggle(item.id)}/>
              {item.text}
            </label>
          </li>))}
      </ul>
    </div>);
};
exports.OnboardingChecklist = OnboardingChecklist;
