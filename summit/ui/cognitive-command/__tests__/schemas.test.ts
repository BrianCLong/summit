import { describe, it, expect } from 'vitest';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

// Import schemas
import forecastSchema from '../schemas/forecast.schema.json';
import worldStateSchema from '../schemas/world-state.schema.json';
import interventionSchema from '../schemas/intervention-option.schema.json';
import insightSchema from '../schemas/cognitive-insight.schema.json';
import missionSchema from '../schemas/mission-command.schema.json';
import narrativeSchema from '../schemas/narrative-battlespace.schema.json';
import autonomySchema from '../schemas/autonomy-supervision.schema.json';
import governanceSchema from '../schemas/governance-decision.schema.json';

// Import adapters
import { getForecastMock } from '../adapters/forecastAdapter';
import { getWorldStateMock } from '../adapters/worldModelAdapter';
import { getInterventionMock } from '../adapters/interventionAdapter';
import { getInsightMock } from '../adapters/insightAdapter';
import { getMissionMock } from '../adapters/missionAdapter';
import { getNarrativeMock } from '../adapters/narrativeAdapter';
import { getAutonomyMock } from '../adapters/autonomyAdapter';
import { getGovernanceMock } from '../adapters/governanceAdapter';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

describe('Cognitive Command Center JSON Schemas', () => {
  it('validates forecast mock data against forecast schema', () => {
    const validate = ajv.compile(forecastSchema);
    const mock = getForecastMock();
    const valid = validate(mock);
    if (!valid) console.log(validate.errors);
    expect(valid).toBe(true);
  });

  it('validates world state mock data against world state schema', () => {
    const validate = ajv.compile(worldStateSchema);
    const mock = getWorldStateMock();
    const valid = validate(mock);
    if (!valid) console.log(validate.errors);
    expect(valid).toBe(true);
  });

  it('validates intervention mock data against intervention schema', () => {
    const validate = ajv.compile(interventionSchema);
    const mock = getInterventionMock();
    const valid = validate(mock);
    if (!valid) console.log(validate.errors);
    expect(valid).toBe(true);
  });

  it('validates insight mock data against insight schema', () => {
    const validate = ajv.compile(insightSchema);
    const mock = getInsightMock();
    const valid = validate(mock);
    if (!valid) console.log(validate.errors);
    expect(valid).toBe(true);
  });

  it('validates mission mock data against mission schema', () => {
    const validate = ajv.compile(missionSchema);
    const mock = getMissionMock();
    const valid = validate(mock);
    if (!valid) console.log(validate.errors);
    expect(valid).toBe(true);
  });

  it('validates narrative mock data against narrative schema', () => {
    const validate = ajv.compile(narrativeSchema);
    const mock = getNarrativeMock();
    const valid = validate(mock);
    if (!valid) console.log(validate.errors);
    expect(valid).toBe(true);
  });

  it('validates autonomy mock data against autonomy schema', () => {
    const validate = ajv.compile(autonomySchema);
    const mock = getAutonomyMock();
    const valid = validate(mock);
    if (!valid) console.log(validate.errors);
    expect(valid).toBe(true);
  });

  it('validates governance mock data against governance schema', () => {
    const validate = ajv.compile(governanceSchema);
    const mock = getGovernanceMock();
    const valid = validate(mock);
    if (!valid) console.log(validate.errors);
    expect(valid).toBe(true);
  });
});
