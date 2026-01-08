export interface GeoPoint {
  id: string;
  lat: number;
  lng: number;
  observedAt: string;
  label: string;
  type: string;
}

export const geoPoints: GeoPoint[] = [
  {
    id: "p-nyc-001",
    lat: 40.7128,
    lng: -74.006,
    observedAt: "2023-10-26T10:00:00Z",
    label: "Financial District",
    type: "location",
  },
  {
    id: "p-nyc-002",
    lat: 40.7135,
    lng: -74.0012,
    observedAt: "2023-10-26T11:30:00Z",
    label: "Tribeca",
    type: "location",
  },
  {
    id: "p-la-001",
    lat: 34.0522,
    lng: -118.2437,
    observedAt: "2023-10-25T15:45:00Z",
    label: "Los Angeles",
    type: "location",
  },
  {
    id: "p-lon-001",
    lat: 51.5074,
    lng: -0.1278,
    observedAt: "2023-10-25T15:45:00Z",
    label: "London",
    type: "location",
  },
  {
    id: "p-delhi-001",
    lat: 28.6139,
    lng: 77.209,
    observedAt: "2023-10-27T09:30:00Z",
    label: "New Delhi",
    type: "location",
  },
  {
    id: "p-sydney-001",
    lat: -33.8688,
    lng: 151.2093,
    observedAt: "2023-10-24T05:20:00Z",
    label: "Sydney",
    type: "location",
  },
];
