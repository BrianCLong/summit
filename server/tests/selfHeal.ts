export function stabilize(testOutput: string) {
  if (/Randomized with seed (\d+)/.test(testOutput))
    return 'Set fixed seed via jest --seed=${1}';
  if (/Timeout.*async/.test(testOutput))
    return 'Wrap async with fake timers or increase timeout for flaky I/O';
  return 'Capture flake and quarantine with owner + hypothesis comment';
}
