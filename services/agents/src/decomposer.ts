import { schedule } from '../../tgo/src/csat';
import { emit, consume } from './bus';
consume('decomposer', async (m) => {
  if (m.kind !== 'decompose') return;
  const matrix = schedule(m.payload.tasks, m.payload.pools);
  await emit('review', { key: m.key, matrix });
});
