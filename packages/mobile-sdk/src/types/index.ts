// Export common types
export interface Entity {
  id: string;
  name: string;
  type: string;
  description?: string;
  properties: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
