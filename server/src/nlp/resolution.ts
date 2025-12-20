export interface CoreferenceChain {
  mentions: string[];
  representative: string;
  confidence: number;
}

import { GraphStore } from '../graph/store';

interface EntityCluster {
    canonicalName: string;
    aliases: string[];
    type: string;
    confidence: number;
}

export class ContextDisambiguator {
  private graphStore: GraphStore;

  constructor(graphStore?: GraphStore) {
    this.graphStore = graphStore || new GraphStore();
  }

  async resolve(text: string, knownEntities: EntityCluster[] = []): Promise<Record<string, string[]>> {
    const sentences = text.split(/[.!?]/).filter(Boolean);
    const chains: Record<string, string[]> = {};

    // First pass: basic mention extraction
    sentences.forEach((sentence, idx) => {
      const key = `S${idx + 1}`;
      chains[key] = this.extractMentions(sentence.trim());
    });

    // Second pass: Entity Resolution against KG
    // (This is a simplified simulation of linking mentions to KG IDs)
    if (knownEntities.length > 0) {
       await this.disambiguateAgainstKG(chains, knownEntities);
    }

    return chains;
  }

  private async disambiguateAgainstKG(chains: Record<string, string[]>, knownEntities: EntityCluster[]) {
      // In a real implementation, we would fuzzy match mentions to graph nodes
      // and update the chain values with canonical IDs or names.
      // Here we just perform a naive exact match check for demonstration.
      for (const key in chains) {
          chains[key] = chains[key].map(mention => {
              const match = knownEntities.find(e => e.canonicalName === mention || e.aliases.includes(mention));
              if (match) {
                  return `${mention} [RESOLVED: ${match.type}]`;
              }
              return mention;
          });
      }
  }

  /**
   * Clustering for identifying aliases and duplicates.
   * Simplistic implementation using string similarity or token overlap.
   */
  clusterEntities(entities: Array<{ text: string; label: string; confidence: number }>): EntityCluster[] {
      const clusters: Record<string, Array<{ text: string; label: string; confidence: number }>> = {};

      entities.forEach(ent => {
          let foundCluster = false;
          for (const key in clusters) {
              // Simple check: if text is contained in key or vice versa
              if (key.includes(ent.text) || ent.text.includes(key)) {
                  clusters[key].push(ent);
                  foundCluster = true;
                  break;
              }
          }
          if (!foundCluster) {
              clusters[ent.text] = [ent];
          }
      });

      // Merge clusters
      return Object.entries(clusters).map(([canonical, items]) => ({
          canonicalName: canonical,
          aliases: items.map(i => i.text),
          type: items[0].label,
          confidence: items.reduce((acc, curr) => acc + (curr.confidence || 0), 0) / items.length
      }));
  }

  private extractMentions(sentence: string): string[] {
    const tokens = sentence.split(/\s+/).filter(Boolean);
    const pronouns = ['he', 'she', 'they', 'it', 'them', 'his', 'her'];
    const mentions: string[] = [];

    for (let i = 0; i < tokens.length; i += 1) {
      const token = tokens[i];
      if (pronouns.includes(token.toLowerCase())) {
        const previous = tokens[i - 1];
        if (previous) {
          mentions.push(`${previous} -> ${token}`);
        } else {
          mentions.push(token);
        }
      }
    }

    if (mentions.length === 0 && sentence.length > 0) {
      mentions.push(sentence.split(' ').slice(0, 3).join(' '));
    }

    return mentions;
  }
}
