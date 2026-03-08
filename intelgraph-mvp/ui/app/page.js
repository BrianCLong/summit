"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Home;
const react_1 = require("react");
const GraphPane_1 = __importDefault(require("../components/GraphPane"));
const MapPane_1 = __importDefault(require("../components/MapPane"));
const TimelinePane_1 = __importDefault(require("../components/TimelinePane"));
const SearchBar_1 = __importDefault(require("../components/SearchBar"));
const api_1 = require("../lib/api");
function Home() {
    const [token, setToken] = (0, react_1.useState)('');
    const [graphData, setGraphData] = (0, react_1.useState)({ nodes: [], edges: [] });
    const [searchResults, setSearchResults] = (0, react_1.useState)([]);
    // Config
    const tenant = 't1';
    const caseId = 'c1';
    (0, react_1.useEffect)(() => {
        (0, api_1.getAuthToken)().then(setToken);
    }, []);
    const handleSearch = async (q) => {
        if (!token) {
            return;
        }
        const results = await (0, api_1.searchEntities)(q, token, tenant, caseId);
        setSearchResults(results);
        // Auto-select first result for graph view
        if (results.length > 0) {
            const neighbors = await (0, api_1.getNeighbors)(results[0].id, token, tenant, caseId);
            setGraphData(neighbors);
        }
    };
    return (<div className="flex flex-col h-screen p-4 gap-4">
      <div className="w-full">
        <SearchBar_1.default onSearch={handleSearch}/>
      </div>

      {searchResults.length > 0 && (<div className="text-sm text-gray-500 px-2">
            Found: {searchResults.map(r => r.name).join(', ')}
         </div>)}

      <div className="grid grid-cols-3 gap-2 flex-grow">
        <GraphPane_1.default data={graphData}/>
        <MapPane_1.default points={[]}/>
        <TimelinePane_1.default events={[]}/>
      </div>
    </div>);
}
