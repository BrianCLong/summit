import { v4 as uuidv4 } from 'uuid';
import { echoSkill, echoSkillSpec, SingleSkillThenStopController, registerSkill, runController } from '../skills/index.js';
import type { SkillContext } from '../skills/index.js';

const featureEnabled = process.env.SKILLS_CONTROLLER_ENABLED === 'true';

if (!featureEnabled) {
  console.error('SKILLS_CONTROLLER_ENABLED is false. Enable it to run the skills controller demo.');
  process.exit(1);
}

const goalFromArg = process.argv[2] || 'demo goal satisfied by echo skill';

const ctx: SkillContext = {
  tenantId: process.env.DEMO_TENANT_ID || 'demo-tenant',
  actorId: process.env.DEMO_ACTOR_ID || 'demo-actor',
  traceId: uuidv4(),
  requestId: uuidv4(),
  now: new Date().toISOString(),
  budget: {
    maxSteps: 5,
    maxToolCalls: 5,
    maxMillis: 10_000,
  },
  policy: {
    classification: 'internal',
    allowedTools: ['echo', 'skills-demo'],
  },
};

registerSkill(echoSkillSpec, echoSkill);
const controller = new SingleSkillThenStopController(echoSkillSpec.id);

runController(controller, { goal: goalFromArg, ctx })
  .then((result) => {
    console.log('[skills-controller] run complete');
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((err) => {
    console.error('Skills controller demo failed', err);
    process.exitCode = 1;
  });
