export {};

declare global {
  namespace Express {
    interface Request {
      user?: {
        id?: string;
        [key: string]: unknown;
      };
      subject?: {
        id?: string;
        tenant_id?: string;
        [key: string]: unknown;
      };
      log?: {
        info?: (meta: Record<string, unknown>, message?: string) => void;
        error?: (meta: Record<string, unknown>, message?: string) => void;
        [key: string]: unknown;
      };
    }
  }
}
