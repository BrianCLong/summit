export const STORY_ID_CANON: readonly string[] = [
  'Election-Process-Suppression/Voice-Clone/Call-Back-CTA',
  'Election-Logistics/Multi-Lingual-Suppression',
  'Disaster-Authority-Blame/Agency-Incompetence',
  'Finance-Fake-Exec/Deepfake-Video',
  'Financial-Markets/AI-Pump-And-Dump',
  'Geopolitics-Ukraine/Legitimacy-Narratives',
  'Geopolitics-Taiwan/Deterrence-Failure',
  'Middle-East/Humanitarian-Obstruction-Claims',
  'Critical-Infrastructure/Utility-Grid-Compromise'
];

export function isKnownStoryId(storyId: string | null | undefined): boolean {
  if (!storyId) {
    return false;
  }
  return STORY_ID_CANON.includes(storyId);
}
