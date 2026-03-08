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
const material_1 = require("@mui/material");
const client_1 = require("@apollo/client");
const standalone_1 = require("vis-timeline/standalone");
require("vis-timeline/dist/vis-timeline-graph2d.min.css");
const EVENTS_QUERY = (0, client_1.gql) `
  query TimelineEvents($investigationId: ID!) {
    entities(investigationId: $investigationId) {
      id
      type
      createdAt
    }
    relationships(investigationId: $investigationId) {
      id
      type
      createdAt
    }
  }
`;
const TimelineViewer = ({ investigationId, onSelect, }) => {
    const containerRef = (0, react_1.useRef)(null);
    const timelineRef = (0, react_1.useRef)(null);
    const { data } = (0, client_1.useQuery)(EVENTS_QUERY, {
        variables: { investigationId },
    });
    (0, react_1.useEffect)(() => {
        if (containerRef.current && !timelineRef.current) {
            const items = new standalone_1.DataSet([]);
            const options = { zoomable: true };
            const TimelineCtor = standalone_1.Timeline;
            timelineRef.current = new TimelineCtor(containerRef.current, items, options);
            timelineRef.current.on('select', (props) => {
                const [selectedId] = props.items;
                if (selectedId === undefined || selectedId === null || !onSelect)
                    return;
                const item = items.get(selectedId);
                if (item)
                    onSelect(item);
            });
        }
        if (timelineRef.current && data) {
            const items = new standalone_1.DataSet([
                ...(data.entities || []).map((e) => ({
                    id: `entity-${e.id}`,
                    content: `🧩 ${e.type}`,
                    start: e.createdAt,
                    group: 'Entities',
                    data: { kind: 'entity', entity: e },
                })),
                ...(data.relationships || []).map((r) => ({
                    id: `rel-${r.id}`,
                    content: `🔗 ${r.type}`,
                    start: r.createdAt,
                    group: 'Relationships',
                    data: { kind: 'relationship', relationship: r },
                })),
            ]);
            timelineRef.current.setItems(items);
        }
    }, [data, onSelect]);
    const setRange = (range) => {
        if (!timelineRef.current)
            return;
        const end = new Date();
        let start;
        switch (range) {
            case 'hour':
                start = new Date(end.getTime() - 60 * 60 * 1000);
                break;
            case 'day':
                start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
                break;
            default:
                start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
        }
        timelineRef.current.setWindow(start, end);
    };
    return (<material_1.Box>
      <material_1.Box sx={{ mb: 1 }}>
        <material_1.Button size="small" onClick={() => setRange('hour')}>
          Hour
        </material_1.Button>
        <material_1.Button size="small" onClick={() => setRange('day')}>
          Day
        </material_1.Button>
        <material_1.Button size="small" onClick={() => setRange('week')}>
          Week
        </material_1.Button>
      </material_1.Box>
      <material_1.Box ref={containerRef} sx={{ height: 300 }}/>
    </material_1.Box>);
};
exports.default = TimelineViewer;
