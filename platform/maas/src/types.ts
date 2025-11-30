export interface Tenant {
  id: string;
  name: string;
  modules: string[];
  region: string;
  slaTier: 'STANDARD' | 'PREMIUM';
  createdAt: Date;
}
