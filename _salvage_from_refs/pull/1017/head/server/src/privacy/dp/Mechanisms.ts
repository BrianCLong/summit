export type DPMeta = {
  epsilon: number
  delta: number
  kMin: number
  clip: number
}

export function dpCount(rawCount: number, meta: DPMeta) {
  return { value: rawCount, meta }
}

export function dpSum(values: number[], meta: DPMeta) {
  const clipped = values.map((v) => Math.min(meta.clip, v))
  const sum = clipped.reduce((a, b) => a + b, 0)
  return { value: sum, meta }
}
