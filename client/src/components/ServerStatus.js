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
const react_1 = __importStar(require("react"));
const client_1 = require("@apollo/client");
const client_2 = require("@apollo/client");
const urls_1 = require("../config/urls");
const SERVER_STATUS_QUERY = (0, client_2.gql) `
  query ServerStatus {
    __typename
  }
`;
function ServerStatus() {
    const [healthStatus, setHealthStatus] = (0, react_1.useState)('unknown');
    const { data, loading, error } = (0, client_1.useQuery)(SERVER_STATUS_QUERY, {
        errorPolicy: 'all',
        fetchPolicy: 'no-cache',
    });
    (0, react_1.useEffect)(() => {
        // Test health endpoint
        const healthUrl = `${(0, urls_1.getApiBaseUrl)()}/healthz`;
        fetch(healthUrl)
            .then((response) => response.ok ? setHealthStatus('healthy') : setHealthStatus('error'))
            .catch(() => setHealthStatus('error'));
    }, []);
    const graphqlStatus = data
        ? 'healthy'
        : error
            ? 'error'
            : loading
                ? 'checking'
                : 'unknown';
    return (<div className="panel" style={{
            padding: '12px 16px',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
        }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: healthStatus === 'healthy'
                ? '#22c55e'
                : healthStatus === 'error'
                    ? '#ef4444'
                    : '#d1d5db',
            display: 'inline-block',
        }}></span>
        <span>Health: {healthStatus}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: graphqlStatus === 'healthy'
                ? '#22c55e'
                : graphqlStatus === 'error'
                    ? '#ef4444'
                    : '#d1d5db',
            display: 'inline-block',
        }}></span>
        <span>GraphQL: {graphqlStatus}</span>
      </div>

      {healthStatus === 'healthy' && graphqlStatus === 'healthy' && (<span style={{ color: '#22c55e', fontSize: '12px' }}>
          🟢 All systems operational
        </span>)}
    </div>);
}
exports.default = ServerStatus;
