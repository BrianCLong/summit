function mutateOneRecord(base: any) {
  const clone = JSON.parse(JSON.stringify(base));
  if (Array.isArray(clone.records) && clone.records.length > 0) {
    clone.records[0] = { ...clone.records[0], fuzz: true };
  }
  return clone;
}

function expectedDpNoiseBound(epsilon: number) {
  return epsilon * 10;
}

export async function differencingFuzz(run: (dataset: any) => Promise<number>, base: any) {
  const neighbor = mutateOneRecord(base);
  const r1 = await run(base);
  const r2 = await run(neighbor);
  if (Math.abs(r1 - r2) > expectedDpNoiseBound(base.epsilon)) {
    throw new Error('differencing_leak_detected');
  }
  return { ok: true };
}
