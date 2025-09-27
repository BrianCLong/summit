export type SecurityLevel = 'low' | 'medium' | 'high';

export interface Label {
  id: string;
  security: SecurityLevel;
  purposes: Set<string>;
  filePath: string;
  line: number;
}

export type TransformKind = 'transform' | 'redactor';

export interface Transform {
  name: string;
  kind: TransformKind;
  filePath: string;
  line: number;
}

export interface FlowEdge {
  source: string;
  target: string;
  transform?: string;
  filePath: string;
  line: number;
}

export interface AnnotatedFile {
  filePath: string;
  labels: Label[];
  flows: FlowEdge[];
  transforms: Transform[];
}

export type DiagnosticType =
  | 'missing-label'
  | 'security-violation'
  | 'purpose-violation';

export interface FlowDiagnostic {
  type: DiagnosticType;
  message: string;
  trace: string[];
  suggestion: string;
  filePath: string;
  line: number;
}

export interface AnalysisResult {
  labels: Map<string, Label>;
  flows: FlowEdge[];
  transforms: Map<string, Transform>;
  errors: FlowDiagnostic[];
}
