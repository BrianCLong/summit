export type GovernanceVerdict = "ALLOW" | "WARN" | "BLOCK";

export type DatasetRef = {
  namespace: string; // e.g., "db.schema" or "schema"
  name: string; // table/view name
  fields?: Array<{ name: string; type: string }>;
};

export type ExtractConfig = {
  jobNamespace: string;
  jobName: string;
  actor: string;
  sourceSha: string; // git SHA
  policyHash: string; // sha256
  ciRunId?: string;
  datasetNamespace: string; // default namespace for outputs if schema not specified
  verdict?: GovernanceVerdict;
};

export type LineageEdge = {
  from: DatasetRef;
  to: DatasetRef;
  operation: "CREATE_VIEW" | "INSERT_SELECT" | "UPDATE_FROM" | "UNKNOWN";
  notes?: string[];
};

export type ExtractResult = {
  normalizedSql: string;
  sqlHash: string;
  inputs: DatasetRef[];
  outputs: DatasetRef[];
  edges: LineageEdge[];
  verdict: GovernanceVerdict;
  notes: string[];
};
