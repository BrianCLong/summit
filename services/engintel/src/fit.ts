type Dev = {
  user: string;
  areas: string[];
  p95ReviewHrs: number;
  defectRate: number;
};
type Chunk = { area: string; estHrs: number };
export function bestReviewer(chunk: Chunk, devs: Dev[]) {
  return devs
    .filter((d) => d.areas.includes(chunk.area))
    .sort(
      (a, b) => a.p95ReviewHrs - b.p95ReviewHrs || a.defectRate - b.defectRate,
    )[0]?.user;
}
