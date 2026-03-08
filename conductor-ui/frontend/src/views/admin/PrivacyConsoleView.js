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
exports.PrivacyConsoleView = void 0;
// conductor-ui/frontend/src/views/admin/PrivacyConsoleView.tsx
const react_1 = __importStar(require("react"));
// Mock API
const fetchPolicyEntity = async (entityId) => {
    await new Promise((res) => setTimeout(res, 200));
    return {
        id: entityId,
        purposeTags: ['investigation', 'threat-intel'],
        retentionTier: 'standard-365d',
    };
};
const updatePolicyEntity = async (entityId, data) => {
    console.log(`Updating ${entityId} with`, data);
    await new Promise((res) => setTimeout(res, 400));
    // In a real app, this would return the updated entity from the server.
    return {
        id: entityId,
        purposeTags: data.purposeTags || [],
        retentionTier: data.retentionTier || '',
    };
};
const PrivacyConsoleView = () => {
    const [entityId, setEntityId] = (0, react_1.useState)('ent-123');
    const [entity, setEntity] = (0, react_1.useState)(null);
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        if (entityId) {
            setIsLoading(true);
            fetchPolicyEntity(entityId).then((data) => {
                setEntity(data);
                setIsLoading(false);
            });
        }
    }, [entityId]);
    const handleUpdateRetention = () => {
        if (!entity)
            return;
        // This would typically open a modal with OPA checks
        const newTier = prompt('Enter new retention tier:', entity.retentionTier);
        if (newTier) {
            updatePolicyEntity(entity.id, { retentionTier: newTier }).then((updatedEntity) => {
                // In a real app, you'd update state with the response.
                alert('Update request sent.');
            });
        }
    };
    const handleRtbfRequest = () => {
        if (!entity)
            return;
        if (confirm(`Initiate RTBF request for entity ${entity.id}?`)) {
            console.log('Initiating RTBF request...');
            alert('RTBF request initiated.');
        }
    };
    return (<div>
      <h1>Privacy & Retention Console</h1>
      <input type="text" value={entityId} onChange={(e) => setEntityId(e.target.value)} placeholder="Enter Entity ID"/>
      {isLoading && <p>Loading entity...</p>}
      {entity && (<div>
          <h2>Entity: {entity.id}</h2>
          <p>
            <strong>Retention Tier:</strong> {entity.retentionTier}{' '}
            <button onClick={handleUpdateRetention}>Edit</button>
          </p>
          <p>
            <strong>Purpose Tags:</strong> {entity.purposeTags.join(', ')}
          </p>
          <hr />
          <button onClick={handleRtbfRequest}>
            Initiate Right To Be Forgotten (RTBF)
          </button>
        </div>)}
    </div>);
};
exports.PrivacyConsoleView = PrivacyConsoleView;
