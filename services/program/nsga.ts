export type Plan = { id: string; actions: number[] };
export type Fitness = { okr: number; cost: number; carbon: number };
export function dominates(a: Fitness, b: Fitness) {
  return (
    a.okr >= b.okr &&
    a.cost <= b.cost &&
    a.carbon >= b.carbon &&
    (a.okr > b.okr || a.cost < b.cost || a.carbon > b.carbon)
  );
}
export function paretoFront(F: Fitness[]) {
  return F.map((fa, i) => ({
    i,
    dom: F.filter((fb, j) => i !== j && dominates(fb, fa)).length,
  }))
    .filter((x) => x.dom === 0)
    .map((x) => x.i);
}
