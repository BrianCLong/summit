// eslint-disable
export function evaluateWorkflowSuccess(
  predicted: number,
  actual: number
) {
  return Math.abs(predicted - actual)
}
