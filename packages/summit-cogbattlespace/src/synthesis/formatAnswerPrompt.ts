import type { RetrievalResponse } from "../retrieval/types";
import { formatRetrievalContext } from "../retrieval/formatContext";

export function formatLaneAwareAnswerPrompt(resp: RetrievalResponse): string {
  return [
    "You are synthesizing an analytic/defensive answer from lane-scoped retrieval results.",
    "Do not overstate lower-lane material as canonical.",
    "Rules:",
    "- PROMOTED may be stated as canonical if corroborated in context.",
    "- TRUSTED should be framed as strongly supported, not final canonical fact.",
    "- OBSERVED should be framed as developing signal.",
    "- CANDIDATE should be framed as preliminary and non-definitive.",
    "- If only OBSERVED or CANDIDATE material exists, explicitly refuse canonical tone.",
    "",
    "Retrieved context follows:",
    formatRetrievalContext(resp)
  ].join("\n");
}
