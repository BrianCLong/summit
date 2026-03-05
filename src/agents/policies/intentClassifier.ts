/**
 * Simple mock intent classifier for testing and governance demonstration.
 * In a real implementation, this would likely involve an LLM call or advanced NLP heuristics.
 */
export function classifyIntent(prompt: string): string {
  const normalized = prompt.toLowerCase();

  if (normalized.includes('strike') || normalized.includes('target coordinates') || normalized.includes('kinetic')) {
    return 'kinetic_action';
  }
  if (normalized.includes('drone swarm') || normalized.includes('autonomous kill')) {
    return 'autonomous_targeting';
  }
  if (normalized.includes('sabotage') || normalized.includes('disrupt power grid')) {
    return 'critical_infrastructure_sabotage';
  }
  if (normalized.includes('disinformation') || normalized.includes('election interference')) {
    return 'mass_disinformation';
  }
  if (normalized.includes('surveillance target') || normalized.includes('track citizen')) {
    return 'unauthorized_surveillance';
  }

  // Allowed specific defense/research intents
  if (normalized.includes('defensive operations') || normalized.includes('threat intel')) {
    return 'defensive_cyber_operations';
  }
  if (normalized.includes('vulnerability research') || normalized.includes('fuzzing')) {
    return 'vulnerability_research';
  }
  if (normalized.includes('strategic advantage') || normalized.includes('logistics analysis')) {
    return 'strategic_planning';
  }

  // Default benign intent
  return 'general_assistance';
}
