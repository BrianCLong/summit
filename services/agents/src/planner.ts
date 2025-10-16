import { consume } from './bus';
import { planPR } from '../../tgo/src/plan';
consume('planner', async (m) => {
  if (m.kind !== 'plan') return;
  const tasks = planPR(m.payload.changed);
  // also attach CSAT pools & emit decompose
  await emit('decompose', { key: m.key, tasks });
});
