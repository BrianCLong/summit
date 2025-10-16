import { defineTask } from '@summit/maestro-sdk';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

interface In {
  schema: object;
  data: unknown;
}

export default defineTask<In, { valid: true }>({
  async execute(_ctx, { payload }) {
    const ajv = new Ajv({ allErrors: true });
    addFormats(ajv);
    const validate = ajv.compile(payload.schema as any);
    if (!ok)
      throw new Error(
        'Schema validation failed: ' + JSON.stringify(validate.errors),
      );
    return { payload: { valid: true } };
  },
});
