/**
 * Visualization Data Generator
 * TRAINING/SIMULATION ONLY
 *
 * Generates data structures for UI visualization
 */

import { v4 as uuid } from 'uuid';

export interface SpectrumDisplayData {
  id: string;
  timestamp: Date;
  startFrequency: number;
  stopFrequency: number;
  rbw: number; // Resolution bandwidth
  points: Array<{
    frequency: number;
    power: number;
  }>;
  markers: Array<{
    id: string;
    frequency: number;
    power: number;
    label: string;
    color: string;
  }>;
  annotations: Array<{
    startFreq: number;
    endFreq: number;
    label: string;
    color: string;
  }>;
}

export interface WaterfallDisplayData {
  id: string;
  startFrequency: number;
  stopFrequency: number;
  timeSpan: number; // seconds
  resolution: {
    frequency: number;
    time: number;
  };
  data: Array<{
    timestamp: Date;
    powers: number[];
  }>;
  colorMap: 'jet' | 'viridis' | 'plasma' | 'grayscale';
  powerRange: { min: number; max: number };
}

export interface NetworkGraphData {
  nodes: Array<{
    id: string;
    label: string;
    type: string;
    size: number;
    color: string;
    x?: number;
    y?: number;
    metadata: Record<string, unknown>;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    weight: number;
    color: string;
    label?: string;
  }>;
  clusters: Array<{
    id: string;
    name: string;
    nodeIds: string[];
    color: string;
  }>;
}

export interface MapDisplayData {
  id: string;
  center: { lat: number; lon: number };
  zoom: number;
  layers: MapLayer[];
}

export interface MapLayer {
  id: string;
  name: string;
  type: 'markers' | 'heatmap' | 'tracks' | 'coverage' | 'grid';
  visible: boolean;
  data: unknown;
}

export interface MarkerLayerData {
  markers: Array<{
    id: string;
    lat: number;
    lon: number;
    icon: string;
    label: string;
    color: string;
    popup?: string;
  }>;
}

export interface HeatmapLayerData {
  points: Array<{
    lat: number;
    lon: number;
    intensity: number;
  }>;
  radius: number;
  blur: number;
  maxIntensity: number;
}

export interface TrackLayerData {
  tracks: Array<{
    id: string;
    points: Array<{
      lat: number;
      lon: number;
      timestamp: Date;
    }>;
    color: string;
    width: number;
    showDirection: boolean;
  }>;
}

export interface TimelineData {
  id: string;
  startTime: Date;
  endTime: Date;
  events: Array<{
    id: string;
    timestamp: Date;
    duration?: number;
    type: string;
    label: string;
    description: string;
    color: string;
    lane: number;
  }>;
  lanes: Array<{
    id: number;
    name: string;
  }>;
}

export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'map' | 'spectrum' | 'timeline';
  title: string;
  position: { x: number; y: number; w: number; h: number };
  config: Record<string, unknown>;
  data: unknown;
}

export interface DashboardLayout {
  id: string;
  name: string;
  widgets: DashboardWidget[];
  refreshInterval: number;
}

export class VisualizationDataGenerator {
  /**
   * Generate spectrum display data
   */
  generateSpectrumData(params: {
    startFreq: number;
    stopFreq: number;
    points?: number;
    noiseFloor?: number;
    signals?: Array<{ freq: number; power: number; bw: number }>;
  }): SpectrumDisplayData {
    const numPoints = params.points || 1000;
    const noiseFloor = params.noiseFloor || -100;
    const freqStep = (params.stopFreq - params.startFreq) / numPoints;

    const points: SpectrumDisplayData['points'] = [];
    const markers: SpectrumDisplayData['markers'] = [];

    for (let i = 0; i < numPoints; i++) {
      const freq = params.startFreq + i * freqStep;
      let power = noiseFloor + (Math.random() - 0.5) * 10;

      // Add signals
      if (params.signals) {
        for (const sig of params.signals) {
          const distance = Math.abs(freq - sig.freq);
          if (distance < sig.bw) {
            const rolloff = Math.exp(-2 * Math.pow(distance / (sig.bw / 2), 2));
            power = Math.max(power, sig.power * rolloff);
          }
        }
      }

      points.push({ frequency: freq, power });
    }

    // Add markers for signals
    if (params.signals) {
      params.signals.forEach((sig, i) => {
        markers.push({
          id: uuid(),
          frequency: sig.freq,
          power: sig.power,
          label: `Signal ${i + 1}`,
          color: ['#ff6384', '#36a2eb', '#ffce56', '#4bc0c0'][i % 4]
        });
      });
    }

    return {
      id: uuid(),
      timestamp: new Date(),
      startFrequency: params.startFreq,
      stopFrequency: params.stopFreq,
      rbw: freqStep,
      points,
      markers,
      annotations: []
    };
  }

  /**
   * Generate waterfall display data
   */
  generateWaterfallData(params: {
    startFreq: number;
    stopFreq: number;
    duration: number;
    timeResolution?: number;
    freqResolution?: number;
  }): WaterfallDisplayData {
    const timeRes = params.timeResolution || 1;
    const freqRes = params.freqResolution || 100000;

    const numTimeSlices = Math.ceil(params.duration / timeRes);
    const numFreqBins = Math.ceil((params.stopFreq - params.startFreq) / freqRes);

    const data: WaterfallDisplayData['data'] = [];
    const baseTime = Date.now() - params.duration * 1000;

    for (let t = 0; t < numTimeSlices; t++) {
      const powers: number[] = [];

      for (let f = 0; f < numFreqBins; f++) {
        // Generate noise floor with some variation
        let power = -100 + (Math.random() - 0.5) * 10;

        // Add some simulated signals
        const freq = params.startFreq + f * freqRes;
        if (Math.abs(freq - (params.startFreq + params.stopFreq) / 2) < 1e6) {
          power = -50 + Math.random() * 10;
        }

        powers.push(power);
      }

      data.push({
        timestamp: new Date(baseTime + t * timeRes * 1000),
        powers
      });
    }

    return {
      id: uuid(),
      startFrequency: params.startFreq,
      stopFrequency: params.stopFreq,
      timeSpan: params.duration,
      resolution: { frequency: freqRes, time: timeRes },
      data,
      colorMap: 'jet',
      powerRange: { min: -120, max: -20 }
    };
  }

  /**
   * Generate network graph data
   */
  generateNetworkGraphData(params: {
    nodeCount?: number;
    edgeDensity?: number;
    clusterCount?: number;
  }): NetworkGraphData {
    const nodeCount = params.nodeCount || 20;
    const edgeDensity = params.edgeDensity || 0.2;
    const clusterCount = params.clusterCount || 3;

    const colors = ['#ff6384', '#36a2eb', '#ffce56', '#4bc0c0', '#9966ff'];
    const nodeTypes = ['person', 'organization', 'device', 'location'];

    // Generate nodes
    const nodes: NetworkGraphData['nodes'] = [];
    for (let i = 0; i < nodeCount; i++) {
      const cluster = Math.floor(i / (nodeCount / clusterCount));
      nodes.push({
        id: `node-${i}`,
        label: `Entity ${i + 1}`,
        type: nodeTypes[Math.floor(Math.random() * nodeTypes.length)],
        size: 10 + Math.random() * 20,
        color: colors[cluster % colors.length],
        metadata: {
          cluster,
          importance: Math.random()
        }
      });
    }

    // Generate edges
    const edges: NetworkGraphData['edges'] = [];
    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        if (Math.random() < edgeDensity) {
          edges.push({
            id: `edge-${i}-${j}`,
            source: `node-${i}`,
            target: `node-${j}`,
            weight: Math.random(),
            color: '#999999'
          });
        }
      }
    }

    // Define clusters
    const clusters: NetworkGraphData['clusters'] = [];
    for (let c = 0; c < clusterCount; c++) {
      const clusterNodes = nodes
        .filter(n => (n.metadata as any).cluster === c)
        .map(n => n.id);

      clusters.push({
        id: `cluster-${c}`,
        name: `Group ${c + 1}`,
        nodeIds: clusterNodes,
        color: colors[c % colors.length]
      });
    }

    return { nodes, edges, clusters };
  }

  /**
   * Generate map display data
   */
  generateMapData(params: {
    centerLat: number;
    centerLon: number;
    radius: number;
    markerCount?: number;
    showHeatmap?: boolean;
    showTracks?: boolean;
  }): MapDisplayData {
    const layers: MapLayer[] = [];

    // Marker layer
    const markers: MarkerLayerData['markers'] = [];
    const markerCount = params.markerCount || 10;

    for (let i = 0; i < markerCount; i++) {
      const angle = Math.random() * 2 * Math.PI;
      const distance = Math.random() * params.radius;

      markers.push({
        id: uuid(),
        lat: params.centerLat + (distance / 111) * Math.cos(angle),
        lon: params.centerLon + (distance / 111) * Math.sin(angle),
        icon: ['signal', 'target', 'sensor'][Math.floor(Math.random() * 3)],
        label: `Point ${i + 1}`,
        color: ['#ff6384', '#36a2eb', '#4bc0c0'][Math.floor(Math.random() * 3)],
        popup: `Simulated location ${i + 1}`
      });
    }

    layers.push({
      id: 'markers',
      name: 'Signal Sources',
      type: 'markers',
      visible: true,
      data: { markers }
    });

    // Heatmap layer
    if (params.showHeatmap) {
      const heatPoints: HeatmapLayerData['points'] = [];

      for (let i = 0; i < 100; i++) {
        const angle = Math.random() * 2 * Math.PI;
        const distance = Math.random() * params.radius;

        heatPoints.push({
          lat: params.centerLat + (distance / 111) * Math.cos(angle),
          lon: params.centerLon + (distance / 111) * Math.sin(angle),
          intensity: Math.random()
        });
      }

      layers.push({
        id: 'heatmap',
        name: 'Signal Density',
        type: 'heatmap',
        visible: true,
        data: {
          points: heatPoints,
          radius: 25,
          blur: 15,
          maxIntensity: 1
        }
      });
    }

    // Track layer
    if (params.showTracks) {
      const tracks: TrackLayerData['tracks'] = [];

      for (let t = 0; t < 3; t++) {
        const points: TrackLayerData['tracks'][0]['points'] = [];
        let lat = params.centerLat + (Math.random() - 0.5) * (params.radius / 111);
        let lon = params.centerLon + (Math.random() - 0.5) * (params.radius / 111);

        for (let p = 0; p < 20; p++) {
          lat += (Math.random() - 0.5) * 0.01;
          lon += (Math.random() - 0.5) * 0.01;

          points.push({
            lat,
            lon,
            timestamp: new Date(Date.now() - (20 - p) * 60000)
          });
        }

        tracks.push({
          id: `track-${t}`,
          points,
          color: ['#ff6384', '#36a2eb', '#4bc0c0'][t],
          width: 2,
          showDirection: true
        });
      }

      layers.push({
        id: 'tracks',
        name: 'Movement Tracks',
        type: 'tracks',
        visible: true,
        data: { tracks }
      });
    }

    return {
      id: uuid(),
      center: { lat: params.centerLat, lon: params.centerLon },
      zoom: 10,
      layers
    };
  }

  /**
   * Generate timeline data
   */
  generateTimelineData(params: {
    startTime: Date;
    endTime: Date;
    eventCount?: number;
    laneCount?: number;
  }): TimelineData {
    const eventCount = params.eventCount || 20;
    const laneCount = params.laneCount || 3;
    const duration = params.endTime.getTime() - params.startTime.getTime();

    const lanes = Array.from({ length: laneCount }, (_, i) => ({
      id: i,
      name: ['COMINT', 'ELINT', 'NETWORK', 'GEO'][i] || `Lane ${i + 1}`
    }));

    const eventTypes = [
      { type: 'signal', color: '#36a2eb' },
      { type: 'communication', color: '#ff6384' },
      { type: 'emission', color: '#ffce56' },
      { type: 'location', color: '#4bc0c0' }
    ];

    const events: TimelineData['events'] = [];

    for (let i = 0; i < eventCount; i++) {
      const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      const timestamp = new Date(
        params.startTime.getTime() + Math.random() * duration
      );

      events.push({
        id: uuid(),
        timestamp,
        duration: Math.random() > 0.7 ? Math.floor(Math.random() * 300000) : undefined,
        type: eventType.type,
        label: `Event ${i + 1}`,
        description: `Simulated ${eventType.type} event`,
        color: eventType.color,
        lane: Math.floor(Math.random() * laneCount)
      });
    }

    events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return {
      id: uuid(),
      startTime: params.startTime,
      endTime: params.endTime,
      events,
      lanes
    };
  }

  /**
   * Generate dashboard layout
   */
  generateDashboardLayout(name: string): DashboardLayout {
    const widgets: DashboardWidget[] = [
      {
        id: uuid(),
        type: 'metric',
        title: 'Active Signals',
        position: { x: 0, y: 0, w: 3, h: 2 },
        config: { format: 'number' },
        data: { value: Math.floor(Math.random() * 100), trend: 5.2 }
      },
      {
        id: uuid(),
        type: 'metric',
        title: 'Messages Analyzed',
        position: { x: 3, y: 0, w: 3, h: 2 },
        config: { format: 'number' },
        data: { value: Math.floor(Math.random() * 500), trend: -2.1 }
      },
      {
        id: uuid(),
        type: 'metric',
        title: 'Active Tracks',
        position: { x: 6, y: 0, w: 3, h: 2 },
        config: { format: 'number' },
        data: { value: Math.floor(Math.random() * 20), trend: 0 }
      },
      {
        id: uuid(),
        type: 'spectrum',
        title: 'Spectrum Monitor',
        position: { x: 0, y: 2, w: 6, h: 4 },
        config: { startFreq: 100e6, stopFreq: 6e9 },
        data: this.generateSpectrumData({
          startFreq: 100e6,
          stopFreq: 6e9,
          signals: [
            { freq: 900e6, power: -40, bw: 10e6 },
            { freq: 2.4e9, power: -50, bw: 20e6 }
          ]
        })
      },
      {
        id: uuid(),
        type: 'map',
        title: 'Geolocation',
        position: { x: 6, y: 2, w: 6, h: 4 },
        config: {},
        data: this.generateMapData({
          centerLat: 38.9,
          centerLon: -77.0,
          radius: 50,
          markerCount: 5,
          showTracks: true
        })
      },
      {
        id: uuid(),
        type: 'timeline',
        title: 'Activity Timeline',
        position: { x: 0, y: 6, w: 12, h: 3 },
        config: {},
        data: this.generateTimelineData({
          startTime: new Date(Date.now() - 3600000),
          endTime: new Date(),
          eventCount: 15
        })
      }
    ];

    return {
      id: uuid(),
      name,
      widgets,
      refreshInterval: 30000
    };
  }
}
