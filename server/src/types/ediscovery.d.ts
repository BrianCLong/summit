// Ambient types for E-Discovery entities used in tests
// Precise minimal contracts to satisfy compile-time references without changing runtime behavior

declare interface EDiscoveryCollectionRequest {
  matterId: string;
  query: string;
  custodians?: string[];
  startDate?: string;
  endDate?: string;
}

declare interface EDiscoveryCollectionResult {
  requestId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  itemCount?: number;
  location?: string;
  errorMessage?: string;
}
