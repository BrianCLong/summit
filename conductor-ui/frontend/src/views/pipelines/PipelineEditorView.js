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
exports.PipelineEditorView = void 0;
// conductor-ui/frontend/src/views/pipelines/PipelineEditorView.tsx
const react_1 = __importStar(require("react"));
// Mock API functions
const fetchTemplates = async () => {
    await new Promise((res) => setTimeout(res, 150));
    return [{ id: 'template-1', name: 'Standard Ingest & Process' }];
};
const fetchPlan = async (draft) => {
    console.log('Fetching plan for draft:', draft);
    await new Promise((res) => setTimeout(res, 500));
    return { estDuration: '15m', estCost: '\$2.50', sloFit: 'green' };
};
const PipelineEditorView = () => {
    const [templates, setTemplates] = (0, react_1.useState)([]);
    const [selectedTemplate, setSelectedTemplate] = (0, react_1.useState)(null);
    const [draft, setDraft] = (0, react_1.useState)(null);
    const [plan, setPlan] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        fetchTemplates().then(setTemplates);
    }, []);
    const handleSelectTemplate = (template) => {
        setSelectedTemplate(template);
        setDraft({ templateId: template.id, steps: {} }); // Initialize draft
        setPlan(null);
    };
    const handleGetPlan = async () => {
        if (draft) {
            const result = await fetchPlan(draft);
            setPlan(result);
        }
    };
    return (<div>
      <h1>Pipeline Editor v0</h1>
      {!selectedTemplate ? (<div>
          <h2>Select a Template</h2>
          <ul>
            {templates.map((t) => (<li key={t.id} onClick={() => handleSelectTemplate(t)}>
                {t.name}
              </li>))}
          </ul>
        </div>) : (<div>
          <h2>Editing: {selectedTemplate.name}</h2>
          {/* Placeholder for step configuration UI */}
          <div style={{
                border: '1px dashed grey',
                padding: '1rem',
                margin: '1rem 0',
            }}>
            <p>Step configuration form will be here.</p>
          </div>
          <button onClick={handleGetPlan}>Preview Plan</button>
          {plan && (<div style={{ marginTop: '1rem' }}>
              <h3>Plan Preview</h3>
              <p>Est. Duration: {plan.estDuration}</p>
              <p>Est. Cost: {plan.estCost}</p>
              <p>
                SLO Fit: <span style={{ color: plan.sloFit }}>●</span>
              </p>
            </div>)}
        </div>)}
    </div>);
};
exports.PipelineEditorView = PipelineEditorView;
