export interface SummitQuery {
  id: string;
  type: string;
  payload: any;
}

export interface Result {
  status: string;
  data: any;
  provider: string;
}

export interface CloudProvider {
  name: string;
  health(): Promise<boolean>;
  query(q: SummitQuery): Promise<Result>;
}
