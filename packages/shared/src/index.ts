// Shared utilities and types for Summit platform
export const version = '1.0.0';

export type BaseEntity = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };
