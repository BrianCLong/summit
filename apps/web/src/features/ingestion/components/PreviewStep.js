"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreviewStep = void 0;
const react_1 = __importDefault(require("react"));
const PreviewStep = ({ data, mapping, onImport, isProcessing }) => {
    const piiFlags = new Map();
    if (mapping?.fields) {
        mapping.fields.forEach((field) => {
            if (field.pii || field.piiCategory) {
                piiFlags.set(field.targetField, field.piiCategory ?? 'PII');
            }
        });
    }
    // Simple simulation of applying mapping for preview
    const previewData = data.slice(0, 5).map(row => {
        const mapped = {};
        if (mapping && mapping.fields) {
            mapping.fields.forEach((f) => {
                mapped[f.targetField] = row[f.sourceField];
            });
        }
        return mapped;
    });
    return (<div className="p-6 border rounded-lg shadow-sm bg-white mt-4">
      <h3 className="text-lg font-medium mb-4">3. Preview & Import</h3>

      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md mb-6">
        <h4 className="text-yellow-800 font-semibold text-sm">Policy Check</h4>
        <p className="text-yellow-700 text-sm mt-1">
          PII detection will run automatically. Fields detected as Sensitive (SSN, Email) will be redacted based on active policy.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {previewData.length > 0 && Object.keys(previewData[0]).map((key) => (<th key={key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <span>{key}</span>
                    {piiFlags.has(key) && (<span className="rounded bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                        PII{piiFlags.get(key) ? `: ${piiFlags.get(key)}` : ''}
                      </span>)}
                  </div>
                </th>))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {previewData.map((row, idx) => (<tr key={idx}>
                {Object.values(row).map((val, i) => (<td key={i} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {String(val)}
                  </td>))}
              </tr>))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 flex justify-end">
        <button onClick={onImport} disabled={isProcessing} className={`px-6 py-2 text-white rounded font-medium transition-colors ${isProcessing ? 'bg-blue-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}>
          {isProcessing ? 'Importing...' : 'Run Ingestion Job'}
        </button>
      </div>
    </div>);
};
exports.PreviewStep = PreviewStep;
