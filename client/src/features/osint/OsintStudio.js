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
const START_OSINT_SCAN = (0, client_1.gql) `
  mutation StartOsintScan($target: String!) {
    startOsintScan(target: $target) {
      id
      target
      status
    }
  }
`;
const OsintStudio = () => {
    const [target, setTarget] = (0, react_1.useState)('');
    const [startOsintScan, { data, loading, error }] = (0, client_1.useMutation)(START_OSINT_SCAN);
    const handleScan = () => {
        startOsintScan({ variables: { target } });
    };
    return (<div>
      <h1>OSINT Studio</h1>
      <input type="text" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Enter target (e.g., domain, IP)"/>
      <button onClick={handleScan} disabled={loading}>
        {loading ? 'Starting Scan...' : 'Start Scan'}
      </button>

      {data && (<div>
          <h3>Scan Started</h3>
          <p>ID: {data.startOsintScan.id}</p>
          <p>Target: {data.startOsintScan.target}</p>
          <p>Status: {data.startOsintScan.status}</p>
        </div>)}

      {error && <p>Error starting scan: {error.message}</p>}
    </div>);
};
exports.default = OsintStudio;
