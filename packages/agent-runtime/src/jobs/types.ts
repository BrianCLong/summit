export interface Job {
  id: string;
  type: string;
  data: any;
  status: "pending" | "running" | "completed" | "failed";
  result?: any;
  error?: string;
  createdAt: number;
  updatedAt: number;
}
export interface JobStore {
  create(type: string, data: any): Promise<Job>;
  get(id: string): Promise<Job | null>;
  update(id: string, update: Partial<Job>): Promise<Job>;
  list(status?: Job["status"]): Promise<Job[]>;
}
export interface JobHandler {
  run(job: Job): Promise<any>;
}
