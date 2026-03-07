export interface BBoxWgs84 { west: number; south: number; east: number; north: number; }

export function tileToBBoxWgs84(z: number, x: number, y: number): BBoxWgs84 {
  const n = Math.pow(2, z);
  const lon1 = (x / n) * 360 - 180;
  const lon2 = ((x + 1) / n) * 360 - 180;

  const lat1 = rad2deg(Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))));
  const lat2 = rad2deg(Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 1)) / n))));

  return {
    west: lon1,
    south: lat2,
    east: lon2,
    north: lat1,
  };
}

function rad2deg(r: number) { return (r * 180) / Math.PI; }
