"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AlertsPage;
const react_1 = require("react");
const jquery_1 = __importDefault(require("jquery"));
const sample = [
    {
        id: '1',
        entity: 'Entity 1',
        reason: 'matched name',
        severity: 5,
        status: 'OPEN',
    },
];
function AlertsPage() {
    (0, react_1.useEffect)(() => {
        const table = (0, jquery_1.default)('#alerts-table');
        table.find('th').css({ position: 'sticky', top: 0 });
    }, []);
    return (<div>
      <h1>Alerts</h1>
      <table id="alerts-table">
        <thead>
          <tr>
            <th>Entity</th>
            <th>Reason</th>
            <th>Severity</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {sample.map((a) => (<tr key={a.id}>
              <td>{a.entity}</td>
              <td>{a.reason}</td>
              <td>{a.severity}</td>
              <td>{a.status}</td>
            </tr>))}
        </tbody>
      </table>
    </div>);
}
