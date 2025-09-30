import { redis } from "../lib/cache";
import { answerKey } from "../lib/cache";

export async function streamFromCache(q:string):Promise<string[]|null>{
  const key = answerKey(q, [], "default"); // simplified key for brownout
  const hit = await redis.get(key);
  if (hit) return JSON.parse(hit).answer.split(" "); // naive split
  return null;
}

export async function putCache(q:string, tokens:string[]):Promise<void>{
  const key = answerKey(q, [], "default");
  await redis.setex(key, Number(process.env.ANSWER_TTL_SEC||"600"), JSON.stringify({ answer: tokens.join("") }));
}