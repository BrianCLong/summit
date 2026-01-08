// @ts-nocheck
import { defineTask } from "@intelgraph/maestro-sdk";
import Ajv from "ajv";
import addFormats from "ajv-formats";

interface In {
  schema: object;
  data: unknown;
}

export default defineTask<In, { valid: true }>({
  execute(_ctx, { payload }) {
    const ajv = new Ajv({ allErrors: true });
    addFormats(ajv);
    const validate = ajv.compile(payload.schema as any);
    if (!validate(payload.data)) {
      throw new Error(`Schema validation failed: ${JSON.stringify(validate.errors)}`);
    }
    return Promise.resolve({ payload: { valid: true as const } });
  },
});
