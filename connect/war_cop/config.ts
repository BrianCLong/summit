export const WAR_COP_FEATURE_FLAG = process.env.SUMMIT_WAR_COP_ENABLED === "true";

export type RawIntelRecord = {
  source: string;
  collected_at: string;
  external_id: string;
  body: string;
  url?: string;
};
