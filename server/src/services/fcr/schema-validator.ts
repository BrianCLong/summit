import Ajv2020Module from 'ajv/dist/2020.js';
import addFormatsModule from 'ajv-formats';
import { promises as fs } from 'fs';
import path from 'path';
import { FcrSignal } from './types.js';

const Ajv2020 = (Ajv2020Module as any).default || Ajv2020Module;
const addFormats = (addFormatsModule as any).default || addFormatsModule;

export class FcrSchemaValidator {
  private ajv = new Ajv2020({ allErrors: true, strict: true });

  constructor() {
    addFormats(this.ajv);
  }

  async validateSignals(signals: FcrSignal[]) {
    const schemaPath = path.resolve(
      process.cwd(),
      'schemas',
      'fcr',
      'v1',
      'fcr-signal.schema.json',
    );
    const schemaRaw = await fs.readFile(schemaPath, 'utf8');
    const schema = JSON.parse(schemaRaw);
    const validate = this.ajv.compile(schema);
    const failures: string[] = [];

    for (const signal of signals) {
      const ok = validate(signal);
      if (!ok) {
        failures.push(
          ...((validate.errors || []).map(
            (error) => `${signal.entity_id}: ${error.instancePath} ${error.message}`,
          )),
        );
      }
    }

    return {
      ok: failures.length === 0,
      errors: failures,
    };
  }
}
