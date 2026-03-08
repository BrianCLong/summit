"use strict";
/**
 * SimulationVisualization - Container component for narrative visualization
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
exports.SimulationVisualization = void 0;
const react_1 = __importStar(require("react"));
const NarrativeArcChart_1 = require("./NarrativeArcChart");
const EventAnnotations_1 = require("./EventAnnotations");
const api_1 = require("./api");
const SimulationVisualization = ({ simulationId, showEvents = true, config, onEventClick }) => {
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const [data, setData] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        let mounted = true;
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);
                const vizData = await (0, api_1.getSimulationVisualizationData)(simulationId);
                if (mounted) {
                    setData(vizData);
                }
            }
            catch (err) {
                if (mounted) {
                    setError(err.message || 'Failed to load simulation data');
                }
            }
            finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };
        fetchData();
        return () => {
            mounted = false;
        };
    }, [simulationId]);
    if (loading) {
        return (<div className="flex items-center justify-center h-96">
                <div className="text-gray-400">Loading simulation data...</div>
            </div>);
    }
    if (error) {
        return (<div className="flex items-center justify-center h-96">
                <div className="text-red-400">Error: {error}</div>
            </div>);
    }
    if (!data) {
        return null;
    }
    return (<div className="space-y-6">
            {/* Summary Header */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-2">
                    {data.summary.name}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                        <div className="text-gray-400">Current Tick</div>
                        <div className="text-white font-medium">{data.summary.tick}</div>
                    </div>
                    <div>
                        <div className="text-gray-400">Entities</div>
                        <div className="text-white font-medium">
                            {data.summary.entityCount}
                        </div>
                    </div>
                    <div>
                        <div className="text-gray-400">Active Arcs</div>
                        <div className="text-white font-medium">
                            {data.summary.arcCount}
                        </div>
                    </div>
                    <div>
                        <div className="text-gray-400">Recent Events</div>
                        <div className="text-white font-medium">
                            {data.summary.recentEventCount}
                        </div>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <h4 className="text-md font-semibold text-white mb-4">
                    Narrative Momentum
                </h4>
                <div className="relative">
                    <NarrativeArcChart_1.NarrativeArcChart arcs={data.arcs.arcs} currentTick={data.arcs.currentTick} config={config}/>
                    {showEvents && data.events.events.length > 0 && (<EventAnnotations_1.EventAnnotations events={data.events.events} chartWidth={800} chartHeight={400} xScale={(tick) => (tick / data.arcs.currentTick) * 800} onEventClick={onEventClick}/>)}
                </div>
            </div>

            {/* Narrative Summary */}
            {data.summary.narrative && (<div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                    <h4 className="text-md font-semibold text-white mb-3">
                        Narrative Summary
                    </h4>
                    <p className="text-gray-300 text-sm mb-4">
                        {data.summary.narrative.summary}
                    </p>

                    {data.summary.narrative.highlights &&
                data.summary.narrative.highlights.length > 0 && (<div className="space-y-2">
                                <h5 className="text-sm font-semibold text-gray-400">
                                    Highlights
                                </h5>
                                {data.summary.narrative.highlights.map((highlight, index) => (<div key={index} className="bg-gray-900 rounded p-2 text-xs">
                                            <span className="text-blue-400 font-medium">
                                                {highlight.theme}:
                                            </span>{' '}
                                            <span className="text-gray-300">{highlight.text}</span>
                                        </div>))}
                            </div>)}
                </div>)}
        </div>);
};
exports.SimulationVisualization = SimulationVisualization;
