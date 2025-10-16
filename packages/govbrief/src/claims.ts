import { ArticleRecord, ClaimRecord } from './types.js';
import { limitWords, splitIntoSentences, unique } from './utils.js';

interface CandidateClaim {
  sentence: string;
  score: number;
  sectionId: string;
  sectionTitle: string;
}

const IDEOLOGY_TAGS: Record<string, RegExp[]> = {
  'far-right': [/far[-\s]?right/i, /white suprem/i, /neo-?nazi/i],
  'far-left': [/far[-\s]?left/i, /left[-\s]?wing/i],
  islamist: [/islamist/i, /jihad/i],
  'single-issue': [/single-issue/i, /anti-abortion/i, /environmental/i],
};

function detectTags(text: string): string[] {
  const matches: string[] = [];
  for (const [tag, patterns] of Object.entries(IDEOLOGY_TAGS)) {
    if (patterns.some((pattern) => pattern.test(text))) {
      matches.push(tag);
    }
  }
  return matches;
}

function scoreSentence(sentence: string): number {
  let score = sentence.length;
  if (/\d/.test(sentence)) {
    score += 25;
  }
  if (
    /(increase|decrease|trend|risk|factor|research|finding|evidence|study)/i.test(
      sentence,
    )
  ) {
    score += 20;
  }
  if (
    /(extremist|terror|violence|military|internet|white suprem)/i.test(sentence)
  ) {
    score += 15;
  }
  return score;
}

function collectCandidates(article: ArticleRecord): CandidateClaim[] {
  const candidates: CandidateClaim[] = [];
  for (const section of article.sections) {
    const sentences = splitIntoSentences(section.text);
    for (const sentence of sentences) {
      const normalized = sentence.replace(/\s+/g, ' ').trim();
      if (normalized.length < 40) {
        continue;
      }
      const score = scoreSentence(normalized);
      candidates.push({
        sentence: normalized,
        score,
        sectionId: section.id,
        sectionTitle: section.title,
      });
    }
  }
  return candidates;
}

export function generateClaims(
  article: ArticleRecord,
  contentHash: string,
  minimum = 10,
): ClaimRecord[] {
  const candidates = collectCandidates(article)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(minimum * 3, 40));

  const claims: ClaimRecord[] = [];
  const seenTexts = new Set<string>();
  let counter = 1;

  for (const candidate of candidates) {
    if (seenTexts.has(candidate.sentence)) {
      continue;
    }
    const claimText = limitWords(candidate.sentence.replace(/"/g, ''), 28);
    const ideologyTags = unique(detectTags(candidate.sentence));
    const record: ClaimRecord = {
      claimId: `clm-${counter.toString().padStart(2, '0')}`,
      text: claimText,
      salience: candidate.score,
      ideologyTags,
      evidence: {
        snippet: limitWords(candidate.sentence, 32),
        section: candidate.sectionTitle,
        anchor: candidate.sectionId,
        url: article.archiveUrl ?? article.url,
        contentHash,
      },
      confidence: {
        value: 'medium',
        rationale:
          'Claim generated from NIJ article using deterministic heuristics.',
      },
      assumptions: [
        'Relies on NIJ-published synthesis without independent replication.',
      ],
    };
    claims.push(record);
    seenTexts.add(candidate.sentence);
    counter += 1;
    if (claims.length >= minimum) {
      break;
    }
  }

  return claims;
}
