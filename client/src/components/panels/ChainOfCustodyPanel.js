"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ChainOfCustodyPanel;
const react_1 = require("react");
function ChainOfCustodyPanel() {
    const [entries, setEntries] = (0, react_1.useState)([]);
    (0, react_1.useEffect)(() => {
        fetch('/audit/export?investigation_id=demo&format=JSON')
            .then((r) => r.json())
            .then((d) => setEntries(d.entries || []))
            .catch(() => setEntries([]));
    }, []);
    return (<div>
      <h3>Chain of Custody</h3>
      <ul>
        {entries.map((e, i) => (<li key={i}>
            {e.user} {e.action} {e.target}
          </li>))}
      </ul>
      <button onClick={() => (window.location.href =
            '/audit/export?investigation_id=demo&format=PDF')}>
        Export Report
      </button>
    </div>);
}
