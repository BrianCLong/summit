import { FEATURE_FLAGS } from './flags';
import { resolveCitations } from './citation_resolver';

export async function verifyAndRetrieve(
  query: string,
  retrievalFn: (q: string) => Promise<string[]>,
  generationFn: (q: string, chunks: string[]) => Promise<string>,
  maxRetries = 2
): Promise<string> {
  // If feature flag is off, just execute standard RAG
  if (!FEATURE_FLAGS.VERIFIER_LOOP_ENABLED) {
    const chunks = await retrievalFn(query);
    return generationFn(query, chunks);
  }

  let attempt = 0;
  while (attempt <= maxRetries) {
    const chunks = await retrievalFn(query);
    const answer = await generationFn(query, chunks);

    // Check citation/groundedness mapping
    const isValid = resolveCitations(answer, chunks);
    if (isValid) {
      return answer;
    }
    attempt++;
  }

  return "I'm sorry, I could not find supported evidence to answer this query.";
}
