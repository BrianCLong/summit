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
require("./BehavioralAnalytics.css");
const BehavioralAnalytics = ({ investigationId, entityId, initialProfiles = [], timeRange, onProfileSelect, onAnomalyDetected, onPatternIdentified, onAnalysisComplete, }) => {
    // State Management
    const [profiles, setProfiles] = (0, react_1.useState)(initialProfiles);
    const [selectedProfile, setSelectedProfile] = (0, react_1.useState)(null);
    const [anomalies, setAnomalies] = (0, react_1.useState)([]);
    const [analysisResults, setAnalysisResults] = (0, react_1.useState)(null);
    // UI State
    const [activeTab, setActiveTab] = (0, react_1.useState)('profiles');
    const [isAnalyzing, setIsAnalyzing] = (0, react_1.useState)(false);
    const [filterSeverity, setFilterSeverity] = (0, react_1.useState)('all');
    const [filterType, setFilterType] = (0, react_1.useState)('all');
    const [searchTerm, setSearchTerm] = (0, react_1.useState)('');
    const [selectedTimeframe, setSelectedTimeframe] = (0, react_1.useState)('7d');
    // Analysis Configuration
    const [analysisConfig, setAnalysisConfig] = (0, react_1.useState)({
        sensitivityLevel: 0.7, // 0-1
        includeContextual: true,
        includeCollective: true,
        minConfidence: 0.6,
        aggregationWindow: '1h',
    });
    // Generate Mock Behavioral Data
    const generateMockData = (0, react_1.useCallback)(() => {
        const now = new Date();
        const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
        const mockProfiles = [
            {
                id: 'profile-1',
                entityId: 'user-001',
                entityType: 'person',
                name: 'John Smith - Digital Behavior',
                timeWindow: {
                    start: startDate,
                    end: now,
                    duration: '30 days',
                },
                patterns: {
                    temporal: [
                        {
                            type: 'daily',
                            schedule: {
                                peaks: [
                                    { time: '09:00', intensity: 0.8, confidence: 0.92 },
                                    { time: '14:00', intensity: 0.6, confidence: 0.85 },
                                    { time: '20:00', intensity: 0.9, confidence: 0.88 },
                                ],
                                quietPeriods: [
                                    { start: '23:00', end: '06:00', intensity: 0.1 },
                                    { start: '12:00', end: '13:00', intensity: 0.3 },
                                ],
                                cyclicity: 0.85,
                                stability: 0.78,
                            },
                            activities: [
                                {
                                    type: 'email_check',
                                    frequency: 45,
                                    averageDuration: 3,
                                    variance: 0.4,
                                },
                                {
                                    type: 'web_browsing',
                                    frequency: 120,
                                    averageDuration: 12,
                                    variance: 0.6,
                                },
                                {
                                    type: 'document_work',
                                    frequency: 15,
                                    averageDuration: 45,
                                    variance: 0.3,
                                },
                            ],
                            anomalies: [
                                {
                                    timestamp: new Date('2024-01-15T03:30:00'),
                                    description: 'Unusual late-night activity spike',
                                    severity: 'medium',
                                    confidence: 0.75,
                                },
                            ],
                        },
                    ],
                    spatial: [
                        {
                            type: 'location_frequency',
                            locations: [
                                {
                                    id: 'loc-1',
                                    name: 'Home Office',
                                    visits: 180,
                                    averageDuration: 480,
                                    timeDistribution: {
                                        '9': 0.2,
                                        '10': 0.3,
                                        '11': 0.25,
                                        '14': 0.15,
                                        '15': 0.1,
                                    },
                                    purpose: 'Work',
                                },
                                {
                                    id: 'loc-2',
                                    name: 'Downtown Café',
                                    visits: 25,
                                    averageDuration: 90,
                                    timeDistribution: { '8': 0.4, '16': 0.6 },
                                    purpose: 'Meetings',
                                },
                            ],
                            routes: [
                                {
                                    from: 'Home',
                                    to: 'Downtown Café',
                                    frequency: 25,
                                    averageTime: 20,
                                    preferredTimes: ['8:00', '16:00'],
                                    method: 'drive',
                                },
                            ],
                            territories: [
                                {
                                    id: 'territory-1',
                                    center: { lat: 37.7749, lng: -122.4194 },
                                    radius: 2000,
                                    confidence: 0.85,
                                    activityLevel: 0.9,
                                },
                            ],
                        },
                    ],
                    communication: [
                        {
                            type: 'frequency',
                            contacts: [
                                {
                                    id: 'contact-1',
                                    name: 'Jane Doe',
                                    relationship: 'colleague',
                                    frequency: 15,
                                    averageResponseTime: 45,
                                    preferredChannels: ['email', 'slack'],
                                    topicDistribution: { work: 0.8, personal: 0.2 },
                                },
                            ],
                            channels: [
                                {
                                    type: 'email',
                                    usage: 85,
                                    timing: { '9': 0.3, '14': 0.4, '17': 0.3 },
                                    avgMessageLength: 156,
                                    networkSize: 45,
                                },
                            ],
                            networkMetrics: {
                                totalContacts: 127,
                                activeContacts: 34,
                                networkDensity: 0.24,
                                centralityScore: 0.67,
                                communityCount: 3,
                            },
                        },
                    ],
                    transaction: [
                        {
                            type: 'spending',
                            categories: [
                                {
                                    name: 'Office Supplies',
                                    frequency: 12,
                                    averageAmount: 85,
                                    timeDistribution: { '10': 0.6, '15': 0.4 },
                                    vendorDiversity: 3,
                                    riskLevel: 'low',
                                },
                                {
                                    name: 'Software Services',
                                    frequency: 4,
                                    averageAmount: 299,
                                    timeDistribution: { '9': 1.0 },
                                    vendorDiversity: 2,
                                    riskLevel: 'low',
                                },
                            ],
                            cashFlow: {
                                inflow: {
                                    total: 8500,
                                    sources: { salary: 8500 },
                                    regularity: 0.95,
                                },
                                outflow: {
                                    total: 6200,
                                    categories: { living: 4500, business: 1700 },
                                    predictability: 0.82,
                                },
                                balance: {
                                    average: 12500,
                                    volatility: 0.15,
                                    trend: 'increasing',
                                },
                            },
                            anomalies: [],
                        },
                    ],
                    digital: [
                        {
                            type: 'web_browsing',
                            webActivity: {
                                categories: {
                                    productivity: 0.4,
                                    news: 0.2,
                                    social: 0.1,
                                    research: 0.3,
                                },
                                timeDistribution: { '9': 0.3, '14': 0.4, '20': 0.3 },
                                searchPatterns: [
                                    'project management tools',
                                    'data visualization',
                                    'security best practices',
                                ],
                                siteFrequency: {
                                    'github.com': 85,
                                    'stackoverflow.com': 67,
                                    'linkedin.com': 23,
                                },
                            },
                            deviceUsage: {
                                devices: [
                                    {
                                        type: 'laptop',
                                        usage: 0.8,
                                        location: 'home',
                                        security: {
                                            updates: true,
                                            encryption: true,
                                            riskScore: 15,
                                        },
                                    },
                                    {
                                        type: 'phone',
                                        usage: 0.6,
                                        location: 'mobile',
                                        security: {
                                            updates: true,
                                            encryption: true,
                                            riskScore: 25,
                                        },
                                    },
                                ],
                                apps: [
                                    {
                                        name: 'VS Code',
                                        category: 'development',
                                        usage: 0.5,
                                        permissions: ['filesystem'],
                                        riskLevel: 'low',
                                    },
                                    {
                                        name: 'Slack',
                                        category: 'communication',
                                        usage: 0.3,
                                        permissions: ['notifications'],
                                        riskLevel: 'low',
                                    },
                                ],
                            },
                            securityBehavior: {
                                passwordHygiene: 85,
                                mfaUsage: true,
                                updateCompliance: 92,
                                suspiciousActivity: [],
                            },
                        },
                    ],
                },
                baseline: {
                    established: new Date('2024-01-01'),
                    confidence: 0.87,
                    stability: 0.82,
                    sampleSize: 2400,
                },
                riskScore: 25,
                anomalyScore: 15,
                tags: ['low-risk', 'stable-pattern', 'regular-schedule'],
                metadata: {
                    occupation: 'Software Engineer',
                    department: 'Engineering',
                },
            },
            {
                id: 'profile-2',
                entityId: 'user-002',
                entityType: 'person',
                name: 'Maria Rodriguez - Financial Behavior',
                timeWindow: {
                    start: startDate,
                    end: now,
                    duration: '30 days',
                },
                patterns: {
                    temporal: [
                        {
                            type: 'weekly',
                            schedule: {
                                peaks: [
                                    { time: 'Monday 10:00', intensity: 0.9, confidence: 0.95 },
                                    { time: 'Friday 16:00', intensity: 0.7, confidence: 0.88 },
                                ],
                                quietPeriods: [
                                    {
                                        start: 'Saturday 18:00',
                                        end: 'Sunday 10:00',
                                        intensity: 0.2,
                                    },
                                ],
                                cyclicity: 0.92,
                                stability: 0.89,
                            },
                            activities: [
                                {
                                    type: 'trading',
                                    frequency: 35,
                                    averageDuration: 25,
                                    variance: 0.5,
                                },
                                {
                                    type: 'research',
                                    frequency: 45,
                                    averageDuration: 35,
                                    variance: 0.3,
                                },
                            ],
                            anomalies: [
                                {
                                    timestamp: new Date('2024-01-20T22:15:00'),
                                    description: 'Unusual weekend trading activity',
                                    severity: 'high',
                                    confidence: 0.88,
                                },
                            ],
                        },
                    ],
                    spatial: [
                        {
                            type: 'territory',
                            locations: [
                                {
                                    id: 'loc-3',
                                    name: 'Trading Floor',
                                    visits: 95,
                                    averageDuration: 420,
                                    timeDistribution: { '9': 0.5, '10': 0.3, '11': 0.2 },
                                    purpose: 'Trading',
                                },
                            ],
                            routes: [],
                            territories: [
                                {
                                    id: 'territory-2',
                                    center: { lat: 40.7128, lng: -74.006 },
                                    radius: 500,
                                    confidence: 0.95,
                                    activityLevel: 0.98,
                                },
                            ],
                        },
                    ],
                    communication: [
                        {
                            type: 'network',
                            contacts: [
                                {
                                    id: 'contact-2',
                                    name: 'Trading Team',
                                    relationship: 'team',
                                    frequency: 85,
                                    averageResponseTime: 12,
                                    preferredChannels: ['bloomberg', 'phone'],
                                    topicDistribution: { markets: 0.9, strategy: 0.1 },
                                },
                            ],
                            channels: [
                                {
                                    type: 'bloomberg_terminal',
                                    usage: 95,
                                    timing: { '9': 0.4, '10': 0.3, '11': 0.3 },
                                    avgMessageLength: 45,
                                    networkSize: 23,
                                },
                            ],
                            networkMetrics: {
                                totalContacts: 87,
                                activeContacts: 23,
                                networkDensity: 0.85,
                                centralityScore: 0.92,
                                communityCount: 2,
                            },
                        },
                    ],
                    transaction: [
                        {
                            type: 'investment',
                            categories: [
                                {
                                    name: 'Equity Trading',
                                    frequency: 145,
                                    averageAmount: 25000,
                                    timeDistribution: { '9': 0.3, '10': 0.4, '11': 0.3 },
                                    vendorDiversity: 8,
                                    riskLevel: 'medium',
                                },
                            ],
                            cashFlow: {
                                inflow: {
                                    total: 450000,
                                    sources: { trading: 450000 },
                                    regularity: 0.75,
                                },
                                outflow: {
                                    total: 280000,
                                    categories: { investments: 280000 },
                                    predictability: 0.65,
                                },
                                balance: { average: 750000, volatility: 0.45, trend: 'stable' },
                            },
                            anomalies: [
                                {
                                    type: 'unusual_amount',
                                    description: 'Single trade 5x larger than average',
                                    amount: 125000,
                                    timestamp: new Date('2024-01-20T22:30:00'),
                                    riskScore: 75,
                                },
                            ],
                        },
                    ],
                    digital: [
                        {
                            type: 'app_usage',
                            webActivity: {
                                categories: { financial: 0.8, news: 0.15, social: 0.05 },
                                timeDistribution: { '9': 0.4, '10': 0.3, '14': 0.3 },
                                searchPatterns: [
                                    'market analysis',
                                    'economic indicators',
                                    'trading strategies',
                                ],
                                siteFrequency: {
                                    'bloomberg.com': 195,
                                    'reuters.com': 87,
                                    'wsj.com': 45,
                                },
                            },
                            deviceUsage: {
                                devices: [
                                    {
                                        type: 'trading_workstation',
                                        usage: 0.95,
                                        location: 'office',
                                        security: {
                                            updates: true,
                                            encryption: true,
                                            riskScore: 10,
                                        },
                                    },
                                ],
                                apps: [
                                    {
                                        name: 'Bloomberg Terminal',
                                        category: 'financial',
                                        usage: 0.8,
                                        permissions: ['market_data'],
                                        riskLevel: 'low',
                                    },
                                    {
                                        name: 'TradingView',
                                        category: 'analysis',
                                        usage: 0.4,
                                        permissions: ['charts'],
                                        riskLevel: 'low',
                                    },
                                ],
                            },
                            securityBehavior: {
                                passwordHygiene: 95,
                                mfaUsage: true,
                                updateCompliance: 98,
                                suspiciousActivity: [],
                            },
                        },
                    ],
                },
                baseline: {
                    established: new Date('2023-10-01'),
                    confidence: 0.94,
                    stability: 0.91,
                    sampleSize: 8760,
                },
                riskScore: 65,
                anomalyScore: 45,
                tags: ['medium-risk', 'financial-professional', 'anomaly-detected'],
                metadata: { occupation: 'Senior Trader', department: 'Trading' },
            },
        ];
        const mockAnomalies = [
            {
                id: 'anomaly-1',
                profileId: 'profile-1',
                type: 'pattern_break',
                category: 'temporal',
                anomaly: {
                    description: 'Significant deviation from normal sleep pattern - active at 3:30 AM',
                    severity: 'medium',
                    confidence: 0.75,
                    timestamp: new Date('2024-01-15T03:30:00'),
                    duration: 45,
                    deviationScore: 2.8,
                },
                context: {
                    baseline: {
                        averageActivityStart: '08:30',
                        averageActivityEnd: '22:45',
                    },
                    observed: { activityTime: '03:30', duration: 45 },
                    expectedRange: { min: 0, max: 0.1 },
                    historicalComparisons: [
                        { period: 'last_week', similarity: 0.15 },
                        { period: 'last_month', similarity: 0.08 },
                    ],
                },
                impact: {
                    riskIncrease: 15,
                    affectedPatterns: ['sleep_schedule', 'work_productivity'],
                    cascadingEffects: ['next_day_fatigue', 'irregular_schedule'],
                },
                recommendations: [
                    {
                        action: 'Monitor for recurring pattern',
                        priority: 'medium',
                        rationale: 'Single occurrence may indicate stress or urgent deadline',
                    },
                    {
                        action: 'Check for correlation with project deadlines',
                        priority: 'low',
                        rationale: 'Work pressure could explain the deviation',
                    },
                ],
            },
            {
                id: 'anomaly-2',
                profileId: 'profile-2',
                type: 'statistical',
                category: 'financial',
                anomaly: {
                    description: 'Trade size 500% above normal - $125,000 vs typical $25,000',
                    severity: 'high',
                    confidence: 0.88,
                    timestamp: new Date('2024-01-20T22:30:00'),
                    deviationScore: 5.2,
                },
                context: {
                    baseline: { averageTradeSize: 25000, maxTradeSize: 50000 },
                    observed: { tradeSize: 125000, timeOfDay: '22:30' },
                    expectedRange: { min: 10000, max: 50000 },
                    historicalComparisons: [
                        { period: 'last_quarter', similarity: 0.02 },
                        { period: 'last_year', similarity: 0.01 },
                    ],
                },
                impact: {
                    riskIncrease: 35,
                    affectedPatterns: ['risk_management', 'position_sizing'],
                    cascadingEffects: ['portfolio_exposure', 'compliance_review'],
                },
                recommendations: [
                    {
                        action: 'Immediate compliance review',
                        priority: 'high',
                        rationale: 'Trade size exceeds normal risk parameters',
                    },
                    {
                        action: 'Verify authorization for large trade',
                        priority: 'high',
                        rationale: 'Outside normal trading hours and size limits',
                    },
                    {
                        action: 'Monitor account for additional unusual activity',
                        priority: 'medium',
                        rationale: 'May indicate compromised account or insider information',
                    },
                ],
            },
        ];
        setProfiles(mockProfiles);
        setAnomalies(mockAnomalies);
    }, []);
    // Initialize data
    (0, react_1.useEffect)(() => {
        if (profiles.length === 0) {
            generateMockData();
        }
    }, [generateMockData, profiles.length]);
    // Run Behavioral Analysis
    const runBehavioralAnalysis = (0, react_1.useCallback)(async (profileId) => {
        setIsAnalyzing(true);
        // Simulate analysis processing
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const results = {
            timestamp: new Date(),
            profilesAnalyzed: profileId ? 1 : profiles.length,
            anomaliesDetected: anomalies.filter((a) => !profileId || a.profileId === profileId).length,
            riskAssessment: {
                overall: profileId
                    ? profiles.find((p) => p.id === profileId)?.riskScore || 0
                    : Math.round(profiles.reduce((acc, p) => acc + p.riskScore, 0) /
                        profiles.length),
                trending: 'stable',
                criticalFindings: anomalies.filter((a) => a.anomaly.severity === 'high' ||
                    a.anomaly.severity === 'critical').length,
            },
            patternSummary: {
                temporalPatterns: profiles.reduce((acc, p) => acc + p.patterns.temporal.length, 0),
                spatialPatterns: profiles.reduce((acc, p) => acc + p.patterns.spatial.length, 0),
                behavioralAnomalies: anomalies.length,
                stabilityScore: profiles.reduce((acc, p) => acc + p.baseline.stability, 0) /
                    profiles.length,
            },
        };
        setAnalysisResults(results);
        setIsAnalyzing(false);
        onAnalysisComplete?.(results);
    }, [profiles, anomalies, onAnalysisComplete]);
    // Handle Profile Selection
    const handleProfileSelect = (0, react_1.useCallback)((profile) => {
        setSelectedProfile(profile);
        onProfileSelect?.(profile);
    }, [onProfileSelect]);
    // Filtered Data
    const filteredAnomalies = (0, react_1.useMemo)(() => {
        return anomalies.filter((anomaly) => {
            const matchesSeverity = filterSeverity === 'all' || anomaly.anomaly.severity === filterSeverity;
            const matchesType = filterType === 'all' || anomaly.type === filterType;
            const matchesSearch = searchTerm === '' ||
                anomaly.anomaly.description
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase());
            return matchesSeverity && matchesType && matchesSearch;
        });
    }, [anomalies, filterSeverity, filterType, searchTerm]);
    const filteredProfiles = (0, react_1.useMemo)(() => {
        return profiles.filter((profile) => {
            const matchesSearch = searchTerm === '' ||
                profile.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                profile.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()));
            return matchesSearch;
        });
    }, [profiles, searchTerm]);
    return (<div className="behavioral-analytics">
      {/* Header */}
      <div className="ba-header">
        <div className="header-main">
          <h2>🧠 Behavioral Analytics & Anomaly Detection</h2>
          <div className="header-stats">
            <span className="stat">
              <strong>{filteredProfiles.length}</strong> Profiles
            </span>
            <span className="stat">
              <strong>{filteredAnomalies.length}</strong> Anomalies
            </span>
            <span className="stat">
              <strong>
                {profiles.reduce((acc, p) => acc + (p.anomalyScore > 50 ? 1 : 0), 0)}
              </strong>{' '}
              High Risk
            </span>
          </div>
        </div>

        <div className="header-controls">
          <input type="text" placeholder="Search profiles and anomalies..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-input"/>
          <select value={selectedTimeframe} onChange={(e) => setSelectedTimeframe(e.target.value)} className="timeframe-select">
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          <button onClick={() => runBehavioralAnalysis()} disabled={isAnalyzing} className="analyze-button">
            {isAnalyzing ? '🔍 Analyzing...' : '🔍 Run Analysis'}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="ba-tabs">
        <button className={`tab-button ${activeTab === 'profiles' ? 'active' : ''}`} onClick={() => setActiveTab('profiles')}>
          👤 Profiles
        </button>
        <button className={`tab-button ${activeTab === 'patterns' ? 'active' : ''}`} onClick={() => setActiveTab('patterns')}>
          📊 Patterns
        </button>
        <button className={`tab-button ${activeTab === 'anomalies' ? 'active' : ''}`} onClick={() => setActiveTab('anomalies')}>
          🚨 Anomalies
        </button>
        <button className={`tab-button ${activeTab === 'analysis' ? 'active' : ''}`} onClick={() => setActiveTab('analysis')}>
          🔬 Analysis
        </button>
        <button className={`tab-button ${activeTab === 'insights' ? 'active' : ''}`} onClick={() => setActiveTab('insights')}>
          💡 Insights
        </button>
      </div>

      <div className="ba-content">
        {/* Profiles Tab */}
        {activeTab === 'profiles' && (<div className="profiles-tab">
            <div className="profiles-grid">
              {filteredProfiles.map((profile) => (<div key={profile.id} className={`profile-card ${selectedProfile?.id === profile.id ? 'selected' : ''}`} onClick={() => handleProfileSelect(profile)}>
                  <div className="profile-header">
                    <div className="profile-info">
                      <h3>{profile.name}</h3>
                      <span className="entity-type">{profile.entityType}</span>
                    </div>
                    <div className="profile-scores">
                      <span className={`risk-score ${profile.riskScore > 70
                    ? 'high'
                    : profile.riskScore > 40
                        ? 'medium'
                        : 'low'}`}>
                        Risk: {profile.riskScore}
                      </span>
                      <span className={`anomaly-score ${profile.anomalyScore > 60
                    ? 'high'
                    : profile.anomalyScore > 30
                        ? 'medium'
                        : 'low'}`}>
                        Anomaly: {profile.anomalyScore}
                      </span>
                    </div>
                  </div>

                  <div className="profile-metrics">
                    <div className="metric">
                      <span className="metric-label">Baseline Confidence</span>
                      <div className="metric-bar">
                        <div className="metric-fill" style={{
                    width: `${profile.baseline.confidence * 100}%`,
                }}></div>
                      </div>
                      <span className="metric-value">
                        {(profile.baseline.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">Pattern Stability</span>
                      <div className="metric-bar">
                        <div className="metric-fill" style={{
                    width: `${profile.baseline.stability * 100}%`,
                }}></div>
                      </div>
                      <span className="metric-value">
                        {(profile.baseline.stability * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  <div className="profile-patterns">
                    <div className="pattern-count">
                      📅 {profile.patterns.temporal.length} Temporal
                    </div>
                    <div className="pattern-count">
                      📍 {profile.patterns.spatial.length} Spatial
                    </div>
                    <div className="pattern-count">
                      💬 {profile.patterns.communication.length} Communication
                    </div>
                    <div className="pattern-count">
                      💰 {profile.patterns.transaction.length} Transaction
                    </div>
                  </div>

                  <div className="profile-tags">
                    {profile.tags.slice(0, 3).map((tag) => (<span key={tag} className="tag">
                        {tag}
                      </span>))}
                  </div>
                </div>))}
            </div>

            {selectedProfile && (<div className="profile-details">
                <div className="details-header">
                  <h3>Profile Details: {selectedProfile.name}</h3>
                  <button onClick={() => runBehavioralAnalysis(selectedProfile.id)} className="analyze-profile-button" disabled={isAnalyzing}>
                    {isAnalyzing ? 'Analyzing...' : 'Analyze Profile'}
                  </button>
                </div>

                <div className="profile-overview">
                  <div className="overview-section">
                    <h4>Time Window</h4>
                    <div className="time-info">
                      <div>
                        <strong>Duration:</strong>{' '}
                        {selectedProfile.timeWindow.duration}
                      </div>
                      <div>
                        <strong>Start:</strong>{' '}
                        {selectedProfile.timeWindow.start.toLocaleDateString()}
                      </div>
                      <div>
                        <strong>End:</strong>{' '}
                        {selectedProfile.timeWindow.end.toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="overview-section">
                    <h4>Baseline Metrics</h4>
                    <div className="baseline-info">
                      <div>
                        <strong>Established:</strong>{' '}
                        {selectedProfile.baseline.established.toLocaleDateString()}
                      </div>
                      <div>
                        <strong>Sample Size:</strong>{' '}
                        {selectedProfile.baseline.sampleSize.toLocaleString()}
                      </div>
                      <div>
                        <strong>Confidence:</strong>{' '}
                        {(selectedProfile.baseline.confidence * 100).toFixed(1)}
                        %
                      </div>
                      <div>
                        <strong>Stability:</strong>{' '}
                        {(selectedProfile.baseline.stability * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>)}
          </div>)}

        {/* Patterns Tab */}
        {activeTab === 'patterns' && selectedProfile && (<div className="patterns-tab">
            <div className="pattern-categories">
              <div className="pattern-category">
                <h3>📅 Temporal Patterns</h3>
                {selectedProfile.patterns.temporal.map((pattern, index) => (<div key={index} className="pattern-item">
                    <div className="pattern-header">
                      <span className="pattern-type">{pattern.type}</span>
                      <span className="pattern-cyclicity">
                        Cyclicity:{' '}
                        {(pattern.schedule.cyclicity * 100).toFixed(0)}%
                      </span>
                    </div>

                    <div className="pattern-peaks">
                      <h5>Activity Peaks</h5>
                      {pattern.schedule.peaks.map((peak, i) => (<div key={i} className="peak-item">
                          <span>{peak.time}</span>
                          <span className="intensity">
                            Intensity: {(peak.intensity * 100).toFixed(0)}%
                          </span>
                          <span className="confidence">
                            Confidence: {(peak.confidence * 100).toFixed(0)}%
                          </span>
                        </div>))}
                    </div>

                    {pattern.anomalies.length > 0 && (<div className="pattern-anomalies">
                        <h5>Pattern Anomalies</h5>
                        {pattern.anomalies.map((anomaly, i) => (<div key={i} className={`anomaly-item ${anomaly.severity}`}>
                            <div className="anomaly-time">
                              {anomaly.timestamp.toLocaleString()}
                            </div>
                            <div className="anomaly-desc">
                              {anomaly.description}
                            </div>
                          </div>))}
                      </div>)}
                  </div>))}
              </div>

              <div className="pattern-category">
                <h3>📍 Spatial Patterns</h3>
                {selectedProfile.patterns.spatial.map((pattern, index) => (<div key={index} className="pattern-item">
                    <div className="pattern-header">
                      <span className="pattern-type">{pattern.type}</span>
                    </div>

                    <div className="locations-list">
                      <h5>Frequent Locations</h5>
                      {pattern.locations.map((location, i) => (<div key={i} className="location-item">
                          <div className="location-name">{location.name}</div>
                          <div className="location-stats">
                            <span>Visits: {location.visits}</span>
                            <span>
                              Avg Duration:{' '}
                              {Math.round(location.averageDuration / 60)}h
                            </span>
                            {location.purpose && (<span>Purpose: {location.purpose}</span>)}
                          </div>
                        </div>))}
                    </div>

                    {pattern.territories.length > 0 && (<div className="territories-list">
                        <h5>Activity Territories</h5>
                        {pattern.territories.map((territory, i) => (<div key={i} className="territory-item">
                            <div>
                              <strong>Territory {i + 1}</strong>
                              <span>
                                Confidence:{' '}
                                {(territory.confidence * 100).toFixed(0)}%
                              </span>
                            </div>
                            <div>
                              Activity Level:{' '}
                              {(territory.activityLevel * 100).toFixed(0)}%
                            </div>
                          </div>))}
                      </div>)}
                  </div>))}
              </div>

              <div className="pattern-category">
                <h3>💰 Transaction Patterns</h3>
                {selectedProfile.patterns.transaction.map((pattern, index) => (<div key={index} className="pattern-item">
                    <div className="pattern-header">
                      <span className="pattern-type">{pattern.type}</span>
                    </div>

                    <div className="transaction-categories">
                      <h5>Spending Categories</h5>
                      {pattern.categories.map((category, i) => (<div key={i} className="category-item">
                          <div className="category-name">{category.name}</div>
                          <div className="category-stats">
                            <span>Frequency: {category.frequency}/month</span>
                            <span>
                              Avg Amount: $
                              {category.averageAmount.toLocaleString()}
                            </span>
                            <span className={`risk-level ${category.riskLevel}`}>
                              {category.riskLevel} risk
                            </span>
                          </div>
                        </div>))}
                    </div>

                    <div className="cashflow-summary">
                      <h5>Cash Flow Analysis</h5>
                      <div className="cashflow-item">
                        <strong>Inflow:</strong> $
                        {pattern.cashFlow.inflow.total.toLocaleString()}
                        <span>
                          (Regularity:{' '}
                          {(pattern.cashFlow.inflow.regularity * 100).toFixed(0)}
                          %)
                        </span>
                      </div>
                      <div className="cashflow-item">
                        <strong>Outflow:</strong> $
                        {pattern.cashFlow.outflow.total.toLocaleString()}
                        <span>
                          (Predictability:{' '}
                          {(pattern.cashFlow.outflow.predictability * 100).toFixed(0)}
                          %)
                        </span>
                      </div>
                      <div className="cashflow-item">
                        <strong>Average Balance:</strong> $
                        {pattern.cashFlow.balance.average.toLocaleString()}
                        <span className={`trend ${pattern.cashFlow.balance.trend}`}>
                          ({pattern.cashFlow.balance.trend})
                        </span>
                      </div>
                    </div>
                  </div>))}
              </div>
            </div>
          </div>)}

        {/* Anomalies Tab */}
        {activeTab === 'anomalies' && (<div className="anomalies-tab">
            <div className="anomalies-controls">
              <div className="filter-controls">
                <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)} className="filter-select">
                  <option value="all">All Severities</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
                <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="filter-select">
                  <option value="all">All Types</option>
                  <option value="statistical">Statistical</option>
                  <option value="pattern_break">Pattern Break</option>
                  <option value="contextual">Contextual</option>
                  <option value="collective">Collective</option>
                </select>
              </div>
            </div>

            <div className="anomalies-list">
              {filteredAnomalies.map((anomaly) => (<div key={anomaly.id} className={`anomaly-card ${anomaly.anomaly.severity}`}>
                  <div className="anomaly-header">
                    <div className="anomaly-main">
                      <h4>{anomaly.anomaly.description}</h4>
                      <div className="anomaly-meta">
                        <span className="anomaly-type">{anomaly.type}</span>
                        <span className="anomaly-category">
                          {anomaly.category}
                        </span>
                        <span className="anomaly-time">
                          {anomaly.anomaly.timestamp.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="anomaly-scores">
                      <span className={`severity-badge ${anomaly.anomaly.severity}`}>
                        {anomaly.anomaly.severity}
                      </span>
                      <span className="confidence-score">
                        {(anomaly.anomaly.confidence * 100).toFixed(0)}%
                        confidence
                      </span>
                      <span className="deviation-score">
                        {anomaly.anomaly.deviationScore.toFixed(1)}σ
                      </span>
                    </div>
                  </div>

                  <div className="anomaly-context">
                    <div className="context-section">
                      <h5>Context</h5>
                      <div className="context-comparison">
                        <div className="comparison-item">
                          <strong>Baseline:</strong>
                          <span>
                            {JSON.stringify(anomaly.context.baseline)}
                          </span>
                        </div>
                        <div className="comparison-item">
                          <strong>Observed:</strong>
                          <span>
                            {JSON.stringify(anomaly.context.observed)}
                          </span>
                        </div>
                        <div className="comparison-item">
                          <strong>Expected Range:</strong>
                          <span>
                            {anomaly.context.expectedRange.min} -{' '}
                            {anomaly.context.expectedRange.max}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="impact-section">
                      <h5>Impact Assessment</h5>
                      <div className="impact-details">
                        <div>
                          <strong>Risk Increase:</strong> +
                          {anomaly.impact.riskIncrease}%
                        </div>
                        <div>
                          <strong>Affected Patterns:</strong>
                          <div className="affected-patterns">
                            {anomaly.impact.affectedPatterns.map((pattern, i) => (<span key={i} className="pattern-tag">
                                  {pattern}
                                </span>))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="anomaly-recommendations">
                    <h5>Recommendations</h5>
                    <div className="recommendations-list">
                      {anomaly.recommendations.map((rec, i) => (<div key={i} className={`recommendation-item ${rec.priority}`}>
                          <div className="rec-header">
                            <span className="rec-action">{rec.action}</span>
                            <span className={`priority-badge ${rec.priority}`}>
                              {rec.priority}
                            </span>
                          </div>
                          <div className="rec-rationale">{rec.rationale}</div>
                        </div>))}
                    </div>
                  </div>
                </div>))}
            </div>
          </div>)}

        {/* Analysis Tab */}
        {activeTab === 'analysis' && (<div className="analysis-tab">
            <div className="analysis-controls">
              <div className="analysis-config">
                <h3>Analysis Configuration</h3>
                <div className="config-controls">
                  <div className="config-item">
                    <label>Sensitivity Level</label>
                    <input type="range" min="0" max="1" step="0.1" value={analysisConfig.sensitivityLevel} onChange={(e) => setAnalysisConfig({
                ...analysisConfig,
                sensitivityLevel: parseFloat(e.target.value),
            })}/>
                    <span>{analysisConfig.sensitivityLevel.toFixed(1)}</span>
                  </div>
                  <div className="config-item">
                    <label>Minimum Confidence</label>
                    <input type="range" min="0" max="1" step="0.05" value={analysisConfig.minConfidence} onChange={(e) => setAnalysisConfig({
                ...analysisConfig,
                minConfidence: parseFloat(e.target.value),
            })}/>
                    <span>
                      {(analysisConfig.minConfidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="config-checkboxes">
                    <label>
                      <input type="checkbox" checked={analysisConfig.includeContextual} onChange={(e) => setAnalysisConfig({
                ...analysisConfig,
                includeContextual: e.target.checked,
            })}/>
                      Include Contextual Analysis
                    </label>
                    <label>
                      <input type="checkbox" checked={analysisConfig.includeCollective} onChange={(e) => setAnalysisConfig({
                ...analysisConfig,
                includeCollective: e.target.checked,
            })}/>
                      Include Collective Behavior Analysis
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {analysisResults && (<div className="analysis-results">
                <h3>Analysis Results</h3>
                <div className="results-overview">
                  <div className="result-card">
                    <div className="result-value">
                      {analysisResults.profilesAnalyzed}
                    </div>
                    <div className="result-label">Profiles Analyzed</div>
                  </div>
                  <div className="result-card">
                    <div className="result-value">
                      {analysisResults.anomaliesDetected}
                    </div>
                    <div className="result-label">Anomalies Detected</div>
                  </div>
                  <div className="result-card">
                    <div className="result-value">
                      {analysisResults.riskAssessment.overall}
                    </div>
                    <div className="result-label">Overall Risk Score</div>
                  </div>
                  <div className="result-card">
                    <div className="result-value">
                      {analysisResults.riskAssessment.criticalFindings}
                    </div>
                    <div className="result-label">Critical Findings</div>
                  </div>
                </div>

                <div className="pattern-summary">
                  <h4>Pattern Analysis Summary</h4>
                  <div className="summary-metrics">
                    <div className="summary-item">
                      <strong>Temporal Patterns:</strong>{' '}
                      {analysisResults.patternSummary.temporalPatterns}
                    </div>
                    <div className="summary-item">
                      <strong>Spatial Patterns:</strong>{' '}
                      {analysisResults.patternSummary.spatialPatterns}
                    </div>
                    <div className="summary-item">
                      <strong>Behavioral Anomalies:</strong>{' '}
                      {analysisResults.patternSummary.behavioralAnomalies}
                    </div>
                    <div className="summary-item">
                      <strong>Average Stability Score:</strong>{' '}
                      {(analysisResults.patternSummary.stabilityScore * 100).toFixed(1)}
                      %
                    </div>
                  </div>
                </div>
              </div>)}

            {isAnalyzing && (<div className="analysis-loading">
                <div className="loading-spinner"></div>
                <span>Running behavioral analysis...</span>
              </div>)}
          </div>)}

        {/* Insights Tab */}
        {activeTab === 'insights' && (<div className="insights-tab">
            <div className="insights-dashboard">
              <div className="insight-card">
                <h3>🎯 Key Behavioral Insights</h3>
                <div className="insights-list">
                  <div className="insight-item">
                    <div className="insight-icon">📊</div>
                    <div className="insight-content">
                      <h4>Pattern Stability Analysis</h4>
                      <p>
                        87% of analyzed profiles show stable behavioral patterns
                        over the last 30 days, indicating predictable behavior
                        for most entities.
                      </p>
                    </div>
                  </div>
                  <div className="insight-item">
                    <div className="insight-icon">⚠️</div>
                    <div className="insight-content">
                      <h4>Anomaly Concentration</h4>
                      <p>
                        68% of detected anomalies occur during off-hours (6 PM -
                        6 AM), suggesting either deliberate evasion or
                        legitimate urgent work.
                      </p>
                    </div>
                  </div>
                  <div className="insight-item">
                    <div className="insight-icon">💰</div>
                    <div className="insight-content">
                      <h4>Financial Risk Correlation</h4>
                      <p>
                        High-value transactions show 3.2x higher anomaly rates,
                        indicating increased scrutiny needed for financial
                        patterns above $50K.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="insight-card">
                <h3>🔮 Predictive Analysis</h3>
                <div className="predictions-list">
                  <div className="prediction-item">
                    <h4>Risk Trend Forecast</h4>
                    <div className="prediction-chart">
                      <div className="trend-line stable">
                        <span>
                          Overall risk levels expected to remain stable over
                          next 7 days
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="prediction-item">
                    <h4>Anomaly Likelihood</h4>
                    <div className="likelihood-bars">
                      <div className="likelihood-bar">
                        <span>Weekend Activity</span>
                        <div className="bar-container">
                          <div className="bar-fill" style={{ width: '75%' }}></div>
                        </div>
                        <span>75%</span>
                      </div>
                      <div className="likelihood-bar">
                        <span>Large Transactions</span>
                        <div className="bar-container">
                          <div className="bar-fill" style={{ width: '45%' }}></div>
                        </div>
                        <span>45%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="insight-card">
                <h3>📋 Recommended Actions</h3>
                <div className="actions-list">
                  <div className="action-item high">
                    <div className="action-priority">HIGH</div>
                    <div className="action-content">
                      <h4>Review Large Transaction Anomaly</h4>
                      <p>
                        Maria Rodriguez profile shows $125K trade outside normal
                        parameters
                      </p>
                      <div className="action-deadline">
                        Due: Within 24 hours
                      </div>
                    </div>
                  </div>
                  <div className="action-item medium">
                    <div className="action-priority">MEDIUM</div>
                    <div className="action-content">
                      <h4>Monitor Off-Hours Activity Patterns</h4>
                      <p>
                        Increase monitoring sensitivity for activities between
                        10 PM - 6 AM
                      </p>
                      <div className="action-deadline">Due: Within 3 days</div>
                    </div>
                  </div>
                  <div className="action-item low">
                    <div className="action-priority">LOW</div>
                    <div className="action-content">
                      <h4>Update Baseline Models</h4>
                      <p>
                        Refresh behavioral baselines for profiles with stability
                        &lt; 80%
                      </p>
                      <div className="action-deadline">Due: Within 1 week</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>)}
      </div>
    </div>);
};
exports.default = BehavioralAnalytics;
