export type DualRunMode = 'off' | 'shadow-log' | 'shadow-metric' | 'enforce-new';

type Comparator<T> = (left: T, right: T) => boolean;

type Reporter<T> = (context: {
  mode: DualRunMode;
  input: unknown;
  legacy: T;
  candidate: T;
}) => void;

export function dualRun<TInput, TOutput>(
  legacy: (input: TInput) => TOutput,
  candidate: (input: TInput) => TOutput,
  comparator: Comparator<TOutput>,
  mode: DualRunMode = 'off',
  reporter?: Reporter<TOutput>,
): (input: TInput) => TOutput {
  return (input: TInput) => {
    const legacyResult = legacy(input);
    if (mode === 'off') {
      return legacyResult;
    }

    const candidateResult = candidate(input);
    const matches = comparator(legacyResult, candidateResult);

    if (reporter) {
      reporter({ mode, input, legacy: legacyResult, candidate: candidateResult });
    }

    if (mode === 'enforce-new') {
      return candidateResult;
    }

    if (!matches && mode === 'shadow-log') {
      console.warn('Shadow mismatch detected', { input, legacyResult, candidateResult });
    }

    return legacyResult;
  };
}
