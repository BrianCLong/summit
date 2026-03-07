import AjvModule, { type ValidateFunction } from "ajv";
const Ajv = (AjvModule as any).default || AjvModule;
import addFormatsModule from "ajv-formats";
const addFormats = (addFormatsModule as any).default || addFormatsModule;
import culturalRealitySchema from "../schema/culturalReality.schema.json" with { type: "json" };
import narrativeSignalSchema from "../schema/narrativeSignal.schema.json" with { type: "json" };
import linguisticFingerprintSchema from "../schema/linguisticFingerprint.schema.json" with { type: "json" };

export interface CulturalValidators {
  ajv: typeof Ajv;
  populationValidator: ValidateFunction;
  narrativeValidator: ValidateFunction;
  fingerprintValidator: ValidateFunction;
}

export function loadCulturalValidators(): CulturalValidators {
  const ajv = new Ajv({
    allErrors: true,
    strict: true
  });
  addFormats(ajv);

  ajv.addSchema(culturalRealitySchema);
  ajv.addSchema(narrativeSignalSchema);
  ajv.addSchema(linguisticFingerprintSchema);

  const populationValidator = ajv.getSchema(
    "https://summit.local/schema/culturalReality.schema.json"
  );
  const narrativeValidator = ajv.getSchema(
    "https://summit.local/schema/narrativeSignal.schema.json"
  );
  const fingerprintValidator = ajv.getSchema(
    "https://summit.local/schema/linguisticFingerprint.schema.json"
  );

  if (!populationValidator || !narrativeValidator || !fingerprintValidator) {
    throw new Error("Failed to compile one or more cultural validators");
  }

  return {
    ajv,
    populationValidator,
    narrativeValidator,
    fingerprintValidator
  };
}
