export function effectiveCost(
  baseUSD: number,
  usage: { gpuMin: number; tokens: number },
  price: { gpu: number; tok: number },
) {
  return baseUSD + usage.gpuMin * price.gpu + (usage.tokens / 1000) * price.tok;
}
