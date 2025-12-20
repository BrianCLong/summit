
export interface Experiment {
  id: string;
  name: string;
  hypothesis: string;
  variants: Variant[];
  metrics: string[]; // e.g. ["latency", "success_rate"]
  status: 'ACTIVE' | 'STOPPED' | 'CONCLUDED';
  startDate: Date;
  stopConditions: Record<string, number>; // metric -> threshold
}

export interface Variant {
  id: string; // "control", "variant-a"
  configOverrides: Record<string, any>;
  trafficWeight: number; // 0-100
}

export interface Assignment {
  experimentId: string;
  variantId: string;
  entityId: string; // User ID or Tenant ID
}
