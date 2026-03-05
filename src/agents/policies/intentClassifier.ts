export interface IntentClassificationResult {
  intent: string;
  confidence: number;
  isRedline: boolean;
}

export const classifyIntent = async (prompt: string): Promise<IntentClassificationResult> => {
  const lowerPrompt = prompt.toLowerCase();
  let intent = 'general_inquiry';
  let isRedline = false;
  if (lowerPrompt.includes('kill') || lowerPrompt.includes('attack') || lowerPrompt.includes('weapon')) {
      intent = 'autonomous_lethal_action';
      isRedline = true;
  } else if (lowerPrompt.includes('surveil') || lowerPrompt.includes('track everyone')) {
      intent = 'mass_surveillance';
      isRedline = true;
  } else if (lowerPrompt.includes('intelligence') || lowerPrompt.includes('defense')) {
      intent = 'intelligence_analysis';
  }
  return {
    intent,
    confidence: 0.85,
    isRedline
  };
};
