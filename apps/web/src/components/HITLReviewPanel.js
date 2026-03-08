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
exports.HITLReviewPanel = void 0;
const react_1 = __importStar(require("react"));
const HITLReviewPanel = ({ taskId, workflowId, data, onDecision }) => {
    const [decision, setDecision] = (0, react_1.useState)(undefined);
    const [reason, setReason] = (0, react_1.useState)('');
    const handleSubmit = () => {
        if (decision) {
            onDecision(taskId, decision, reason);
        }
    };
    return (<div className="p-4 border rounded-lg shadow-md">
      <h3 className="text-lg font-semibold">Review Task: {taskId}</h3>
      <p className="text-sm text-gray-600">Workflow: {workflowId}</p>
      <div className="mt-4 p-3 bg-gray-100 rounded-md">
        <pre className="text-xs overflow-auto">{JSON.stringify(data, null, 2)}</pre>
      </div>
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700">Decision:</label>
        <select className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md" value={decision || ''} onChange={(e) => setDecision(e.target.value)}>
          <option value="">Select a decision</option>
          <option value="approved">Approve</option>
          <option value="rejected">Reject</option>
        </select>
      </div>
      {decision === 'rejected' && (<div className="mt-4">
          <label className="block text-sm font-medium text-gray-700">Reason for Rejection:</label>
          <textarea className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" rows={3} value={reason} onChange={(e) => setReason(e.target.value)}></textarea>
        </div>)}
      <div className="mt-4">
        <button className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50" onClick={handleSubmit} disabled={!decision}>
          Submit Decision
        </button>
      </div>
    </div>);
};
exports.HITLReviewPanel = HITLReviewPanel;
