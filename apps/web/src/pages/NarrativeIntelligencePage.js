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
exports.NarrativeIntelligencePage = void 0;
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
const react_1 = __importStar(require("react"));
const react_2 = require("@tremor/react");
const NarrativeIntelligencePage = () => {
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [data, setData] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        // In a real app, fetch from API
        // fetch('/api/influence-operations/detect/camp-1').then(...)
        setTimeout(() => {
            setData({
                cib: {
                    precisionScore: 0.89,
                    identifiedBotClusters: [
                        { clusterId: 'c1', size: 145, confidence: 0.92 },
                        { clusterId: 'c2', size: 56, confidence: 0.85 }
                    ],
                    anomalies: [
                        { type: 'amplification', description: 'Coordinated retweet burst detected', severity: 'high' }
                    ]
                },
                narrative: {
                    amplificationVelocity: 45.2,
                    topTopics: [
                        { topic: 'election_fraud', frequency: 120 },
                        { topic: 'hacked_materials', frequency: 85 }
                    ]
                }
            });
            setLoading(false);
        }, 1000);
    }, []);
    if (loading)
        return <div className="p-6">Loading Narrative Intelligence...</div>;
    return (<div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
            <react_2.Title>Narrative Intelligence & Influence Operations</react_2.Title>
            <react_2.Text>Real-time monitoring of CIB and Narrative Warfare</react_2.Text>
        </div>
        <div className="flex space-x-2">
            <react_2.Badge color="red">High Alert</react_2.Badge>
            <react_2.Badge color="blue">Monitoring Active</react_2.Badge>
        </div>
      </div>

      <react_2.Grid numItems={3} className="gap-6">
        <react_2.Card decoration="top" decorationColor="red">
          <react_2.Text>CIB Detection Precision</react_2.Text>
          <react_2.Metric>{(data.cib.precisionScore * 100).toFixed(1)}%</react_2.Metric>
          <react_2.Text className="mt-2">Benchmark: &gt;85%</react_2.Text>
        </react_2.Card>
        <react_2.Card decoration="top" decorationColor="orange">
          <react_2.Text>Identified Bot Clusters</react_2.Text>
          <react_2.Metric>{data.cib.identifiedBotClusters.length}</react_2.Metric>
          <react_2.Text className="mt-2">Total Bots: {data.cib.identifiedBotClusters.reduce((acc, c) => acc + c.size, 0)}</react_2.Text>
        </react_2.Card>
        <react_2.Card decoration="top" decorationColor="yellow">
          <react_2.Text>Amplification Velocity</react_2.Text>
          <react_2.Metric>{data.narrative.amplificationVelocity}</react_2.Metric>
          <react_2.Text className="mt-2">Events / Hour</react_2.Text>
        </react_2.Card>
      </react_2.Grid>

      <react_2.Grid numItems={2} className="gap-6">
        <react_2.Card>
            <react_2.Title>Bot Network Clusters</react_2.Title>
            <div className="mt-4 space-y-2">
                {data.cib.identifiedBotClusters.map((cluster) => (<react_2.Flex key={cluster.clusterId} className="border-b pb-2">
                        <react_2.Text>Cluster {cluster.clusterId}</react_2.Text>
                        <div className="text-right">
                            <react_2.Text>{cluster.size} Accounts</react_2.Text>
                            <react_2.Badge size="xs" color="red">{(cluster.confidence * 100).toFixed(0)}% Conf.</react_2.Badge>
                        </div>
                    </react_2.Flex>))}
            </div>
        </react_2.Card>

        <react_2.Card>
            <react_2.Title>Top Narrative Topics</react_2.Title>
            <div className="mt-4 space-y-2">
                {data.narrative.topTopics.map((topic) => (<react_2.Flex key={topic.topic} className="border-b pb-2">
                        <react_2.Text>#{topic.topic}</react_2.Text>
                        <react_2.Text>{topic.frequency} mentions</react_2.Text>
                    </react_2.Flex>))}
            </div>
        </react_2.Card>
      </react_2.Grid>

      <react_2.Card>
          <react_2.Title>Recent Anomalies</react_2.Title>
           <div className="mt-4">
                {data.cib.anomalies.map((anomaly, idx) => (<div key={idx} className="p-3 bg-red-50 border border-red-100 rounded mb-2">
                        <react_2.Flex>
                            <react_2.Text className="font-bold text-red-800 uppercase">{anomaly.type}</react_2.Text>
                            <react_2.Badge color="red">{anomaly.severity}</react_2.Badge>
                        </react_2.Flex>
                        <react_2.Text className="text-red-700 mt-1">{anomaly.description}</react_2.Text>
                    </div>))}
            </div>
      </react_2.Card>
    </div>);
};
exports.NarrativeIntelligencePage = NarrativeIntelligencePage;
exports.default = exports.NarrativeIntelligencePage;
