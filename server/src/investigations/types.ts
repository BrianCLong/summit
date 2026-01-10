export type CaseStatus = 'open' | 'closed' | 'archived' | string;

export interface Workspace {
  id: string;
  tenant_id: string;
  name: string;
  created_at: Date;
}

export interface Case {
  id: string;
  workspace_id: string;
  title: string;
  status: CaseStatus;
}

export interface EntityRef {
  type: string;
  external_id: string;
  display_name: string;
}

export interface Note {
  id: string;
  case_id: string;
  author_id: string;
  body: string;
  created_at: Date;
}
