export interface MapboxStubState {
  flyTo: { center: [number, number]; zoom?: number }[];
  markers: [number, number][];
  removals: number;
  focused: string | null;
}

export function createMapboxState(): MapboxStubState {
  return { flyTo: [], markers: [], removals: 0, focused: null };
}
