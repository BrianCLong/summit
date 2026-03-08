"use strict";
/**
 * NarrativeArcChart - Visualizes narrative momentum over time
 */
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
exports.NarrativeArcChart = void 0;
const react_1 = __importStar(require("react"));
const recharts_1 = require("recharts");
const narrative_viz_types_1 = require("./types/narrative-viz-types");
/**
 * Custom tooltip showing arc details
 */
const ArcTooltip = ({ active, payload, }) => {
    if (!active || !payload || payload.length === 0) {
        return null;
    }
    return (<div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-lg">
            <p className="text-sm font-semibold text-white mb-2">
                Tick {payload[0]?.payload?.tick || 0}
            </p>
            {payload.map((entry, index) => (<div key={index} className="text-xs mb-1">
                    <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: entry.color }}/>
                    <span className="text-gray-300">{entry.name}:</span>
                    <span className="text-white font-medium ml-1">
                        {(entry.value * 100).toFixed(1)}%
                    </span>
                    {entry.payload[`${entry.name}_outlook`] && (<span className="text-gray-400 ml-2 text-xs">
                            ({entry.payload[`${entry.name}_outlook`]})
                        </span>)}
                </div>))}
        </div>);
};
const NarrativeArcChart = ({ arcs, currentTick, config, className = '', }) => {
    // Transform arc data for Recharts
    const chartData = (0, react_1.useMemo)(() => {
        // For now, we only have current state, not historical data
        // In a full implementation, we'd have tick-by-tick history
        const data = [
            {
                tick: currentTick,
                ...arcs.reduce((acc, arc) => {
                    acc[arc.theme] = arc.momentum;
                    acc[`${arc.theme}_outlook`] = arc.outlook;
                    acc[`${arc.theme}_entities`] = arc.keyEntities.join(', ');
                    return acc;
                }, {}),
            },
        ];
        // Add a zero point for better visualization
        if (currentTick > 0) {
            data.unshift({
                tick: 0,
                ...arcs.reduce((acc, arc) => {
                    acc[arc.theme] = 0;
                    return acc;
                }, {}),
            });
        }
        return data;
    }, [arcs, currentTick]);
    // Get theme colors
    const themeColors = (0, react_1.useMemo)(() => {
        const colors = {};
        arcs.forEach((arc, index) => {
            colors[arc.theme] =
                config?.colors?.[arc.theme] ||
                    narrative_viz_types_1.DEFAULT_THEME_COLORS[arc.theme] ||
                    `hsl(${(index * 360) / arcs.length}, 70%, 50%)`;
        });
        return colors;
    }, [arcs, config?.colors]);
    // Filter themes if specified in config
    const visibleThemes = (0, react_1.useMemo)(() => {
        if (config?.themes && config.themes.length > 0) {
            return arcs.filter((arc) => config.themes.includes(arc.theme));
        }
        return arcs;
    }, [arcs, config?.themes]);
    return (<div className={`w-full ${className}`}>
            <recharts_1.ResponsiveContainer width="100%" height={400}>
                <recharts_1.LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <recharts_1.CartesianGrid strokeDasharray="3 3" stroke="#374151"/>
                    <recharts_1.XAxis dataKey="tick" stroke="#9ca3af" label={{ value: 'Simulation Tick', position: 'insideBottom', offset: -5 }}/>
                    <recharts_1.YAxis stroke="#9ca3af" label={{ value: 'Momentum', angle: -90, position: 'insideLeft' }} domain={[0, 1]} tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}/>
                    <recharts_1.Tooltip content={<ArcTooltip />}/>
                    <recharts_1.Legend wrapperStyle={{ paddingTop: '20px' }} iconType="line"/>
                    {visibleThemes.map((arc) => (<recharts_1.Line key={arc.theme} type="monotone" dataKey={arc.theme} stroke={themeColors[arc.theme]} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} name={arc.theme}/>))}
                </recharts_1.LineChart>
            </recharts_1.ResponsiveContainer>

            {/* Arc Details */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {visibleThemes.map((arc) => (<div key={arc.theme} className="bg-gray-800 border border-gray-700 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                                <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: themeColors[arc.theme] }}/>
                                <h4 className="text-sm font-semibold text-white">
                                    {arc.theme}
                                </h4>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded ${arc.outlook === 'improving'
                ? 'bg-green-900 text-green-300'
                : arc.outlook === 'degrading'
                    ? 'bg-red-900 text-red-300'
                    : 'bg-gray-700 text-gray-300'}`}>
                                {arc.outlook}
                            </span>
                        </div>
                        <div className="text-xs text-gray-400 mb-2">
                            Momentum: <span className="text-white font-medium">
                                {(arc.momentum * 100).toFixed(1)}%
                            </span>
                        </div>
                        <div className="text-xs text-gray-400 mb-2">
                            Confidence: <span className="text-white font-medium">
                                {(arc.confidence * 100).toFixed(1)}%
                            </span>
                        </div>
                        {arc.keyEntities.length > 0 && (<div className="text-xs text-gray-400">
                                Key: <span className="text-gray-300">
                                    {arc.keyEntities.slice(0, 2).join(', ')}
                                    {arc.keyEntities.length > 2 && ` +${arc.keyEntities.length - 2}`}
                                </span>
                            </div>)}
                    </div>))}
            </div>
        </div>);
};
exports.NarrativeArcChart = NarrativeArcChart;
