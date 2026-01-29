export type ProcedureStep = {
  type: string;
  name: string;
  with?: Record<string, unknown>;
};

export type Procedure = {
  id: string;
  version: string;
  inputs?: Record<string, unknown>;
  steps: ProcedureStep[];
};

export type ProcedurePlanStep = {
  id: string;
  name: string;
  type: string;
  with: Record<string, unknown>;
};

export type ProcedurePlan = {
  id: string;
  version: string;
  source: {
    procedureId: string;
    procedureVersion: string;
  };
  inputs: Record<string, unknown>;
  steps: ProcedurePlanStep[];
};
