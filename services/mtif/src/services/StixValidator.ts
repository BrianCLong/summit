import Ajv, { type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import stixBundleSchema from '../schema/stix21-bundle.json';
import type { StixBundle } from '../types.js';

export class StixValidator {
  private readonly validator: ValidateFunction<StixBundle>;

  constructor() {
    const ajv = new Ajv({
      strict: false,
      allErrors: true,
      allowUnionTypes: true
    });
    addFormats(ajv);
    this.validator = ajv.compile<StixBundle>(stixBundleSchema);
  }

  validateBundle(bundle: StixBundle): void {
    const valid = this.validator(bundle);
    if (!valid) {
      const errors = this.validator.errors?.map((error) =>
        `${error.instancePath || '/'} ${error.message ?? ''}`.trim()
      );
      throw new Error(`STIX bundle validation failed: ${errors?.join('; ') ?? 'unknown error'}`);
    }
  }
}

export const stixValidator = new StixValidator();
