"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimelineControl = TimelineControl;
const react_1 = require("react");
const scale_1 = require("@visx/scale");
const brush_1 = require("@visx/brush");
const shape_1 = require("@visx/shape");
const group_1 = require("@visx/group");
const event_1 = require("@visx/event");
function TimelineControl({ width, height, series, window, onWindowChange }) {
    const padding = 16;
    const xScale = (0, react_1.useMemo)(() => (0, scale_1.scaleLinear)({
        domain: [Math.min(...series.map((d) => d.ts)), Math.max(...series.map((d) => d.ts))],
        range: [padding, width - padding]
    }), [series, width]);
    const yScale = (0, react_1.useMemo)(() => (0, scale_1.scaleLinear)({
        domain: [0, Math.max(...series.map((d) => d.value || 0)) || 1],
        range: [height - padding, padding]
    }), [series, height]);
    const handleBrushChange = (domain) => {
        if (!domain)
            return;
        const next = [xScale.invert(domain.x0), xScale.invert(domain.x1)];
        onWindowChange(next);
    };
    const initialBrushPosition = (0, react_1.useMemo)(() => {
        return {
            start: { x: xScale(window[0]), y: padding },
            end: { x: xScale(window[1]), y: height - padding }
        };
    }, [window, xScale, height]);
    return (<svg width={width} height={height} role="img" aria-label="Timeline control">
      <group_1.Group>
        <shape_1.LinePath data={series} x={(d) => xScale(d.ts)} y={(d) => yScale(d.value)} stroke="#2563eb" strokeWidth={2} curve={null}/>
        <brush_1.Brush width={width - padding * 2} height={height - padding * 2} margin={{ top: padding, left: padding, bottom: padding, right: padding }} resizeTriggerAreas={['left', 'right']} selectedBoxStyle={{ fill: '#2563eb33', stroke: '#2563eb' }} handleSize={8} initialBrushPosition={initialBrushPosition} onChange={handleBrushChange} onMouseMove={(brush) => {
            const point = (0, event_1.localPoint)(brush.event);
            if (point) {
                brush.updateBrush((prev) => ({
                    ...prev,
                    extent: {
                        x0: Math.min(point.x, prev.extent.x0),
                        x1: Math.max(point.x, prev.extent.x1),
                        y0: prev.extent.y0,
                        y1: prev.extent.y1
                    }
                }));
            }
        }}/>
      </group_1.Group>
    </svg>);
}
