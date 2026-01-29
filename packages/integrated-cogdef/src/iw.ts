export type Indicator = {
  id: string;
  aggregation_level: "org" | "unit" | "region";
  value: number;
  basis: string[]; // EVD IDs only
};

export type Warning = {
  id: string;
  hypothesis: string;
  confidence: "low" | "med" | "high";
  protective_actions: string[];
  evidence: string[]; // EVD IDs only
};

export type IWPack = {
  item: "PLASSFCOG";
  indicators: Indicator[];
  warnings: Warning[];
};
