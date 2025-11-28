declare global {
  interface Window {
    __MAPBOX_STATE__?: import('./utils/mapboxStub').MapboxStubState;
  }
}

export {};
