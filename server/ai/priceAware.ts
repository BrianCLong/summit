export function effectiveUSD(
  base: number,
  tokK: number,
  gpuMin: number,
  ptok: number,
  pgpu: number,
) {
  return base + tokK * ptok + gpuMin * pgpu;
}
