export interface Budget {
  id: string;
  tenantId: string;
  limit: number;
  currency: string;
  spent: number;
  period: 'daily' | 'monthly' | 'total';
  resetAt?: Date;
}
