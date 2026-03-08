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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeoIntPane = void 0;
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
const react_1 = __importStar(require("react"));
const react_leaflet_1 = require("react-leaflet");
require("leaflet/dist/leaflet.css");
const react_2 = require("@apollo/client/react");
const client_1 = require("@apollo/client");
const Button_1 = require("../components/ui/Button");
const Card_1 = require("../components/ui/Card");
const label_1 = require("../components/ui/label");
const input_1 = require("../components/ui/input");
const Tabs_1 = require("../components/ui/Tabs");
const recharts_1 = require("recharts");
const leaflet_1 = __importDefault(require("leaflet"));
const marker_icon_png_1 = __importDefault(require("leaflet/dist/images/marker-icon.png"));
const marker_shadow_png_1 = __importDefault(require("leaflet/dist/images/marker-shadow.png"));
const DefaultIcon = leaflet_1.default.icon({
    iconUrl: marker_icon_png_1.default,
    shadowUrl: marker_shadow_png_1.default,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
leaflet_1.default.Marker.prototype.options.icon = DefaultIcon;
const ANALYZE_SATELLITE = (0, client_1.gql) `
  query AnalyzeSatelliteImage($imageUrl: String!) {
    analyzeSatelliteImage(imageUrl: $imageUrl) {
      classification
      cloudCover
      timestamp
      objectsDetected {
        type
        confidence
        location {
          lat
          lon
        }
      }
    }
  }
`;
const DETECT_CHANGE = (0, client_1.gql) `
  query DetectChange($before: String!, $after: String!) {
    detectChange(beforeImageUrl: $before, afterImageUrl: $after) {
      changeDetected
      percentageChange
      areas {
        type
        confidence
        bounds {
          lat
          lon
        }
      }
    }
  }
`;
const GET_ELEVATION = (0, client_1.gql) `
  query GetElevationProfile($path: [GeoPointInput!]!) {
    getElevationProfile(path: $path) {
      distance
      elevation
      lat
      lon
    }
  }
`;
const GeoIntPane = () => {
    const [center, setCenter] = (0, react_1.useState)([34.0522, -118.2437]); // LA default
    const [satelliteUrl, setSatelliteUrl] = (0, react_1.useState)("https://example.com/sat1.jpg");
    const [analyzeSat, { data: satData, loading: satLoading }] = (0, react_2.useLazyQuery)(ANALYZE_SATELLITE);
    const [beforeUrl, setBeforeUrl] = (0, react_1.useState)("https://example.com/before.jpg");
    const [afterUrl, setAfterUrl] = (0, react_1.useState)("https://example.com/after.jpg");
    const [detectChange, { data: changeData, loading: changeLoading }] = (0, react_2.useLazyQuery)(DETECT_CHANGE);
    // Hardcoded mock path for elevation demo
    const [path] = (0, react_1.useState)([
        { lat: 34.0522, lon: -118.2437 },
        { lat: 34.0622, lon: -118.2537 },
        { lat: 34.0722, lon: -118.2637 }
    ]);
    const [getElevation, { data: elevationData, loading: elevationLoading }] = (0, react_2.useLazyQuery)(GET_ELEVATION);
    const handleSatAnalysis = () => {
        analyzeSat({ variables: { imageUrl: satelliteUrl } });
    };
    const handleChangeDetection = () => {
        detectChange({ variables: { before: beforeUrl, after: afterUrl } });
    };
    const handleElevation = () => {
        getElevation({ variables: { path } });
    };
    return (<div className="flex h-full flex-col p-4 gap-4">
            <h1 className="text-2xl font-bold mb-4">Geospatial Intelligence Platform</h1>

            <div className="flex flex-row h-[700px] gap-4">
                {/* Map View */}
                <div className="flex-grow rounded-md border overflow-hidden flex flex-col gap-2">
                    <react_leaflet_1.MapContainer center={center} zoom={13} style={{ height: '60%', width: '100%' }}>
                        <react_leaflet_1.TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
                        {/* Detected Objects */}
                        {satData?.analyzeSatelliteImage?.objectsDetected?.map((obj, idx) => (<react_leaflet_1.Circle key={idx} center={[obj.location.lat, obj.location.lon]} pathOptions={{ color: 'red', fillColor: 'red' }} radius={50}>
                                <react_leaflet_1.Popup>
                                    {obj.type} ({(obj.confidence * 100).toFixed(1)}%)
                                </react_leaflet_1.Popup>
                            </react_leaflet_1.Circle>))}
                         {/* Elevation Path */}
                         {elevationData && (<react_leaflet_1.Polyline positions={path.map(p => [p.lat, p.lon])} pathOptions={{ color: 'blue' }}/>)}
                    </react_leaflet_1.MapContainer>

                    {/* Elevation Chart Area */}
                    {elevationData?.getElevationProfile && (<div className="flex-grow p-4 bg-white border-t">
                             <h3 className="text-sm font-semibold mb-2">Elevation Profile</h3>
                             <recharts_1.ResponsiveContainer width="100%" height={200}>
                                <recharts_1.AreaChart data={elevationData.getElevationProfile}>
                                    <recharts_1.CartesianGrid strokeDasharray="3 3"/>
                                    <recharts_1.XAxis dataKey="distance" unit="m" tickFormatter={(val) => val.toFixed(0)}/>
                                    <recharts_1.YAxis unit="m"/>
                                    <recharts_1.Tooltip />
                                    <recharts_1.Area type="monotone" dataKey="elevation" stroke="#8884d8" fill="#8884d8"/>
                                </recharts_1.AreaChart>
                             </recharts_1.ResponsiveContainer>
                        </div>)}
                </div>

                {/* Controls Pane */}
                <div className="w-[350px] flex flex-col gap-4 overflow-y-auto">
                    <Tabs_1.Tabs defaultValue="satellite">
                        <Tabs_1.TabsList className="grid w-full grid-cols-3">
                            <Tabs_1.TabsTrigger value="satellite">Sat</Tabs_1.TabsTrigger>
                            <Tabs_1.TabsTrigger value="change">Diff</Tabs_1.TabsTrigger>
                            <Tabs_1.TabsTrigger value="terrain">Terrain</Tabs_1.TabsTrigger>
                        </Tabs_1.TabsList>

                        <Tabs_1.TabsContent value="satellite">
                            <Card_1.Card>
                                <Card_1.CardHeader>
                                    <Card_1.CardTitle>Satellite Imagery</Card_1.CardTitle>
                                </Card_1.CardHeader>
                                <Card_1.CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <label_1.Label htmlFor="satellite-url">Image URL</label_1.Label>
                                        <input_1.Input id="satellite-url" placeholder="https://example.com/sat1.jpg" value={satelliteUrl} onChange={(e) => setSatelliteUrl(e.target.value)}/>
                                    </div>
                                    <Button_1.Button onClick={handleSatAnalysis} loading={satLoading}>
                                        Analyze Image
                                    </Button_1.Button>

                                    {satData && (<div className="mt-4 p-2 bg-slate-100 dark:bg-slate-800 rounded text-sm">
                                            <p><strong>Class:</strong> {satData.analyzeSatelliteImage.classification}</p>
                                            <p><strong>Cloud Cover:</strong> {satData.analyzeSatelliteImage.cloudCover}</p>
                                            <p><strong>Objects:</strong> {satData.analyzeSatelliteImage.objectsDetected.length}</p>
                                        </div>)}
                                </Card_1.CardContent>
                            </Card_1.Card>
                        </Tabs_1.TabsContent>

                        <Tabs_1.TabsContent value="change">
                            <Card_1.Card>
                                <Card_1.CardHeader>
                                    <Card_1.CardTitle>Change Detection</Card_1.CardTitle>
                                </Card_1.CardHeader>
                                <Card_1.CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <label_1.Label htmlFor="before-url">Before Image URL</label_1.Label>
                                        <input_1.Input id="before-url" placeholder="https://example.com/before.jpg" value={beforeUrl} onChange={(e) => setBeforeUrl(e.target.value)}/>
                                    </div>
                                    <div className="space-y-2">
                                        <label_1.Label htmlFor="after-url">After Image URL</label_1.Label>
                                        <input_1.Input id="after-url" placeholder="https://example.com/after.jpg" value={afterUrl} onChange={(e) => setAfterUrl(e.target.value)}/>
                                    </div>
                                    <Button_1.Button onClick={handleChangeDetection} loading={changeLoading}>
                                        Detect Changes
                                    </Button_1.Button>

                                    {changeData && (<div className="mt-4 p-2 bg-slate-100 dark:bg-slate-800 rounded text-sm">
                                            <p><strong>Change Detected:</strong> {changeData.detectChange.changeDetected ? "Yes" : "No"}</p>
                                            <p><strong>Magnitude:</strong> {changeData.detectChange.percentageChange}%</p>
                                        </div>)}
                                </Card_1.CardContent>
                            </Card_1.Card>
                        </Tabs_1.TabsContent>

                        <Tabs_1.TabsContent value="terrain">
                            <Card_1.Card>
                                <Card_1.CardHeader>
                                    <Card_1.CardTitle>Terrain Analysis</Card_1.CardTitle>
                                </Card_1.CardHeader>
                                <Card_1.CardContent className="space-y-4">
                                    <div id="terrain-desc" className="text-xs text-muted-foreground">
                                        Analyzes elevation profile along the predefined vector path.
                                    </div>
                                    <Button_1.Button onClick={handleElevation} loading={elevationLoading} aria-describedby="terrain-desc">
                                        Generate Profile
                                    </Button_1.Button>
                                </Card_1.CardContent>
                            </Card_1.Card>
                        </Tabs_1.TabsContent>
                    </Tabs_1.Tabs>
                </div>
            </div>
        </div>);
};
exports.GeoIntPane = GeoIntPane;
