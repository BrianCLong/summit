import Redis from "ioredis";
const redis = new Redis(process.env.REDIS_URL||"");
const KEY = "brownout:mode";

export async function isBrownout():Promise<boolean> {
  if (process.env.BROWNOUT_MODE === "true") return true;
  const v = await redis.get(KEY);
  return v === "true";
}
export async function setBrownout(v:boolean){ await redis.set(KEY, v?"true":"false", "EX", 3600); }