import { runHook } from '../packages/context/src/hooks.mjs';

async function main() {
  try {
    console.log('Attempting run without flag...');
    await runHook('test_hook');
  } catch (e) {
    console.log('Expected error:', e.message);
  }

  process.env.ENABLE_CONTEXT_HOOKS = 'true';
  console.log('Attempting run with flag...');
  try {
    const result = await runHook('test_hook');
    console.log('Success:', result.trim());
  } catch (e) {
    console.error('Unexpected error:', e);
  }
}

main();
