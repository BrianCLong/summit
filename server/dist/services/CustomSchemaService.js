import { z } from "zod";
import { getPostgresPool } from "../db/postgres.js";
import { getRedisClient } from "../db/redis.js";
const CACHE_PREFIX = "investigation:customSchema:";
const CACHE_TTL_SECONDS = 3600;
export async function getCustomSchema(investigationId) {
    const redis = getRedisClient();
    const cacheKey = `${CACHE_PREFIX}${investigationId}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
        try {
            return JSON.parse(cached);
        }
        catch {
            // ignore parse errors
        }
    }
    const pool = getPostgresPool();
    const res = await pool.query("SELECT custom_schema FROM investigations WHERE id = $1", [investigationId]);
    const schema = res.rows[0]?.custom_schema || [];
    await redis.set(cacheKey, JSON.stringify(schema), "EX", CACHE_TTL_SECONDS);
    return schema;
}
export async function setCustomSchema(investigationId, schema) {
    const pool = getPostgresPool();
    await pool.query("UPDATE investigations SET custom_schema = $1 WHERE id = $2", [JSON.stringify(schema), investigationId]);
    const redis = getRedisClient();
    await redis.set(`${CACHE_PREFIX}${investigationId}`, JSON.stringify(schema), "EX", CACHE_TTL_SECONDS);
}
export function buildValidator(schema) {
    const shape = {};
    for (const field of schema) {
        switch (field.type) {
            case "string":
                shape[field.name] = z.string().optional();
                break;
            case "number":
                shape[field.name] = z.number().optional();
                break;
            case "enum":
                if (field.options) {
                    shape[field.name] = z.enum(field.options).optional();
                }
                break;
        }
    }
    return z.object(shape).passthrough();
}
export async function validateCustomMetadata(investigationId, data) {
    const schema = await getCustomSchema(investigationId);
    if (!schema || schema.length === 0)
        return;
    const validator = buildValidator(schema);
    validator.parse(data);
}
//# sourceMappingURL=CustomSchemaService.js.map