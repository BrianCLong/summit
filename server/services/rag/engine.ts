import { isBrownout } from "./brownout";
import { streamFromCache, putCache } from "../../lib/cache"; // Assuming cache is in lib
import { realAnswerStream } from "./llm"; // your normal path

export async function* answerStream(q:string){
  if (await isBrownout()){
    const cached = await streamFromCache(q);
    if (cached) { for (const t of cached) yield t; return; }
    const fallback = [
      "⚠️ Brownout mode active. Returning cached context and safe next steps.\n",
      "- Check recent emails and notes pinned to this contact.\n",
      "- Use /search type:intel to pull latest filings/news already cached.\n"
    ];
    for (const t of fallback) yield t;
    return;
  }
  // normal path
  let buf:string[] = [];
  for await (const t of realAnswerStream(q)) { buf.push(t); yield t; }
  putCache(q, buf);
}