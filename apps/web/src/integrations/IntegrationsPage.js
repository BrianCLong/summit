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
exports.IntegrationsPage = void 0;
const react_1 = __importStar(require("react"));
const IntegrationCard_1 = require("./IntegrationCard");
const IntegrationForm_1 = require("./IntegrationForm");
// Stubbed hooks/api calls
const useIntegrations = () => {
    return {
        integrations: [],
        loading: false,
        error: null,
        enableIntegration: async (type, config) => {
            console.log(`Enabling ${type}`, config);
            return { success: true };
        },
        testConnection: async (type, config) => {
            console.log(`Testing ${type}`, config);
            return { success: true };
        }
    };
};
const INTEGRATION_TYPES = [
    { type: 'webhook', title: 'Event Sinks', description: 'Configure outbound webhooks and event queues.' },
    { type: 'splunk', title: 'SIEM Export', description: 'Stream audit logs to Splunk or Elastic.' },
    { type: 'jira', title: 'Ticketing', description: 'Connect Jira or ServiceNow for incident management.' },
    { type: 'inbound', title: 'Inbound Alerts', description: 'Create incidents from external webhooks.' },
];
const IntegrationsPage = () => {
    const { enableIntegration, testConnection } = useIntegrations();
    const [selectedType, setSelectedType] = (0, react_1.useState)(null);
    const handleConfigure = (0, react_1.useCallback)((type) => {
        setSelectedType(type);
    }, []);
    const handleCancel = (0, react_1.useCallback)(() => {
        setSelectedType(null);
    }, []);
    const handleSave = (0, react_1.useCallback)(async (config) => {
        if (selectedType) {
            await enableIntegration(selectedType, config);
            alert('Saved!');
            setSelectedType(null);
        }
    }, [selectedType, enableIntegration]);
    const handleTest = (0, react_1.useCallback)(async (config) => {
        if (selectedType) {
            const res = await testConnection(selectedType, config);
            if (res.success)
                alert('Connection successful');
            else
                alert('Connection failed');
        }
    }, [selectedType, testConnection]);
    return (<div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Integrations</h1>

            {selectedType ? (<IntegrationForm_1.IntegrationForm type={selectedType} onSave={handleSave} onTest={handleTest} onCancel={handleCancel}/>) : (<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {INTEGRATION_TYPES.map((it) => (<IntegrationCard_1.IntegrationCard key={it.type} type={it.type} title={it.title} description={it.description} onConfigure={handleConfigure}/>))}
                </div>)}
        </div>);
};
exports.IntegrationsPage = IntegrationsPage;
