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
exports.MultiRegionStatusView = void 0;
// conductor-ui/frontend/src/views/admin/MultiRegionStatusView.tsx
const react_1 = __importStar(require("react"));
const fetchRegionStatus = async () => {
    await new Promise((res) => setTimeout(res, 300));
    return [
        { name: 'us-east-1', health: 'green', replicaLag: 120 },
        { name: 'us-west-2', health: 'green', replicaLag: 150 },
        { name: 'eu-central-1', health: 'yellow', replicaLag: 1200 },
    ];
};
const MultiRegionStatusView = () => {
    const [regions, setRegions] = (0, react_1.useState)([]);
    (0, react_1.useEffect)(() => {
        fetchRegionStatus().then(setRegions);
    }, []);
    const handleSimulateFailover = () => {
        if (confirm('This is a staging-only action. Proceed with failover simulation?')) {
            console.log('Initiating staging failover...');
            alert('Failover simulation started.');
        }
    };
    return (<div>
      <h1>Multi-Region Status</h1>
      <table>
        <thead>
          <tr>
            <th>Region</th>
            <th>Health</th>
            <th>Replica Lag (ms)</th>
          </tr>
        </thead>
        <tbody>
          {regions.map((r) => (<tr key={r.name}>
              <td>{r.name}</td>
              <td>
                <span style={{ color: r.health }}>●</span>
              </td>
              <td>{r.replicaLag}</td>
            </tr>))}
        </tbody>
      </table>
      <button onClick={handleSimulateFailover}>
        Simulate Staging Failover
      </button>
    </div>);
};
exports.MultiRegionStatusView = MultiRegionStatusView;
