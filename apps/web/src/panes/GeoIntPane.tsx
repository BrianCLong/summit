
import React, { useState } from 'react';
import { MapContainer, TileLayer, Circle, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useLazyQuery, gql } from '@apollo/client';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const ANALYZE_SATELLITE = gql`
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

const DETECT_CHANGE = gql`
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

const GET_ELEVATION = gql`
  query GetElevationProfile($path: [GeoPointInput!]!) {
    getElevationProfile(path: $path) {
      distance
      elevation
      lat
      lon
    }
  }
`;

export const GeoIntPane: React.FC = () => {
    const [center, setCenter] = useState<[number, number]>([34.0522, -118.2437]); // LA default
    const [satelliteUrl, setSatelliteUrl] = useState("https://example.com/sat1.jpg");
    const [analyzeSat, { data: satData, loading: satLoading }] = useLazyQuery(ANALYZE_SATELLITE);

    const [beforeUrl, setBeforeUrl] = useState("https://example.com/before.jpg");
    const [afterUrl, setAfterUrl] = useState("https://example.com/after.jpg");
    const [detectChange, { data: changeData, loading: changeLoading }] = useLazyQuery(DETECT_CHANGE);

    // Hardcoded mock path for elevation demo
    const [path] = useState([
        { lat: 34.0522, lon: -118.2437 },
        { lat: 34.0622, lon: -118.2537 },
        { lat: 34.0722, lon: -118.2637 }
    ]);
    const [getElevation, { data: elevationData, loading: elevationLoading }] = useLazyQuery(GET_ELEVATION);

    const handleSatAnalysis = () => {
        analyzeSat({ variables: { imageUrl: satelliteUrl } });
    };

    const handleChangeDetection = () => {
        detectChange({ variables: { before: beforeUrl, after: afterUrl } });
    };

    const handleElevation = () => {
        getElevation({ variables: { path } });
    };

    return (
        <div className="flex h-full flex-col p-4 gap-4">
            <h1 className="text-2xl font-bold mb-4">Geospatial Intelligence Platform</h1>

            <div className="flex flex-row h-[700px] gap-4">
                {/* Map View */}
                <div className="flex-grow rounded-md border overflow-hidden flex flex-col gap-2">
                    <MapContainer center={center} zoom={13} style={{ height: '60%', width: '100%' }}>
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        {/* Detected Objects */}
                        {satData?.analyzeSatelliteImage?.objectsDetected?.map((obj: any, idx: number) => (
                            <Circle
                                key={idx}
                                center={[obj.location.lat, obj.location.lon]}
                                pathOptions={{ color: 'red', fillColor: 'red' }}
                                radius={50}
                            >
                                <Popup>
                                    {obj.type} ({(obj.confidence * 100).toFixed(1)}%)
                                </Popup>
                            </Circle>
                        ))}
                         {/* Elevation Path */}
                         {elevationData && (
                            <Polyline
                                positions={path.map(p => [p.lat, p.lon])}
                                pathOptions={{ color: 'blue' }}
                            />
                        )}
                    </MapContainer>

                    {/* Elevation Chart Area */}
                    {elevationData?.getElevationProfile && (
                        <div className="flex-grow p-4 bg-white border-t">
                             <h3 className="text-sm font-semibold mb-2">Elevation Profile</h3>
                             <ResponsiveContainer width="100%" height={200}>
                                <AreaChart data={elevationData.getElevationProfile}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="distance" unit="m" tickFormatter={(val) => val.toFixed(0)} />
                                    <YAxis unit="m" />
                                    <Tooltip />
                                    <Area type="monotone" dataKey="elevation" stroke="#8884d8" fill="#8884d8" />
                                </AreaChart>
                             </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* Controls Pane */}
                <div className="w-[350px] flex flex-col gap-4 overflow-y-auto">
                    <Tabs defaultValue="satellite">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="satellite">Sat</TabsTrigger>
                            <TabsTrigger value="change">Diff</TabsTrigger>
                            <TabsTrigger value="terrain">Terrain</TabsTrigger>
                        </TabsList>

                        <TabsContent value="satellite">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Satellite Imagery</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Image URL</Label>
                                        <Input value={satelliteUrl} onChange={(e) => setSatelliteUrl(e.target.value)} />
                                    </div>
                                    <Button onClick={handleSatAnalysis} disabled={satLoading}>
                                        {satLoading ? "Analyzing..." : "Analyze Image"}
                                    </Button>

                                    {satData && (
                                        <div className="mt-4 p-2 bg-slate-100 dark:bg-slate-800 rounded text-sm">
                                            <p><strong>Class:</strong> {satData.analyzeSatelliteImage.classification}</p>
                                            <p><strong>Cloud Cover:</strong> {satData.analyzeSatelliteImage.cloudCover}</p>
                                            <p><strong>Objects:</strong> {satData.analyzeSatelliteImage.objectsDetected.length}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="change">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Change Detection</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Before Image URL</Label>
                                        <Input value={beforeUrl} onChange={(e) => setBeforeUrl(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>After Image URL</Label>
                                        <Input value={afterUrl} onChange={(e) => setAfterUrl(e.target.value)} />
                                    </div>
                                    <Button onClick={handleChangeDetection} disabled={changeLoading}>
                                        {changeLoading ? "Processing..." : "Detect Changes"}
                                    </Button>

                                    {changeData && (
                                        <div className="mt-4 p-2 bg-slate-100 dark:bg-slate-800 rounded text-sm">
                                            <p><strong>Change Detected:</strong> {changeData.detectChange.changeDetected ? "Yes" : "No"}</p>
                                            <p><strong>Magnitude:</strong> {changeData.detectChange.percentageChange}%</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="terrain">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Terrain Analysis</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="text-xs text-muted-foreground">
                                        Analyzes elevation profile along the predefined vector path.
                                    </div>
                                    <Button onClick={handleElevation} disabled={elevationLoading}>
                                        {elevationLoading ? "Computing DEM..." : "Generate Profile"}
                                    </Button>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
};
