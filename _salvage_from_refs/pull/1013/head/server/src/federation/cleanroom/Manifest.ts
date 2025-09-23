export type CleanRoomManifest = {
  id: string;
  tenants: string[];
  datasets: Array<{ id: string; residency: ('us-west'|'us-east'|'eu-central')[] }>;
  allowedQueries: string[];
  retentionDays: number;
  piiOff: boolean;
  signedAt: string;
  signer: string;
  signature: string;
};
