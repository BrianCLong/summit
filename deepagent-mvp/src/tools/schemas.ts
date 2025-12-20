export interface Tool {
  id: string;
  name: string;
  description: string;
  openapi: any;
  auth: any;
  tags: string[];
  enabled: boolean;
  owner: string;
  created_at: Date;
}
