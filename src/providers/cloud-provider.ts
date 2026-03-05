export interface SummitQuery {
  id: string;
  payload: any;
}

export interface Result {
  status: 'success' | 'error';
  data?: any;
  error?: string;
  provider: string;
}

export interface CloudProvider {
  name: string;
  health(): Promise<boolean>;
  query(q: SummitQuery): Promise<Result>;
}
