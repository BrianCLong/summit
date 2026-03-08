"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = App;
const react_1 = require("react");
const api_1 = require("./api");
function App() {
    const [people, setPeople] = (0, react_1.useState)([]);
    (0, react_1.useEffect)(() => {
        (0, api_1.gql)('{ searchPersons(q:"a", limit: 10){ id name } }').then((r) => setPeople(r.data.searchPersons));
    }, []);
    return (<div style={{ padding: 16 }}>
      <h1>IntelGraph Demo</h1>
      <ul>
        {people.map((p) => (<li key={p.id}>{p.name}</li>))}
      </ul>
    </div>);
}
