import { opaEval } from '../policy/opa';
export async function fuzz(iter = 200) {
  for (let i = 0; i < iter; i++) {
    const input = {
      action: Math.random() < 0.5 ? 'write' : 'model_call',
      path: `/etc/${i}`,
      budget: Math.random() * 5,
    };
    const out = await opaEval(input);
    if (out.allow && input.path.startsWith('/etc'))
      throw new Error('Bypass detected');
  }
}
