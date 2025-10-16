import { hotReloadLoop } from './hotReloadController';
export function startPolicyManager(signal?: AbortSignal) {
  return hotReloadLoop(signal);
}
