
/**
 * @interface Backend
 * @description Represents a backend server.
 */
export interface Backend {
  id: string;
  address: string;
  weight: number;
  connections: number;
  latency: number;
  status: 'UP' | 'DOWN';
}
