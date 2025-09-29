export function chooseArm(task: string, model: string, state: { champion: string; challenger?: string; split: number }) {
  const r = Math.random();
  return state.challenger && r < state.split ? state.challenger : state.champion;
}
