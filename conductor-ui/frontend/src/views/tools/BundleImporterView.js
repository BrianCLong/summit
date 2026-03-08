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
exports.BundleImporterView = void 0;
// conductor-ui/frontend/src/views/tools/BundleImporterView.tsx
const react_1 = __importStar(require("react"));
// Mock verification function
const verifyBundle = async (file) => {
    console.log(`Verifying bundle: ${file.name}`);
    await new Promise((res) => setTimeout(res, 1000)); // Simulate verification work
    if (file.name.includes('invalid')) {
        return { valid: false, message: 'Signature mismatch found.' };
    }
    return {
        valid: true,
        message: 'Bundle verified successfully. Hashes and signature match.',
    };
};
const BundleImporterView = () => {
    const [selectedFile, setSelectedFile] = (0, react_1.useState)(null);
    const [verificationStatus, setVerificationStatus] = (0, react_1.useState)(null);
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const handleFileChange = (event) => {
        if (event.target.files) {
            setSelectedFile(event.target.files[0]);
            setVerificationStatus(null);
        }
    };
    const handleVerify = async () => {
        if (!selectedFile)
            return;
        setIsLoading(true);
        const result = await verifyBundle(selectedFile);
        setVerificationStatus(result);
        setIsLoading(false);
    };
    return (<div>
      <h1>Black-Cell Bundle Importer</h1>
      <p>
        Load a local evidence/provenance bundle to verify its integrity offline.
      </p>
      <input type="file" onChange={handleFileChange} accept=".json,.tar.gz"/>
      <button onClick={handleVerify} disabled={!selectedFile || isLoading}>
        {isLoading ? 'Verifying...' : 'Verify Bundle'}
      </button>

      {verificationStatus && (<div style={{
                marginTop: '1rem',
                padding: '1rem',
                border: `2px solid ${verificationStatus.valid ? 'green' : 'red'}`,
            }}>
          <h3>Verification Result</h3>
          <p>{verificationStatus.message}</p>
        </div>)}
    </div>);
};
exports.BundleImporterView = BundleImporterView;
