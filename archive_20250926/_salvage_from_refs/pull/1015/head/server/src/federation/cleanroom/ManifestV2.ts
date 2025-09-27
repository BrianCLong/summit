export type CleanRoomManifestV2 = {
  id: string;
  tenants: string[];
  datasets: { id: string; residency: ("us-west" | "us-east" | "eu-central")[] }[];
  allowedTemplates: string[];
  epsilonCap: number;
  delta: number;
  kMin: number;
  cooldownSec: number;
  piiOff: boolean;
  signedAt: string;
  signer: string;
  signature: string;
};
