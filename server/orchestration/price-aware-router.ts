// server/orchestration/price-aware-router.ts
import { fetchPriceSignals } from './price-signal-ingestor';

// Mock resource types
type Resource = { id: string; type: 'compute' | 'llm'; costPerUnit: number };

// Mock available resources
const mockResources: Resource[] = [
  { id: 'compute-us-east', type: 'compute', costPerUnit: 0.1 },
  { id: 'compute-eu-west', type: 'compute', costPerUnit: 0.12 },
  { id: 'llm-provider-a', type: 'llm', costPerUnit: 0.000015 },
  { id: 'llm-provider-b', type: 'llm', costPerUnit: 0.000018 },
];

/**
 * Selects the cheapest available resource based on real-time price signals.
 * @param resourceType The type of resource to select.
 * @returns The cheapest resource.
 */
export async function selectCheapestResource(
  resourceType: 'compute' | 'llm',
): Promise<Resource | null> {
  const prices = await fetchPriceSignals();

  let cheapestResource: Resource | null = null;
  let minEffectiveCost = Infinity;

  for (const resource of mockResources) {
    if (resource.type === resourceType) {
      let effectiveCost = resource.costPerUnit;
      if (resource.type === 'compute') {
        effectiveCost *= prices.compute; // Adjust by real-time compute price
      } else if (resource.type === 'llm') {
        effectiveCost *= prices.llmTokens; // Adjust by real-time LLM token price
      }

      if (effectiveCost < minEffectiveCost) {
        minEffectiveCost = effectiveCost;
        cheapestResource = resource;
      }
    }
  }

  console.log(
    `Selected cheapest ${resourceType} resource:`,
    cheapestResource?.id,
    `(Effective Cost: ${minEffectiveCost.toFixed(6)})`,
  );
  return cheapestResource;
}

// Example usage:
// selectCheapestResource('compute').then(res => console.log('Cheapest compute:', res));
