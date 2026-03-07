import { createWriteSetValidatorWithCogGeo } from "./validateWritesetWithCogGeo.js";

const { validate } = createWriteSetValidatorWithCogGeo();

export async function writeCogGeoArtifacts(writesetEnvelope: any): Promise<{ accepted: boolean; rejectionReport?: unknown }> {
  const ok = validate(writesetEnvelope);
  if (!ok) {
    return {
      accepted: false,
      rejectionReport: {
        kind: "ajv_validation_failed",
        errors: (validate as any).errors ?? [],
      },
    };
  }

  // TODO: SV rules + IntelGraph persist
  return { accepted: true };
}
