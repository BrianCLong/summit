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
const GeospatialIntelligence = ({ investigationId, initialCenter = { latitude: 40.7128, longitude: -74.006 }, // NYC default
onPointSelect = () => { }, onTrackAnalysis = () => { }, onGeofenceAlert = () => { }, onSpatialAnalysis = () => { }, className = '', }) => {
    const [activeView, setActiveView] = (0, react_1.useState)('map');
    const [mapCenter, setMapCenter] = (0, react_1.useState)(initialCenter);
    const [mapZoom, setMapZoom] = (0, react_1.useState)(12);
    const [geospatialPoints, setGeospatialPoints] = (0, react_1.useState)([]);
    const [movementTracks, setMovementTracks] = (0, react_1.useState)([]);
    const [geofenceZones, setGeofenceZones] = (0, react_1.useState)([]);
    const [spatialAnalyses, setSpatialAnalyses] = (0, react_1.useState)([]);
    const [selectedPoint, setSelectedPoint] = (0, react_1.useState)(null);
    const [selectedTrack, setSelectedTrack] = (0, react_1.useState)(null);
    const [isAnalyzing, setIsAnalyzing] = (0, react_1.useState)(false);
    const [layerVisibility, setLayerVisibility] = (0, react_1.useState)({
        points: true,
        tracks: true,
        geofences: true,
        heatmap: false,
        satellite: false,
    });
    const [timeRange, setTimeRange] = (0, react_1.useState)({
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date(),
    });
    const [searchQuery, setSearchQuery] = (0, react_1.useState)('');
    (0, react_1.useEffect)(() => {
        generateMockGeospatialData();
        generateMockMovementTracks();
        generateMockGeofenceZones();
        generateMockSpatialAnalyses();
    }, [investigationId]);
    const generateMockGeospatialData = () => {
        const pointTypes = [
            'person',
            'event',
            'facility',
            'device',
            'vehicle',
            'poi',
            'incident',
            'surveillance',
        ];
        const sources = [
            'gps',
            'cell_tower',
            'wifi',
            'ip_geolocation',
            'manual',
            'imagery',
            'osint',
            'witness',
        ];
        const tagOptions = ['surveillance', 'meeting', 'residence', 'commercial'];
        const mockPoints = Array.from({ length: 150 }, (_, i) => {
            const latOffset = (Math.random() - 0.5) * 0.2; // ~11km radius
            const lngOffset = (Math.random() - 0.5) * 0.2;
            return {
                id: `point-${String(i + 1).padStart(3, '0')}`,
                name: `Location ${i + 1}`,
                type: pointTypes[Math.floor(Math.random() * pointTypes.length)],
                coordinates: {
                    latitude: mapCenter.latitude + latOffset,
                    longitude: mapCenter.longitude + lngOffset,
                    altitude: Math.random() > 0.7
                        ? Math.floor(Math.random() * 500) + 10
                        : undefined,
                    accuracy: Math.floor(Math.random() * 50) + 5,
                },
                address: {
                    street: `${Math.floor(Math.random() * 999) + 1} ${['Main', 'Oak', 'First', 'Second', 'Park', 'Washington'][Math.floor(Math.random() * 6)]} St`,
                    city: ['New York', 'Brooklyn', 'Queens', 'Manhattan', 'Bronx'][Math.floor(Math.random() * 5)],
                    state: 'NY',
                    country: 'United States',
                    postalCode: `${Math.floor(Math.random() * 90000) + 10000}`,
                },
                timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
                confidence: Math.random() * 40 + 60,
                source: sources[Math.floor(Math.random() * sources.length)],
                metadata: {
                    elevation: Math.floor(Math.random() * 100) + 1,
                    description: `Mock location data point ${i + 1}`,
                    deviceId: Math.random() > 0.5
                        ? `device-${Math.floor(Math.random() * 100)}`
                        : undefined,
                },
                associations: Math.random() > 0.7
                    ? [
                        {
                            id: `entity-${Math.floor(Math.random() * 50)}`,
                            type: ['person', 'event', 'device'][Math.floor(Math.random() * 3)],
                            relationship: ['owner', 'participant', 'witness'][Math.floor(Math.random() * 3)],
                            confidence: Math.random() * 30 + 70,
                        },
                    ]
                    : [],
                tags: Math.random() > 0.5
                    ? [
                        tagOptions[Math.floor(Math.random() * tagOptions.length)],
                    ]
                    : [],
                riskLevel: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
            };
        });
        setGeospatialPoints(mockPoints);
    };
    const generateMockMovementTracks = () => {
        const mockTracks = Array.from({ length: 15 }, (_, i) => {
            const trackPoints = Array.from({ length: Math.floor(Math.random() * 20) + 5 }, (_, j) => {
                const timeOffset = j * 15 * 60 * 1000; // 15 minutes apart
                const latOffset = (Math.random() - 0.5) * 0.05;
                const lngOffset = (Math.random() - 0.5) * 0.05;
                return {
                    id: `track-${i}-point-${j}`,
                    name: `Track ${i + 1} Point ${j + 1}`,
                    type: 'device',
                    coordinates: {
                        latitude: mapCenter.latitude + latOffset + j * 0.001,
                        longitude: mapCenter.longitude + lngOffset + j * 0.001,
                        accuracy: Math.floor(Math.random() * 20) + 5,
                    },
                    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000 + timeOffset),
                    confidence: Math.random() * 20 + 80,
                    source: 'gps',
                    metadata: {
                        speed: Math.random() * 60 + 10,
                        bearing: Math.random() * 360,
                    },
                    associations: [],
                    tags: [],
                    riskLevel: 'low',
                };
            });
            const startTime = trackPoints[0].timestamp;
            const endTime = trackPoints[trackPoints.length - 1].timestamp;
            const totalDistance = Math.random() * 50 + 5; // km
            return {
                id: `track-${String(i + 1).padStart(3, '0')}`,
                entityId: `entity-${i + 1}`,
                entityType: ['person', 'vehicle', 'device'][Math.floor(Math.random() * 3)],
                points: trackPoints,
                startTime,
                endTime,
                totalDistance,
                averageSpeed: totalDistance /
                    ((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)),
                maxSpeed: Math.random() * 80 + 20,
                trajectory: {
                    straightLine: Math.random() > 0.7,
                    circularPattern: Math.random() > 0.8,
                    repeatingRoute: Math.random() > 0.6,
                    anomalousMovement: Math.random() > 0.9,
                },
                analysis: {
                    frequentLocations: [
                        {
                            coordinates: {
                                latitude: mapCenter.latitude + Math.random() * 0.1,
                                longitude: mapCenter.longitude + Math.random() * 0.1,
                            },
                            visits: Math.floor(Math.random() * 20) + 5,
                            totalDuration: Math.random() * 480 + 60,
                            name: 'Frequent Location A',
                        },
                    ],
                    patterns: [
                        {
                            type: 'daily_routine',
                            description: 'Regular morning commute pattern detected',
                            confidence: Math.random() * 30 + 70,
                            timeFrame: { start: startTime, end: endTime },
                        },
                    ],
                    velocityProfile: trackPoints.map((point) => ({
                        timestamp: point.timestamp,
                        speed: point.metadata.speed || 0,
                        acceleration: Math.random() * 2 - 1,
                    })),
                },
            };
        });
        setMovementTracks(mockTracks);
    };
    const generateMockGeofenceZones = () => {
        const mockZones = [
            {
                id: 'geofence-001',
                name: 'High Security Zone',
                type: 'exclusion',
                shape: 'circle',
                geometry: {
                    center: {
                        latitude: mapCenter.latitude + 0.01,
                        longitude: mapCenter.longitude + 0.01,
                    },
                    radius: 500,
                },
                alerts: [
                    {
                        id: 'alert-001',
                        entityId: 'entity-001',
                        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
                        alertType: 'entry',
                        duration: 15,
                        details: 'Unauthorized entry detected',
                    },
                ],
                rules: {
                    dwellTimeLimit: 5,
                    activeHours: { start: '00:00', end: '23:59' },
                    activeDays: [0, 1, 2, 3, 4, 5, 6],
                },
                isActive: true,
                createdBy: 'Security Team',
                createdDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
            {
                id: 'geofence-002',
                name: 'Surveillance Perimeter',
                type: 'alert',
                shape: 'polygon',
                geometry: {
                    points: [
                        {
                            latitude: mapCenter.latitude - 0.02,
                            longitude: mapCenter.longitude - 0.02,
                        },
                        {
                            latitude: mapCenter.latitude - 0.02,
                            longitude: mapCenter.longitude + 0.02,
                        },
                        {
                            latitude: mapCenter.latitude + 0.02,
                            longitude: mapCenter.longitude + 0.02,
                        },
                        {
                            latitude: mapCenter.latitude + 0.02,
                            longitude: mapCenter.longitude - 0.02,
                        },
                    ],
                },
                alerts: [],
                rules: {
                    speedLimit: 50,
                    activeHours: { start: '18:00', end: '06:00' },
                },
                isActive: true,
                createdBy: 'Intelligence Team',
                createdDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
            },
        ];
        setGeofenceZones(mockZones);
    };
    const generateMockSpatialAnalyses = () => {
        const mockAnalyses = [
            {
                id: 'analysis-001',
                type: 'hotspot',
                name: 'Activity Hotspot Downtown',
                description: 'Increased activity concentration in downtown area',
                area: {
                    center: {
                        latitude: mapCenter.latitude,
                        longitude: mapCenter.longitude,
                    },
                    radius: 1000,
                    boundingBox: {
                        north: mapCenter.latitude + 0.01,
                        south: mapCenter.latitude - 0.01,
                        east: mapCenter.longitude + 0.01,
                        west: mapCenter.longitude - 0.01,
                    },
                },
                metrics: {
                    density: 75.4,
                    significance: 0.85,
                    confidence: 92.3,
                    timeFrame: {
                        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                        end: new Date(),
                    },
                },
                entities: ['entity-001', 'entity-005', 'entity-012', 'entity-018'],
                insights: [
                    {
                        type: 'temporal',
                        description: 'Peak activity occurs between 2-4 PM daily',
                        evidence: ['point-024', 'point-087', 'point-134'],
                        confidence: 87.5,
                    },
                    {
                        type: 'behavioral',
                        description: 'Multiple entities show converging movement patterns',
                        evidence: ['track-003', 'track-007', 'track-011'],
                        confidence: 79.2,
                    },
                ],
                visualizations: [
                    {
                        type: 'heatmap',
                        data: { intensity: 'high', radius: 50 },
                    },
                ],
            },
            {
                id: 'analysis-002',
                type: 'pattern',
                name: 'Recurring Movement Pattern',
                description: 'Daily recurring movement between residential and commercial areas',
                area: {
                    center: {
                        latitude: mapCenter.latitude + 0.05,
                        longitude: mapCenter.longitude - 0.03,
                    },
                    radius: 2000,
                },
                metrics: {
                    density: 45.7,
                    significance: 0.92,
                    confidence: 94.1,
                    timeFrame: {
                        start: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
                        end: new Date(),
                    },
                },
                entities: ['entity-003', 'entity-009'],
                insights: [
                    {
                        type: 'temporal',
                        description: 'Pattern repeats every weekday with 95% consistency',
                        evidence: ['track-002', 'track-008'],
                        confidence: 95.3,
                    },
                ],
                visualizations: [
                    {
                        type: 'flow_map',
                        data: { arrows: true, thickness: 'proportional' },
                    },
                ],
            },
        ];
        setSpatialAnalyses(mockAnalyses);
    };
    const performSpatialAnalysis = async (type) => {
        setIsAnalyzing(true);
        // Simulate analysis delay
        await new Promise((resolve) => setTimeout(resolve, 3000));
        const newAnalysis = {
            id: `analysis-${Date.now()}`,
            type,
            name: `${type.charAt(0).toUpperCase() + type.slice(1)} Analysis`,
            description: `Automated ${type} analysis of current data`,
            area: {
                center: mapCenter,
                radius: 1000,
            },
            metrics: {
                density: Math.random() * 100,
                significance: Math.random(),
                confidence: Math.random() * 30 + 70,
                timeFrame: timeRange,
            },
            entities: geospatialPoints.slice(0, 10).map((p) => p.id),
            insights: [
                {
                    type: 'spatial',
                    description: `${type} analysis reveals significant spatial clustering`,
                    evidence: geospatialPoints.slice(0, 3).map((p) => p.id),
                    confidence: Math.random() * 20 + 80,
                },
            ],
            visualizations: [
                {
                    type: 'heatmap',
                    data: { type },
                },
            ],
        };
        setSpatialAnalyses((prev) => [newAnalysis, ...prev]);
        onSpatialAnalysis(newAnalysis);
        setIsAnalyzing(false);
    };
    const createGeofence = (name, type, coordinates, radius) => {
        const newGeofence = {
            id: `geofence-${Date.now()}`,
            name,
            type,
            shape: 'circle',
            geometry: {
                center: coordinates,
                radius,
            },
            alerts: [],
            rules: {
                dwellTimeLimit: 15,
                activeHours: { start: '00:00', end: '23:59' },
                activeDays: [0, 1, 2, 3, 4, 5, 6],
            },
            isActive: true,
            createdBy: 'Current User',
            createdDate: new Date(),
        };
        setGeofenceZones((prev) => [newGeofence, ...prev]);
    };
    const getLocationIntelligence = async (coordinates) => {
        // Simulate OSINT data collection
        await new Promise((resolve) => setTimeout(resolve, 1500));
        return {
            coordinates,
            address: `${Math.floor(Math.random() * 999) + 1} Intelligence Ave, Analytics City, NY ${Math.floor(Math.random() * 90000) + 10000}`,
            type: ['residential', 'commercial', 'industrial', 'government'][Math.floor(Math.random() * 4)],
            osintData: {
                businessInfo: Math.random() > 0.5
                    ? {
                        name: 'Intelligence Analytics Corp',
                        type: 'Technology Company',
                        hours: '9:00 AM - 6:00 PM',
                        phone: '+1 (555) 123-4567',
                        website: 'https://example.com',
                        reviews: Math.floor(Math.random() * 500) + 10,
                        rating: Math.random() * 2 + 3,
                    }
                    : undefined,
                demographics: {
                    population: Math.floor(Math.random() * 50000) + 5000,
                    medianIncome: Math.floor(Math.random() * 50000) + 30000,
                    crimeRate: Math.random() * 10 + 2,
                    educationLevel: 'College Graduate',
                },
                infrastructure: {
                    nearbyTransport: ['Bus Stop', 'Subway Station', 'Airport'],
                    utilities: ['Power Grid', 'Water', 'Gas', 'Internet'],
                    internetProviders: ['Verizon', 'AT&T', 'Comcast'],
                    cellTowers: [
                        { provider: 'Verizon', distance: 250, signal: 'Strong' },
                        { provider: 'AT&T', distance: 400, signal: 'Moderate' },
                    ],
                },
                imagery: {
                    satelliteDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    streetViewAvailable: true,
                    buildingHeight: Math.floor(Math.random() * 50) + 5,
                    parkingSpaces: Math.floor(Math.random() * 100) + 10,
                    securityFeatures: [
                        'CCTV Cameras',
                        'Security Guard',
                        'Access Control',
                    ],
                },
            },
            threatAssessment: {
                riskLevel: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
                factors: [
                    'High foot traffic',
                    'Multiple entry points',
                    'Limited surveillance',
                ],
                mitigations: [
                    'Increase security presence',
                    'Install additional cameras',
                    'Restrict access',
                ],
            },
        };
    };
    const filteredPoints = geospatialPoints.filter((point) => point.timestamp >= timeRange.start &&
        point.timestamp <= timeRange.end &&
        (searchQuery === '' ||
            point.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            point.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))));
    const filteredTracks = movementTracks.filter((track) => track.startTime >= timeRange.start && track.endTime <= timeRange.end);
    return (<div className={`geospatial-intelligence ${className}`}>
      {/* Header */}
      <div className="mb-6 border-b pb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">
            Geospatial Intelligence & Location Analysis
          </h2>
          <div className="flex items-center gap-4">
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search locations..." className="px-3 py-2 border rounded-md text-sm w-64"/>
            <button onClick={() => performSpatialAnalysis('hotspot')} disabled={isAnalyzing} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
              {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
            </button>
          </div>
        </div>

        <div className="flex gap-4">
          <button onClick={() => setActiveView('map')} className={`px-4 py-2 rounded-md ${activeView === 'map' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}>
            🗺️ Interactive Map
          </button>
          <button onClick={() => setActiveView('tracks')} className={`px-4 py-2 rounded-md ${activeView === 'tracks' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}>
            📍 Movement Tracks ({movementTracks.length})
          </button>
          <button onClick={() => setActiveView('geofences')} className={`px-4 py-2 rounded-md ${activeView === 'geofences' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}>
            🚧 Geofences ({geofenceZones.length})
          </button>
          <button onClick={() => setActiveView('analysis')} className={`px-4 py-2 rounded-md ${activeView === 'analysis' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}>
            📊 Spatial Analysis ({spatialAnalyses.length})
          </button>
          <button onClick={() => setActiveView('intelligence')} className={`px-4 py-2 rounded-md ${activeView === 'intelligence' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}>
            🔍 Location Intelligence
          </button>
        </div>
      </div>

      {/* Interactive Map View */}
      {activeView === 'map' && (<div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Map Container */}
            <div className="lg:col-span-3">
              <div className="bg-gray-100 rounded-lg border h-96 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl mb-4">🗺️</div>
                    <h3 className="text-xl font-semibold mb-2">
                      Interactive Geospatial Map
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Center: {mapCenter.latitude.toFixed(4)},{' '}
                      {mapCenter.longitude.toFixed(4)}
                    </p>
                    <div className="text-sm text-gray-500">
                      {filteredPoints.length} points • {filteredTracks.length}{' '}
                      tracks • {geofenceZones.filter((g) => g.isActive).length}{' '}
                      geofences
                    </div>
                  </div>
                </div>

                {/* Map Controls */}
                <div className="absolute top-4 right-4 space-y-2">
                  <button className="bg-white border px-3 py-2 rounded shadow text-sm">
                    +
                  </button>
                  <button className="bg-white border px-3 py-2 rounded shadow text-sm">
                    −
                  </button>
                </div>

                {/* Layer Controls */}
                <div className="absolute top-4 left-4 bg-white rounded-lg border p-3 shadow">
                  <h4 className="font-medium text-sm mb-2">Layers</h4>
                  {Object.entries(layerVisibility).map(([layer, visible]) => (<label key={layer} className="flex items-center text-sm mb-1">
                      <input type="checkbox" checked={visible} onChange={(e) => setLayerVisibility((prev) => ({
                    ...prev,
                    [layer]: e.target.checked,
                }))} className="mr-2"/>
                      {layer.charAt(0).toUpperCase() + layer.slice(1)}
                    </label>))}
                </div>
              </div>
            </div>

            {/* Map Info Panel */}
            <div className="space-y-4">
              <div className="bg-white rounded-lg border p-4">
                <h3 className="font-semibold mb-3">Time Range</h3>
                <div className="space-y-2">
                  <input type="datetime-local" value={timeRange.start.toISOString().slice(0, 16)} onChange={(e) => setTimeRange((prev) => ({
                ...prev,
                start: new Date(e.target.value),
            }))} className="w-full px-3 py-2 border rounded text-sm"/>
                  <input type="datetime-local" value={timeRange.end.toISOString().slice(0, 16)} onChange={(e) => setTimeRange((prev) => ({
                ...prev,
                end: new Date(e.target.value),
            }))} className="w-full px-3 py-2 border rounded text-sm"/>
                </div>
              </div>

              <div className="bg-white rounded-lg border p-4">
                <h3 className="font-semibold mb-3">Data Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Points:</span>
                    <span className="font-medium">
                      {geospatialPoints.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Filtered Points:</span>
                    <span className="font-medium">{filteredPoints.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Tracks:</span>
                    <span className="font-medium">{filteredTracks.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Geofences:</span>
                    <span className="font-medium">
                      {geofenceZones.filter((g) => g.isActive).length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Analyses:</span>
                    <span className="font-medium">
                      {spatialAnalyses.length}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border p-4">
                <h3 className="font-semibold mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  <button onClick={() => createGeofence('New Alert Zone', 'alert', mapCenter, 500)} className="w-full px-3 py-2 bg-orange-100 text-orange-700 rounded hover:bg-orange-200 text-sm">
                    Create Geofence
                  </button>
                  <button onClick={() => performSpatialAnalysis('cluster')} className="w-full px-3 py-2 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm">
                    Cluster Analysis
                  </button>
                  <button onClick={() => performSpatialAnalysis('pattern')} className="w-full px-3 py-2 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 text-sm">
                    Pattern Detection
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>)}

      {/* Movement Tracks View */}
      {activeView === 'tracks' && (<div className="space-y-4">
          {filteredTracks.map((track) => (<div key={track.id} onClick={() => setSelectedTrack(track)} className="bg-white rounded-lg border p-4 cursor-pointer hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold">Track {track.id}</h4>
                  <p className="text-sm text-gray-600 capitalize">
                    {track.entityType} • {track.points.length} points
                  </p>
                </div>
                <div className="text-right text-sm">
                  <div>{track.startTime.toLocaleDateString()}</div>
                  <div className="text-xs text-gray-500">
                    {track.totalDistance.toFixed(1)} km
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                <div>
                  <span className="text-gray-600">Duration:</span>
                  <div className="font-medium">
                    {Math.round((track.endTime.getTime() - track.startTime.getTime()) /
                    (1000 * 60 * 60))}
                    h
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Avg Speed:</span>
                  <div className="font-medium">
                    {track.averageSpeed.toFixed(1)} km/h
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Max Speed:</span>
                  <div className="font-medium">
                    {track.maxSpeed.toFixed(1)} km/h
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Frequent Stops:</span>
                  <div className="font-medium">
                    {track.analysis.frequentLocations.length}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                {track.trajectory.straightLine && (<span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                    Straight Line
                  </span>)}
                {track.trajectory.circularPattern && (<span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                    Circular
                  </span>)}
                {track.trajectory.repeatingRoute && (<span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                    Repeating Route
                  </span>)}
                {track.trajectory.anomalousMovement && (<span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                    ⚠️ Anomalous
                  </span>)}
              </div>

              {track.analysis.patterns.length > 0 && (<div className="mt-3 p-3 bg-gray-50 rounded-md">
                  <span className="text-sm font-medium">
                    Detected Patterns:
                  </span>
                  <div className="text-xs text-gray-600 mt-1">
                    {track.analysis.patterns.map((pattern) => (<div key={pattern.type}>
                        • {pattern.description} ({pattern.confidence.toFixed(0)}
                        % confidence)
                      </div>))}
                  </div>
                </div>)}
            </div>))}

          {filteredTracks.length === 0 && (<div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-4">📍</div>
              <h3 className="text-lg font-medium mb-2">
                No movement tracks in time range
              </h3>
              <p>Adjust the time range to see movement data</p>
            </div>)}
        </div>)}

      {/* Geofences View */}
      {activeView === 'geofences' && (<div className="space-y-4">
          {geofenceZones.map((zone) => (<div key={zone.id} className="bg-white rounded-lg border p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold">{zone.name}</h4>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded ${zone.type === 'alert'
                    ? 'bg-orange-100 text-orange-700'
                    : zone.type === 'exclusion'
                        ? 'bg-red-100 text-red-700'
                        : zone.type === 'inclusion'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-blue-100 text-blue-700'}`}>
                      {zone.type.toUpperCase()}
                    </span>
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded capitalize">
                      {zone.shape}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded ${zone.isActive
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700'}`}>
                      {zone.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded hover:bg-blue-200">
                    Edit
                  </button>
                  <button className="px-3 py-1 bg-red-100 text-red-700 text-sm rounded hover:bg-red-200">
                    Delete
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                <div>
                  <span className="text-gray-600">Center:</span>
                  <div className="font-medium text-xs">
                    {zone.geometry.center?.latitude.toFixed(4)},{' '}
                    {zone.geometry.center?.longitude.toFixed(4)}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Radius:</span>
                  <div className="font-medium">{zone.geometry.radius}m</div>
                </div>
                <div>
                  <span className="text-gray-600">Alerts:</span>
                  <div className="font-medium">{zone.alerts.length}</div>
                </div>
                <div>
                  <span className="text-gray-600">Created:</span>
                  <div className="font-medium">
                    {zone.createdDate.toLocaleDateString()}
                  </div>
                </div>
              </div>

              {zone.rules.dwellTimeLimit && (<div className="text-sm text-gray-600 mb-2">
                  <span>Dwell limit:</span>{' '}
                  <span className="font-medium">
                    {zone.rules.dwellTimeLimit} minutes
                  </span>
                </div>)}

              {zone.alerts.length > 0 && (<div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-md">
                  <span className="text-orange-800 font-medium">
                    Recent Alerts ({zone.alerts.length})
                  </span>
                  {zone.alerts.slice(0, 3).map((alert) => (<div key={alert.id} className="text-sm text-orange-700 mt-1">
                      • {alert.alertType} by {alert.entityId} -{' '}
                      {alert.timestamp.toLocaleString()}
                    </div>))}
                </div>)}
            </div>))}

          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-semibold mb-3">Create New Geofence</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <input type="text" placeholder="Zone name" className="px-3 py-2 border rounded text-sm"/>
              <select className="px-3 py-2 border rounded text-sm">
                <option value="alert">Alert Zone</option>
                <option value="exclusion">Exclusion Zone</option>
                <option value="inclusion">Inclusion Zone</option>
                <option value="surveillance">Surveillance Zone</option>
              </select>
              <input type="number" placeholder="Radius (m)" className="px-3 py-2 border rounded text-sm"/>
              <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
                Create Zone
              </button>
            </div>
          </div>
        </div>)}

      {/* Spatial Analysis View */}
      {activeView === 'analysis' && (<div className="space-y-6">
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4">Analysis Tools</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                    type: 'hotspot',
                    name: 'Hotspot Analysis',
                    icon: '🔥',
                    desc: 'Identify areas of high activity concentration',
                },
                {
                    type: 'cluster',
                    name: 'Cluster Analysis',
                    icon: '🎯',
                    desc: 'Group similar locations and patterns',
                },
                {
                    type: 'pattern',
                    name: 'Pattern Detection',
                    icon: '🔍',
                    desc: 'Discover recurring spatial patterns',
                },
                {
                    type: 'anomaly',
                    name: 'Anomaly Detection',
                    icon: '⚠️',
                    desc: 'Identify unusual spatial behavior',
                },
                {
                    type: 'correlation',
                    name: 'Spatial Correlation',
                    icon: '🔗',
                    desc: 'Find relationships between locations',
                },
                {
                    type: 'prediction',
                    name: 'Predictive Analysis',
                    icon: '🔮',
                    desc: 'Forecast future spatial patterns',
                },
            ].map((tool) => (<button key={tool.type} onClick={() => performSpatialAnalysis(tool.type)} disabled={isAnalyzing} className="p-4 border rounded-lg hover:shadow-md transition-shadow text-left disabled:opacity-50">
                  <div className="text-2xl mb-2">{tool.icon}</div>
                  <h4 className="font-medium mb-1">{tool.name}</h4>
                  <p className="text-sm text-gray-600">{tool.desc}</p>
                </button>))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Analysis Results</h3>
            {spatialAnalyses.map((analysis) => (<div key={analysis.id} className="bg-white rounded-lg border p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold">{analysis.name}</h4>
                    <p className="text-sm text-gray-600">
                      {analysis.description}
                    </p>
                  </div>
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded capitalize">
                    {analysis.type}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                  <div>
                    <span className="text-gray-600">Confidence:</span>
                    <div className="font-medium">
                      {analysis.metrics.confidence.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Significance:</span>
                    <div className="font-medium">
                      {analysis.metrics.significance.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Density:</span>
                    <div className="font-medium">
                      {analysis.metrics.density.toFixed(1)}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Entities:</span>
                    <div className="font-medium">
                      {analysis.entities.length}
                    </div>
                  </div>
                </div>

                {analysis.insights.length > 0 && (<div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <span className="text-green-800 font-medium">
                      Key Insights:
                    </span>
                    {analysis.insights.map((insight, index) => (<div key={index} className="text-sm text-green-700 mt-1">
                        • {insight.description} ({insight.confidence.toFixed(1)}
                        % confidence)
                      </div>))}
                  </div>)}
              </div>))}

            {spatialAnalyses.length === 0 && (<div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-4">📊</div>
                <h3 className="text-lg font-medium mb-2">
                  No spatial analyses yet
                </h3>
                <p>Run analysis tools to discover spatial patterns</p>
              </div>)}
          </div>
        </div>)}

      {/* Location Intelligence View */}
      {activeView === 'intelligence' && (<div className="space-y-6">
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4">
              Location Intelligence Tools
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                    name: 'OSINT Collection',
                    icon: '🔍',
                    desc: 'Automated open source intelligence gathering',
                },
                {
                    name: 'Business Intelligence',
                    icon: '🏢',
                    desc: 'Commercial entity identification and analysis',
                },
                {
                    name: 'Demographic Analysis',
                    icon: '👥',
                    desc: 'Population and socioeconomic data',
                },
                {
                    name: 'Infrastructure Mapping',
                    icon: '🗺️',
                    desc: 'Critical infrastructure identification',
                },
                {
                    name: 'Satellite Imagery',
                    icon: '🛰️',
                    desc: 'Recent satellite and aerial imagery',
                },
                {
                    name: 'Street View Analysis',
                    icon: '📸',
                    desc: 'Ground-level imagery and features',
                },
                {
                    name: 'Communication Analysis',
                    icon: '📡',
                    desc: 'Cell tower and network coverage',
                },
                {
                    name: 'Threat Assessment',
                    icon: '⚠️',
                    desc: 'Security and risk evaluation',
                },
            ].map((tool) => (<button key={tool.name} onClick={() => getLocationIntelligence(mapCenter)} className="p-4 border rounded-lg hover:shadow-md transition-shadow text-left">
                  <div className="text-2xl mb-2">{tool.icon}</div>
                  <h4 className="font-medium mb-1 text-sm">{tool.name}</h4>
                  <p className="text-xs text-gray-600">{tool.desc}</p>
                </button>))}
            </div>
          </div>

          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4">
              Sample Location Intelligence Report
            </h3>

            <div className="space-y-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">📍 Location Overview</h4>
                <div className="text-sm text-gray-600">
                  <div>
                    <strong>Address:</strong> 123 Intelligence Ave, Analytics
                    City, NY 10001
                  </div>
                  <div>
                    <strong>Coordinates:</strong>{' '}
                    {mapCenter.latitude.toFixed(6)},{' '}
                    {mapCenter.longitude.toFixed(6)}
                  </div>
                  <div>
                    <strong>Type:</strong> Commercial Building
                  </div>
                  <div>
                    <strong>Risk Level:</strong>{' '}
                    <span className="text-orange-600 font-medium">Medium</span>
                  </div>
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">🏢 Business Intelligence</h4>
                <div className="text-sm text-gray-600">
                  <div>
                    <strong>Primary Tenant:</strong> TechCorp Analytics Inc.
                  </div>
                  <div>
                    <strong>Business Type:</strong> Data Analytics Company
                  </div>
                  <div>
                    <strong>Hours:</strong> Monday-Friday 9:00 AM - 6:00 PM
                  </div>
                  <div>
                    <strong>Employee Count:</strong> ~150-200 (estimated)
                  </div>
                  <div>
                    <strong>Public Rating:</strong> 4.2/5 (247 reviews)
                  </div>
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">
                  🛰️ Infrastructure & Communications
                </h4>
                <div className="text-sm text-gray-600">
                  <div>
                    <strong>Nearby Transport:</strong> Bus stops (0.2km), Subway
                    station (0.4km)
                  </div>
                  <div>
                    <strong>Cell Coverage:</strong> Verizon (Strong), AT&T
                    (Moderate), T-Mobile (Weak)
                  </div>
                  <div>
                    <strong>Internet Providers:</strong> Verizon FiOS, Spectrum,
                    AT&T
                  </div>
                  <div>
                    <strong>Security Features:</strong> CCTV cameras, keycard
                    access, security desk
                  </div>
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">⚠️ Threat Assessment</h4>
                <div className="text-sm text-gray-600">
                  <div>
                    <strong>Risk Factors:</strong> High foot traffic, multiple
                    entry points, adjacent to government building
                  </div>
                  <div>
                    <strong>Mitigation:</strong> Enhanced screening, visitor
                    management, perimeter monitoring
                  </div>
                  <div>
                    <strong>Vulnerabilities:</strong> Public parking garage,
                    limited sight lines
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>)}

      {isAnalyzing && (<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <h3 className="text-lg font-medium mb-2">
              Running Spatial Analysis
            </h3>
            <p className="text-gray-600">
              Processing geospatial data and identifying patterns...
            </p>
          </div>
        </div>)}
    </div>);
};
exports.default = GeospatialIntelligence;
