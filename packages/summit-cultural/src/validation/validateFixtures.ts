import { loadCulturalValidators } from "./loadValidators.js";

function formatErrors(errors: unknown): string {
  try {
    return JSON.stringify(errors, null, 2);
  } catch {
    return String(errors);
  }
}

export function validateFixtureArray<T>(
  label: string,
  items: unknown[],
  validate: (item: unknown) => boolean,
  errorsAccessor: () => unknown
): T[] {
  const validItems: T[] = [];

  for (const item of items) {
    const ok = validate(item);
    if (!ok) {
      throw new Error(`${label} fixture validation failed:\n${formatErrors(errorsAccessor())}`);
    }
    validItems.push(item as T);
  }

  return validItems;
}

export function validateCulturalFixtures(input: {
  populations: unknown[];
  narratives: unknown[];
  fingerprints: unknown[];
}) {
  const validators = loadCulturalValidators();

  return {
    populations: validateFixtureArray(
      "populations",
      input.populations,
      validators.populationValidator,
      () => validators.populationValidator.errors
    ),
    narratives: validateFixtureArray(
      "narratives",
      input.narratives,
      validators.narrativeValidator,
      () => validators.narrativeValidator.errors
    ),
    fingerprints: validateFixtureArray(
      "fingerprints",
      input.fingerprints,
      validators.fingerprintValidator,
      () => validators.fingerprintValidator.errors
    )
  };
}
