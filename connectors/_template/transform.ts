import { NormalizedEntity, createNormalizedEntity } from "../../packages/connector-sdk/src";

export function transform(input: any, sourceRef: string): NormalizedEntity[] {
  const entities: NormalizedEntity[] = [];

  const domain = createNormalizedEntity(
    "domain",
    input.domain,
    [sourceRef],
    {
      registrar: input.registrar,
      creation_date: input.creation_date,
    },
    [],
    0.97,
    { start: "2025-01-01", end: null }
  );
  entities.push(domain);

  if (input.registrant && input.registrant.name) {
    const registrant = createNormalizedEntity(
      "registrant",
      input.registrant.name,
      [sourceRef],
      {
        email: input.registrant.email,
        organization: input.registrant.organization,
      },
      [],
      0.95,
      { start: "2025-01-01", end: null }
    );
    entities.push(registrant);
  }

  return entities;
}
