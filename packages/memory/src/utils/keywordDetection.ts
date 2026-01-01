const KEYWORDS = [
  'remember',
  "don't forget",
  'save this',
  'note that',
  'for next time',
];

export interface DetectedIntent {
  matched: boolean;
  phrase?: string;
  extracted?: string;
  scope: 'user' | 'project';
}

export const detectRememberIntent = (message: string): DetectedIntent => {
  const normalized = message.toLowerCase();
  const phrase = KEYWORDS.find((keyword) => normalized.includes(keyword));
  if (!phrase) {
    return { matched: false, scope: 'project' };
  }

  const scope: 'user' | 'project' = normalized.includes('for me everywhere') ? 'user' : 'project';
  const keywordIndex = normalized.indexOf(phrase);
  const extracted = keywordIndex >= 0 ? message.slice(keywordIndex + phrase.length).trim() || message.trim() : message.trim();

  return { matched: true, phrase, extracted, scope };
};
