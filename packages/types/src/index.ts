export const version = '1.0.0';

export type ID = string;
export type Timestamp = Date | string;

export interface BaseModel {
  id: ID;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
