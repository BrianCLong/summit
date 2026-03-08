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
exports.IntegrationForm = void 0;
const react_1 = __importStar(require("react"));
exports.IntegrationForm = react_1.default.memo(({ type, initialConfig = {}, onSave, onTest, onCancel }) => {
    const [config, setConfig] = (0, react_1.useState)(initialConfig);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const handleSaveClick = async () => {
        setLoading(true);
        try {
            await onSave(config);
        }
        finally {
            setLoading(false);
        }
    };
    const handleTestClick = async () => {
        setLoading(true);
        try {
            await onTest(config);
        }
        finally {
            setLoading(false);
        }
    };
    return (<div className="border p-4 rounded shadow bg-gray-50">
            <h2 className="text-xl font-bold mb-4">Configure {type.toUpperCase()}</h2>
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Endpoint URL</label>
                <input type="text" className="border p-2 w-full rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow" value={config.url || ''} onChange={e => setConfig({ ...config, url: e.target.value })} disabled={loading}/>
            </div>
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Secret / API Key</label>
                <input type="password" className="border p-2 w-full rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow" value={config.secret || ''} onChange={e => setConfig({ ...config, secret: e.target.value })} disabled={loading}/>
            </div>
            <div className="flex gap-3">
                <button onClick={handleTestClick} disabled={loading} className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded transition-colors disabled:opacity-50">
                    {loading ? 'Testing...' : 'Test Connection'}
                </button>
                <button onClick={handleSaveClick} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition-colors disabled:opacity-50">
                    {loading ? 'Saving...' : 'Save & Enable'}
                </button>
                <button onClick={onCancel} disabled={loading} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded transition-colors disabled:opacity-50">
                    Cancel
                </button>
            </div>
        </div>);
});
exports.IntegrationForm.displayName = 'IntegrationForm';
