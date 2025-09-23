import { Accountant } from '../../privacy/dp/Accountant'
import { dpCount, dpSum, DPMeta } from '../../privacy/dp/Mechanisms'

export async function runDpJoinAggregate(opts: {
  tokenRef: string
  meta: DPMeta
  cohortMin: number
  accountant: Accountant
  template: 'count' | 'sum' | 'avg' | 'topk'
}): Promise<{ value: number; meta: DPMeta }> {
  if (opts.meta.kMin < opts.cohortMin) throw new Error('k_min_too_low')
  await opts.accountant.charge(`dp:${opts.tokenRef}`, opts.meta.epsilon)
  const rawCount = Math.max(opts.cohortMin, 1)
  const rawValues = [opts.meta.clip, opts.meta.clip]
  if (opts.template === 'count') return dpCount(rawCount, opts.meta)
  if (opts.template === 'sum') return dpSum(rawValues, opts.meta)
  if (opts.template === 'avg') {
    const sum = dpSum(rawValues, opts.meta).value
    const count = dpCount(rawCount, opts.meta).value
    return { value: sum / count, meta: opts.meta }
  }
  return { value: 0, meta: opts.meta }
}
