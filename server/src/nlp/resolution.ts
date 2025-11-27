export interface CoreferenceChain {
  mentions: string[];
  representative: string;
  confidence: number;
}

export class ContextDisambiguator {
  async resolve(text: string): Promise<Record<string, string[]>> {
    const sentences = text.split(/[.!?]/).filter(Boolean);
    const chains: Record<string, string[]> = {};

    sentences.forEach((sentence, idx) => {
      const key = `S${idx + 1}`;
      chains[key] = this.extractMentions(sentence.trim());
    });

    return chains;
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
