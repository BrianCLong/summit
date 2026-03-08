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
exports.default = Audit;
// =============================================
// Maestro Audit Log
// =============================================
const react_1 = __importStar(require("react"));
const outline_1 = require("@heroicons/react/24/outline");
const sampleProvenance_1 = require("../../../data/sampleProvenance");
const provenance_1 = require("../../../lib/provenance");
function Audit() {
    const artifacts = (0, react_1.useMemo)(() => sampleProvenance_1.SAMPLE_ARTIFACTS, []);
    const [verifications, setVerifications] = (0, react_1.useState)({});
    const handleVerifyChain = async (artifactId) => {
        const artifact = artifacts.find(item => item.id === artifactId);
        if (!artifact) {
            return;
        }
        setVerifications(prev => ({ ...prev, [artifactId]: 'pending' }));
        try {
            const { manifest, materials } = artifact;
            const stepsValid = await Promise.all(manifest.steps.map(async (step) => {
                const payload = materials[step.id];
                if (!payload) {
                    return false;
                }
                const outputHash = await (0, provenance_1.sha256Hex)(payload.output);
                return outputHash === step.outputHash;
            }));
            const allValid = stepsValid.every(Boolean);
            setVerifications(prev => ({
                ...prev,
                [artifactId]: allValid ? 'success' : 'failure',
            }));
        }
        catch (error) {
            console.error('verification failed', error);
            setVerifications(prev => ({ ...prev, [artifactId]: 'failure' }));
        }
    };
    return (<div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-gray-600">
          Provenance attestations emitted by the pipeline. Trigger manual
          verification to confirm exported manifests have not been tampered
          with.
        </p>
      </header>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Artifact
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Steps
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Last Export
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Verification
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {artifacts.map(artifact => {
            const state = verifications[artifact.id] ?? null;
            return (<tr key={artifact.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-semibold text-gray-900">
                      {artifact.name}
                    </div>
                    <div className="text-xs text-gray-500">{artifact.id}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col space-y-1 text-xs text-gray-600">
                      {artifact.manifest.steps.map(step => (<div key={step.id} className="flex items-center space-x-2">
                          <span className="font-semibold text-gray-700">
                            {(0, provenance_1.formatStepType)(step.type)}
                          </span>
                          <span className="font-mono text-[10px] text-gray-500">
                            {step.outputHash.slice(0, 10)}…
                          </span>
                        </div>))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(artifact.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    {state === 'success' ? (<span className="inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                        <outline_1.CheckCircleIcon className="mr-2 h-4 w-4"/> Verified
                      </span>) : state === 'failure' ? (<span className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
                        <outline_1.ExclamationTriangleIcon className="mr-2 h-4 w-4"/>
                        Failed
                      </span>) : state === 'pending' ? (<span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                        <outline_1.ClockIcon className="mr-2 h-4 w-4"/>
                        Verifying…
                      </span>) : (<span className="text-xs text-gray-500">
                        Not verified
                      </span>)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button type="button" className="rounded-md border border-blue-500 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50" onClick={() => handleVerifyChain(artifact.id)} disabled={state === 'pending'}>
                      {state === 'pending' ? 'Verifying…' : 'Verify bundle'}
                    </button>
                  </td>
                </tr>);
        })}
          </tbody>
        </table>
      </div>
    </div>);
}
