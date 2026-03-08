"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SelectionSummary = SelectionSummary;
const material_1 = require("@mui/material");
const react_1 = require("react");
const react_redux_1 = require("react-redux");
const store_1 = require("../store");
function formatRange(range) {
    if (!range)
        return 'Unbounded';
    const [start, end] = range;
    const formatter = new Intl.DateTimeFormat('en', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
    return `${formatter.format(start)} - ${formatter.format(end)}`;
}
function SelectionSummary() {
    const dispatch = (0, react_redux_1.useDispatch)();
    const { selectedNodeId, timeRange } = (0, react_redux_1.useSelector)((state) => state.selection);
    const rangeText = (0, react_1.useMemo)(() => formatRange(timeRange), [timeRange]);
    return (<material_1.Stack direction="row" spacing={2} alignItems="center" data-testid="selection-summary" aria-label="selection summary">
      <material_1.Typography variant="body2" component="div">
        Selected node:{' '}
        <material_1.Chip label={selectedNodeId ?? 'None'} color={selectedNodeId ? 'primary' : 'default'} size="small" variant={selectedNodeId ? 'filled' : 'outlined'} data-testid="selected-node-label" onDelete={selectedNodeId ? () => dispatch((0, store_1.selectNode)(null)) : undefined}/>
      </material_1.Typography>
      <material_1.Typography variant="body2" component="div">
        Time range:{' '}
        <material_1.Chip label={rangeText} size="small" variant="outlined" data-testid="time-range-label" onDelete={timeRange ? () => dispatch((0, store_1.setTimeRange)(null)) : undefined}/>
      </material_1.Typography>
    </material_1.Stack>);
}
