export interface Agent {
  id: string;
  name: string;
  tags: string[];
}

export interface SystemStatus {
  id: string;
  title: string;
  metric: string;
  desc: string;
  docsLink?: string;
  logsLink?: string;
  actions?: Action[];
}

export interface Action {
  id: string;
  label: string;
}
