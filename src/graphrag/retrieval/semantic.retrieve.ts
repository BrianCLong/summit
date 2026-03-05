import { embedText } from '../embeddings/embedding.service';

export async function semanticSearch(query: string, k = 5) {
  const embedding = await embedText(query)
  // TODO vector search
}
