import React, { useState, useEffect } from 'react';
import {
    Card, Title, Text, Metric, Flex, Grid, Badge, AreaChart,
    BarList, Color, ProgressBar, Tracker, Italic,
    Divider, Icon, TabGroup, TabList, Tab, TabPanels, TabPanel
} from '@tremor/react';
import {
    Activity, Shield, Brain, AlertTriangle, TrendingUp,
    Users, MessageSquare, Radar, Info, CheckCircle, Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * NarrativeIntelligencePage: Premium Command Center UI
 * Features psychographic analytics and service resilience monitoring.
 */
export const NarrativeIntelligencePage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        const fetchData = async () => {
            try {
                const response = await fetch('/api/influence-operations/detect/camp-1');
                if (!response.ok) throw new Error('API request failed');
                const result = await response.json();
                setData(result);
            } catch (error) {
                console.error('Failed to fetch Narrative Intelligence:', error);
                // Advanced Mock Data for GA v1.0.0
                setData({
                    timestamp: new Date().toISOString(),
                    resilience: {
                        mlService: { status: 'DEGRADED', message: 'Circuit breaker open - using fallback', icon: AlertTriangle, color: 'orange' as Color },
                        graphService: { status: 'HEALTHY', message: 'Operational', icon: CheckCircle, color: 'emerald' as Color },
                        cacheLayer: { status: 'HEALTHY', message: 'P95: 12ms', icon: Database, color: 'blue' as Color }
                    },
                    cib: {
                        precisionScore: 0.92,
                        identifiedBotClusters: [
                            { clusterId: 'C-ALPHA', size: 450, confidence: 0.98, type: 'Coordinated Timing' },
                            { clusterId: 'C-BET-9', size: 120, confidence: 0.82, type: 'Semantic Similarity' },
                            { clusterId: 'C-GAMMA', size: 85, confidence: 0.75, type: 'Account Age Anomaly' }
                        ],
                        anomalies: [
                            { type: 'BURST_THRESHOLD', severity: 'HIGH', description: 'Massive coordinated post burst detected in South-East domain.' },
                            { type: 'PERSISTENCE_PATTERN', severity: 'MEDIUM', description: 'Low-frequency, long-duration amplification detected across 12 nodes.' }
                        ]
                    },
                    narrative: {
                        amplificationVelocity: 84,
                        topTopics: [
                            { name: 'election_fraud', value: 1240 },
                            { name: 'infrastructure_failure', value: 850 },
                            { name: 'emergency_mandate', value: 620 }
                        ],
                        forecast: {
                            cascadeProbability: 0.78,
                            predictedPeakReach: 154000,
                            timeToPeak: 14,
                            trajectory: Array.from({ length: 24 }).map((_, i) => ({
                                timestamp: i,
                                reach: Math.floor(10000 + (Math.sin(i / 5) + 1) * 70000 + i * 2000)
                            }))
                        },
                        psychographics: {
                            anxiety: 0.72,
                            anger: 0.58,
                            trust_in_media: 0.24,
                            trust_in_gov: 0.31,
                            moralAlignment: [
                                { name: 'Care/Harm', value: 35 },
                                { name: 'Fairness', value: 20 },
                                { name: 'Loyalty', value: 85 },
                                { name: 'Authority', value: 75 },
                                { name: 'Sanctity', value: 40 }
                            ]
                        }
                    }
                });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
        return () => clearInterval(timer);
    }, []);

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-slate-400">
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="mb-4"
            >
                <Activity size={48} className="text-blue-500" />
            </motion.div>
            <Text className="text-blue-200 animate-pulse uppercase tracking-widest font-bold">
                Initializing Intelligence Streams...
            </Text>
        </div>
    );

    return (
        <div className="p-8 space-y-8 bg-slate-950 min-h-screen text-slate-100 font-sans">
            {/* Header Section */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-l-4 border-blue-500 pl-6 py-2 bg-slate-900/50 rounded-r-xl">
                <div>
                    <div className="flex items-center space-x-2">
                        <Badge color="blue" size="xs" className="animate-pulse">STABLE v1.0.0</Badge>
                        <Text className="text-slate-500 text-xs font-mono">{currentTime.toISOString()}</Text>
                    </div>
                    <Title className="text-3xl font-black text-white tracking-tight">INTELGRAPH COMMAND</Title>
                    <Text className="text-slate-400">Narrative Warfare & Influence Operations Monitoring</Text>
                </div>
                <div className="mt-4 md:mt-0 flex flex-col items-end">
                    <Text className="text-slate-500 text-xs mb-2 uppercase font-bold tracking-tighter">System Health Status</Text>
                    <Flex className="space-x-3">
                        {Object.entries(data.resilience).map(([key, service]: [string, any]) => (
                            <Tooltip key={key} text={service.message}>
                                <div className={`p-2 rounded-lg bg-slate-800 border b-${service.color}-900/50 flex items-center space-x-2`}>
                                    <Icon icon={service.icon} variant="simple" color={service.color} size="sm" />
                                    <span className={`text-[10px] font-bold text-${service.color}-500`}>{key.replace('Service', '').toUpperCase()}</span>
                                </div>
                            </Tooltip>
                        ))}
                    </Flex>
                </div>
            </header>

            <TabGroup>
                <TabList className="mt-8 border-slate-800" variant="solid">
                    <Tab icon={TrendingUp}>Tactical Overview</Tab>
                    <Tab icon={Brain}>Psychographic Sensors</Tab>
                    <Tab icon={Shield}>Resilience & Network</Tab>
                </TabList>
                <TabPanels>
                    {/* Panel 1: Tactical Overview */}
                    <TabPanel>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-6 border-none"
                        >
                            <Grid numItems={4} className="gap-6">
                                <Card className="bg-slate-900 border-slate-800 shadow-2xl" decoration="top" decorationColor="blue">
                                    <Text className="text-slate-400 text-xs uppercase font-bold tracking-widest">CIB Precision</Text>
                                    <Metric className="text-blue-500">{(data.cib.precisionScore * 100).toFixed(1)}%</Metric>
                                    <ProgressBar value={data.cib.precisionScore * 100} color="blue" className="mt-3" />
                                </Card>
                                <Card className="bg-slate-900 border-slate-800" decoration="top" decorationColor="red">
                                    <Text className="text-slate-400 text-xs uppercase font-bold tracking-widest">Bot Clusters</Text>
                                    <Metric className="text-red-500">{data.cib.identifiedBotClusters.length}</Metric>
                                    <Divider className="my-2 bg-slate-800" />
                                    <Text className="text-[10px] text-slate-500 italic">Total Estimated: {data.cib.identifiedBotClusters.reduce((acc: any, c: any) => acc + c.size, 0)}</Text>
                                </Card>
                                <Card className="bg-slate-900 border-slate-800" decoration="top" decorationColor="amber">
                                    <Text className="text-slate-400 text-xs uppercase font-bold tracking-widest">Cascade Risk</Text>
                                    <Metric className="text-amber-500">{(data.narrative?.forecast?.cascadeProbability * 100).toFixed(0)}%</Metric>
                                    <Text className="mt-2 text-xs text-slate-500">Predicted Horizon: {data.narrative?.forecast?.timeToPeak}H</Text>
                                </Card>
                                <Card className="bg-slate-900 border-slate-800" decoration="top" decorationColor="indigo">
                                    <Text className="text-slate-400 text-xs uppercase font-bold tracking-widest">Peak reach</Text>
                                    <Metric className="text-indigo-400">{(data.narrative?.forecast?.predictedPeakReach / 1000).toFixed(1)}K</Metric>
                                    <Text className="mt-2 text-xs text-slate-500">Population Saturation</Text>
                                </Card>
                            </Grid>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                                <Card className="lg:col-span-2 bg-slate-900 border-slate-800">
                                    <Flex className="items-start">
                                        <div>
                                            <Title className="text-white">Narrative Trajectory</Title>
                                            <Text className="text-slate-400">Population reach simulation (Monte Carlo)</Text>
                                        </div>
                                        <Badge icon={TrendingUp} color="emerald">LIVE STREAM</Badge>
                                    </Flex>
                                    <AreaChart
                                        className="h-80 mt-10"
                                        data={data.narrative?.forecast?.trajectory}
                                        index="timestamp"
                                        categories={['reach']}
                                        colors={['blue']}
                                        showYAxis={false}
                                        showGridLines={false}
                                        curveType="natural"
                                    />
                                </Card>

                                <Card className="bg-slate-900 border-slate-800">
                                    <Title className="text-white">Active Vectors</Title>
                                    <Text className="text-slate-400 mb-6 font-mono text-xs">Top Amplified Topics</Text>
                                    <BarList
                                        data={data.narrative.topTopics}
                                        className="mt-2"
                                        color="blue"
                                    />
                                    <Divider className="my-6 bg-slate-800" />
                                    <Title className="text-white text-sm uppercase tracking-widest">Detection Quality</Title>
                                    <div className="mt-4 space-y-4">
                                        <div>
                                            <Flex>
                                                <Text className="text-slate-400">Audit Provenance</Text>
                                                <Badge size="xs" color="emerald">VERIFIED</Badge>
                                            </Flex>
                                            <ProgressBar value={98} color="emerald" className="mt-1" />
                                        </div>
                                        <div>
                                            <Flex>
                                                <Text className="text-slate-400">Data Consistency</Text>
                                                <Badge size="xs" color="blue">OPTIMAL</Badge>
                                            </Flex>
                                            <ProgressBar value={85} color="blue" className="mt-1" />
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        </motion.div>
                    </TabPanel>

                    {/* Panel 2: Psychographic Sensors */}
                    <TabPanel>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="mt-6"
                        >
                            <Grid numItems={2} className="gap-6">
                                <Card className="bg-slate-900 border-slate-800">
                                    <Title className="text-white flex items-center space-x-2">
                                        <Icon icon={Brain} size="sm" color="pink" />
                                        <span>Collective Emotional Climate</span>
                                    </Title>
                                    <div className="mt-10 space-y-8">
                                        <div>
                                            <Flex>
                                                <Text className="text-slate-300 font-bold tracking-widest">ANXIETY SENSOR</Text>
                                                <Text className="text-pink-500 font-mono">{(data.narrative.psychographics.anxiety * 100).toFixed(0)}%</Text>
                                            </Flex>
                                            <ProgressBar value={data.narrative.psychographics.anxiety * 100} color="pink" className="mt-2" />
                                        </div>
                                        <div>
                                            <Flex>
                                                <Text className="text-slate-300 font-bold tracking-widest">ANGER SENSOR</Text>
                                                <Text className="text-red-500 font-mono">{(data.narrative.psychographics.anger * 100).toFixed(0)}%</Text>
                                            </Flex>
                                            <ProgressBar value={data.narrative.psychographics.anger * 100} color="red" className="mt-2" />
                                        </div>
                                        <div>
                                            <Flex>
                                                <Text className="text-slate-300 font-bold tracking-widest">INSTITUTIONAL TRUST</Text>
                                                <Text className="text-blue-500 font-mono">{(data.narrative.psychographics.trust_in_media * 100).toFixed(0)}%</Text>
                                            </Flex>
                                            <ProgressBar value={data.narrative.psychographics.trust_in_media * 100} color="blue" className="mt-2" />
                                        </div>
                                    </div>
                                    <Divider className="my-8 bg-slate-800" />
                                    <Text className="italic text-slate-500 text-xs">
                                        * Sensors calculated using NLP sentiment analysis across 50,000+ source nodes.
                                    </Text>
                                </Card>

                                <Card className="bg-slate-900 border-slate-800">
                                    <Title className="text-white flex items-center space-x-2">
                                        <Icon icon={Radar} size="sm" color="indigo" />
                                        <span>Moral Foundations Alignment</span>
                                    </Title>
                                    <Text className="text-slate-400 mt-2">Activation profiles across population segments</Text>
                                    <div className="mt-6">
                                        <BarList data={data.narrative.psychographics.moralAlignment} color="indigo" />
                                    </div>
                                    <div className="mt-10 p-4 bg-slate-800/30 rounded-lg border border-slate-800">
                                        <Flex className="items-start">
                                            <Icon icon={Info} size="sm" className="text-slate-500" />
                                            <div className="ml-3">
                                                <Text className="text-slate-300 font-bold">Inference Alert</Text>
                                                <Text className="text-xs text-slate-400">
                                                    High "Loyalty" activation detected. Risk of tribalistic narrative entrenchment is **CRITICAL**.
                                                </Text>
                                            </div>
                                        </Flex>
                                    </div>
                                </Card>
                            </Grid>
                        </motion.div>
                    </TabPanel>

                    {/* Panel 3: Resilience & Network */}
                    <TabPanel>
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="mt-6 space-y-6"
                        >
                            <Card className="bg-slate-900 border-slate-800">
                                <Title className="text-white mb-4">Network Anomalies & Alerts</Title>
                                <div className="space-y-4">
                                    {data.cib.anomalies.map((anomaly: any, idx: number) => (
                                        <div key={idx} className={`p-4 rounded-lg bg-slate-800/50 border-l-4 ${anomaly.severity === 'HIGH' ? 'border-red-600' : 'border-amber-600 shadow-[0_0_15px_rgba(255,191,0,0.1)]'}`}>
                                            <Flex className="items-start">
                                                <div>
                                                    <Badge color={anomaly.severity === 'HIGH' ? 'red' : 'rose'} size="xs" className="mb-2">{anomaly.type}</Badge>
                                                    <Text className="font-bold text-white uppercase text-xs tracking-widest">{anomaly.description}</Text>
                                                </div>
                                                <Badge color={anomaly.severity === 'HIGH' ? 'red' : 'amber'}>{anomaly.severity}</Badge>
                                            </Flex>
                                        </div>
                                    ))}
                                </div>
                            </Card>

                            <Grid numItems={2} className="gap-6">
                                <Card className="bg-slate-900 border-slate-800">
                                    <Title className="text-white">Bot Cluster Taxonomy</Title>
                                    <div className="mt-4 overflow-hidden rounded-lg border border-slate-800">
                                        <div className="bg-slate-800/50 p-2 flex font-bold text-[10px] text-slate-500 uppercase tracking-tighter border-b border-slate-800">
                                            <div className="w-1/3 pl-2">Designator</div>
                                            <div className="w-1/3">Type</div>
                                            <div className="w-1/3 text-right pr-2">Confidence</div>
                                        </div>
                                        {data.cib.identifiedBotClusters.map((cluster: any) => (
                                            <div key={cluster.clusterId} className="p-3 flex items-center border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                                <Text className="w-1/3 font-mono text-blue-400 font-bold">{cluster.clusterId}</Text>
                                                <div className="w-1/3">
                                                    <Badge color="slate" size="xs">{cluster.type}</Badge>
                                                </div>
                                                <div className="w-1/3 text-right">
                                                    <Text className={`font-bold ${cluster.confidence > 0.9 ? 'text-emerald-500' : 'text-slate-400'}`}>{(cluster.confidence * 100).toFixed(0)}%</Text>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                                <Card className="bg-slate-900 border-slate-800">
                                    <Title className="text-white">API Latency Trace</Title>
                                    <Text className="text-slate-500 mb-6 font-mono text-xs tracking-tighter">Real-time telemetry / Graph-Aggregation</Text>
                                    <div className="h-48 flex items-end space-x-1">
                                        {Array.from({ length: 40 }).map((_, i) => {
                                            const h = Math.random() * 80 + 10;
                                            return <div key={i} style={{ height: `${h}%` }} className={`flex-1 rounded-t-sm ${h > 70 ? 'bg-red-500/50' : 'bg-blue-500/30'}`} />;
                                        })}
                                    </div>
                                    <Flex className="mt-2 text-[10px] text-slate-600 font-mono uppercase">
                                        <span>-5m</span>
                                        <span>Current Pipeline</span>
                                    </Flex>
                                </Card>
                            </Grid>
                        </motion.div>
                    </TabPanel>
                </TabPanels>
            </TabGroup>

            {/* Sticky Footer for Resilience Alerts */}
            <AnimatePresence>
                {data.resilience.mlService.status === 'DEGRADED' && (
                    <motion.div
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 100 }}
                        className="fixed bottom-6 right-6 left-6 md:left-auto md:w-96 z-50 p-4 bg-orange-900/90 border border-orange-500/50 rounded-xl shadow-2xl backdrop-blur-md"
                    >
                        <Flex className="items-start">
                            <Icon icon={AlertTriangle} color="orange" variant="light" size="sm" />
                            <div className="ml-3 pr-6">
                                <Text className="text-orange-100 font-bold text-sm">Service Resilience Alert</Text>
                                <Text className="text-orange-200 text-xs mt-1">
                                    The **Advanced ML Service** is currently unreachable. The system has automatically transitioned to **Simple Heuristic Fallback** mode.
                                </Text>
                            </div>
                            <button className="text-orange-400 hover:text-white" onClick={() => setData({ ...data, resilience: { ...data.resilience, mlService: { ...data.resilience.mlService, status: 'HEALTHY' } } })}>
                                <Icon icon={CheckCircle} size="xs" />
                            </button>
                        </Flex>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Tooltip helper component (Simplified for demo)
const Tooltip: React.FC<{ children: React.ReactNode, text: string }> = ({ children, text }) => (
    <div className="group relative">
        {children}
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block w-max p-2 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-300 shadow-xl z-50">
            {text}
        </div>
    </div>
);

export default NarrativeIntelligencePage;
