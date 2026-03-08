"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = EntityPage;
const GraphPane_1 = __importDefault(require("../../../components/GraphPane"));
const MapPane_1 = __importDefault(require("../../../components/MapPane"));
const TimelinePane_1 = __importDefault(require("../../../components/TimelinePane"));
const PolicyBadge_1 = __importDefault(require("../../../components/PolicyBadge"));
const api_1 = require("../../../lib/api");
async function EntityPage({ params, }) {
    const data = await (0, api_1.api)(`/views/tripane?entity_id=${params.id}`);
    return (<div>
      <PolicyBadge_1.default policy={{ sensitivity: 'T' }}/>
      <div className="grid grid-cols-3 gap-2 mt-2">
        <GraphPane_1.default data={data.graph}/>
        <MapPane_1.default points={data.map}/>
        <TimelinePane_1.default events={data.timeline}/>
      </div>
    </div>);
}
