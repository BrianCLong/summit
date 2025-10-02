export type PrimitiveType = 'string' | 'integer' | 'float' | 'boolean' | 'date';

export interface Column {
  name: string;
  type: PrimitiveType;
  nullable?: boolean;
}

export interface Table {
  name: string;
  columns: Column[];
}

export interface SchemaDefinition {
  version: string;
  tables: Table[];
}

export interface ConsumerUsage {
  consumer: string;
  table: string;
  columns: string[];
  frequency: number; // per day
}

export interface Telemetry {
  windowDays: number;
  usages: ConsumerUsage[];
}

export type ChangeKind = 'rename' | 'split' | 'widen';

export interface BaseChange {
  type: ChangeKind;
  table: string;
  rationale?: string;
}

export interface RenameChange extends BaseChange {
  type: 'rename';
  from: string;
  to: string;
}

export interface SplitTargetColumn {
  name: string;
  type: PrimitiveType;
  nullable?: boolean;
}

export interface SplitChange extends BaseChange {
  type: 'split';
  column: string;
  into: SplitTargetColumn[];
}

export interface WidenChange extends BaseChange {
  type: 'widen';
  column: string;
  newType: PrimitiveType;
}

export type SchemaChange = RenameChange | SplitChange | WidenChange;

export interface SimulationConfig {
  schemaPath: string;
  telemetryPath: string;
  changesPath: string;
  fixturePath?: string;
  outputPath?: string;
}

export type CompatibilityLevel = 'compatible' | 'needs-migration' | 'breaking';

export interface ConsumerImpact {
  consumer: string;
  table: string;
  status: CompatibilityLevel;
  reasons: string[];
  affectedColumns: string[];
}

export interface CompatibilityMatrix {
  impacts: ConsumerImpact[];
}

export interface MigrationScript {
  table: string;
  sql: string;
  codeStub: string;
  changeType: ChangeKind;
  details?: Record<string, unknown>;
}

export interface MigrationBundle {
  migrations: MigrationScript[];
}

export interface RiskAssessment {
  score: number;
  severity: 'low' | 'medium' | 'high';
  notes: string[];
}

export interface RolloutPhase {
  name: string;
  goals: string[];
  gate: 'pass' | 'fail';
  riskScore: number;
}

export interface RolloutPlan {
  phases: RolloutPhase[];
}

export interface SimulationOutput {
  compatibility: CompatibilityMatrix;
  migrationBundle: MigrationBundle;
  risk: RiskAssessment;
  rollout: RolloutPlan;
  fixturePreview?: FixtureDataset;
}

export interface FixtureDataset {
  tables: Record<string, Record<string, unknown>[]>;
}
