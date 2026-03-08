"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimelinePane = TimelinePane;
const react_1 = require("react");
const standalone_1 = require("vis-timeline/standalone");
const vis_data_1 = require("vis-data");
const react_redux_1 = require("react-redux");
const mockGraph_1 = require("../data/mockGraph");
const store_1 = require("../store");
const telemetry_1 = require("../telemetry");
function TimelinePane() {
    const containerRef = (0, react_1.useRef)(null);
    const timelineRef = (0, react_1.useRef)(null);
    const dispatch = (0, react_redux_1.useDispatch)();
    const selectedNode = (0, react_redux_1.useSelector)((s) => s.selection.selectedNodeId);
    (0, react_1.useEffect)(() => {
        (0, mockGraph_1.fetchGraph)().then((data) => {
            if (!containerRef.current)
                return;
            const items = new vis_data_1.DataSet(data.nodes.map((n) => ({
                id: n.id,
                content: n.label,
                start: n.timestamp,
            })));
            const timeline = new standalone_1.Timeline(containerRef.current, items, {});
            timelineRef.current = timeline;
            timeline.on('select', (props) => {
                const id = props.items[0];
                dispatch((0, store_1.selectNode)(id ?? null));
            });
            // Native time-brushing stub
            const centerDom = timeline.dom.center;
            const onMouseUp = () => {
                const range = timeline.getWindow();
                dispatch((0, store_1.setTimeRange)([range.start.valueOf(), range.end.valueOf()]));
            };
            if (centerDom) {
                centerDom.addEventListener('mouseup', onMouseUp);
            }
            (0, telemetry_1.trackGoldenPathStep)('timeline_pane_loaded', 'success');
        });
    }, [dispatch]);
    (0, react_1.useEffect)(() => {
        if (timelineRef.current) {
            timelineRef.current.setSelection(selectedNode ? [selectedNode] : [], {
                focus: true,
                animation: false,
            });
        }
    }, [selectedNode]);
    return <div ref={containerRef} style={{ width: '100%', height: '100%' }}/>;
}
