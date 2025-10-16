export function shouldPreempt(remainingUSD: number, priority: 'hi' | 'lo') {
  return remainingUSD < 0.1 && priority === 'lo';
}
