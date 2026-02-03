export type ProcedurePolicy = {
  version: number;
  allow: {
    stepTypes: string[];
    exportDestinations: {
      csv: string[];
    };
    httpDomains: string[];
  };
  budgets: {
    maxSteps: number;
    maxQueryFanout: number;
    maxHttpDomains: number;
  };
  rules: {
    forbidAdjacency: Array<{
      from: string;
      to: string;
    }>;
  };
};
