export interface ExtractedClaim {
  id: string;
  text: string;
  startOffset: number;
  endOffset: number;
}

const isVerifiable = (sentence: string): boolean => {
  const hasNumber = /\d/.test(sentence);
  const hasDate = /\b(19|20)\d{2}\b/.test(sentence);
  const hasEntity = /\b[A-Z][a-z]+\b/.test(sentence);
  return (hasNumber || hasDate) && hasEntity && sentence.length > 40;
};

export const extractClaims = (reportText: string): ExtractedClaim[] => {
  const sentences = reportText
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);

  const claims: ExtractedClaim[] = [];
  let cursor = 0;

  sentences.forEach((sentence, index) => {
    const startOffset = reportText.indexOf(sentence, cursor);
    const endOffset = startOffset + sentence.length;
    cursor = endOffset;

    if (isVerifiable(sentence)) {
      claims.push({
        id: `claim-${index + 1}`,
        text: sentence,
        startOffset,
        endOffset,
      });
    }
  });

  return claims;
};
