"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// client/src/components/alerts/AlertsDashboard.tsx
const react_1 = __importDefault(require("react"));
const mockAlertHistory = [
    { id: '1', rule: { name: 'High CPU Usage' }, triggeredAt: new Date().toISOString(), value: 95.5, acknowledged: false },
    { id: '2', rule: { name: 'Low Memory' }, triggeredAt: new Date().toISOString(), value: 10.2, acknowledged: true },
];
const AlertsDashboard = () => {
    // In a real implementation, this would use a GraphQL query to fetch data
    const alertHistory = mockAlertHistory;
    const handleAcknowledge = () => {
        window.alert('Acknowledging alert...');
    };
    return (<div>
      <h2>Alerts Dashboard</h2>
      <table>
        <thead>
          <tr>
            <th>Rule</th>
            <th>Triggered At</th>
            <th>Value</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {alertHistory.map((alertItem) => (<tr key={alertItem.id}>
              <td>{alertItem.rule.name}</td>
              <td>{new Date(alertItem.triggeredAt).toLocaleString()}</td>
              <td>{alertItem.value}</td>
              <td>{alertItem.acknowledged ? 'Acknowledged' : 'New'}</td>
              <td>
                {!alertItem.acknowledged && (<button onClick={handleAcknowledge}>
                    Acknowledge
                  </button>)}
              </td>
            </tr>))}
        </tbody>
      </table>
    </div>);
};
exports.default = AlertsDashboard;
