import { z } from "zod";

/**
 * Standard pagination metadata for list-returning tools.
 */
export const PaginationSchema = z.object({
  has_more: z.boolean(),
  next_offset: z.number().optional(),
  total_count: z.number().optional(),
});

/**
 * Summit-specific metadata for context-budget awareness.
 */
export const SummitMetaSchema = z.object({
  size_estimate: z.string().describe("Rough character count or row count (e.g., '1.2KB', '50 rows')"),
  recommendation: z.enum(["summarize", "fetch_more", "proceed"]).optional(),
});

/**
 * Base response envelope for all Summit MCP tools.
 */
export const ToolResponseSchema = z.object({
  data: z.any(),
  pagination: PaginationSchema.optional(),
  _summit_meta: SummitMetaSchema.optional(),
});

export type ToolResponse = z.infer<typeof ToolResponseSchema>;

/**
 * Safety & Governance tags for tools.
 */
export interface ToolGovernance {
  pii?: boolean;
  destructive?: boolean;
  external?: boolean;
  write?: boolean;
}
