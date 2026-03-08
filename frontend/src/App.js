"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("react");
const Graph_1 = __importDefault(require("./Graph"));
const TimelinePanel_1 = __importDefault(require("./TimelinePanel"));
require("./App.css");
function App() {
    const [graphData, setGraphData] = (0, react_1.useState)({
        nodes: [],
        edges: [],
    });
    const [neighborhoodMode, setNeighborhoodMode] = (0, react_1.useState)(false);
    const [events, setEvents] = (0, react_1.useState)([]);
    (0, react_1.useEffect)(() => {
        fetch('/api/graph')
            .then((res) => res.json())
            .then((data) => {
            const formattedNodes = data.nodes.map((n) => ({
                data: {
                    id: n.id,
                    label: n.properties.text || n.properties.name,
                    type: n.label,
                    deception_score: n.properties.deception_score || 0,
                },
            }));
            const formattedEdges = data.edges.map((e) => ({
                data: { source: e.source, target: e.target, label: e.type },
            }));
            setGraphData({ nodes: formattedNodes, edges: formattedEdges });
        })
            .catch((err) => console.error('Failed to fetch graph data:', err));
    }, []);
    (0, react_1.useEffect)(() => {
        fetch('/api/agent-actions')
            .then((res) => res.json())
            .then((data) => setEvents(data))
            .catch((err) => console.error('Failed to fetch agent actions:', err));
    }, []);
    return (<div className="App">
      <header className="App-header">
        <h1>IntelGraph</h1>
        <button onClick={() => setNeighborhoodMode((m) => !m)}>
          {neighborhoodMode ? 'Show Full Graph' : 'Neighborhood Mode'}
        </button>
      </header>
      <main>
        <Graph_1.default elements={graphData} neighborhoodMode={neighborhoodMode}/>
        <TimelinePanel_1.default events={events}/>
      </main>
    </div>);
}
exports.default = App;
