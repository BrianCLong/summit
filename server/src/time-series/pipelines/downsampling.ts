import { TimeSeriesRow } from '../types.js';

export function downsampleAverage(rows: TimeSeriesRow[], bucketSize: number): TimeSeriesRow[] {
  if (!rows.length || bucketSize <= 1) return rows;
  const buckets: TimeSeriesRow[] = [];

  for (let i = 0; i < rows.length; i += bucketSize) {
    const chunk = rows.slice(i, i + bucketSize);
    const values = averageFields(chunk);
    buckets.push({ timestamp: chunk[chunk.length - 1].timestamp, values });
  }

  return buckets;
}

export function largestTriangleThreeBuckets(rows: TimeSeriesRow[], threshold: number): TimeSeriesRow[] {
  if (threshold >= rows.length || threshold <= 2) {
    return rows;
  }

  const sampled: TimeSeriesRow[] = [rows[0]];
  let bucketSize = (rows.length - 2) / (threshold - 2);
  let a = 0;

  for (let i = 0; i < threshold - 2; i += 1) {
    const rangeStart = Math.floor((i + 1) * bucketSize) + 1;
    const rangeEnd = Math.floor((i + 2) * bucketSize) + 1;
    const range = rows.slice(rangeStart, rangeEnd);
    const nextRangeStart = Math.floor((i + 2) * bucketSize) + 1;
    const nextRangeEnd = Math.floor((i + 3) * bucketSize) + 1;
    const nextRange = rows.slice(nextRangeStart, nextRangeEnd);

    const avgNext = averagePoint(nextRange);
    let maxArea = -1;
    let maxAreaPoint = rows[a];

    for (const point of range) {
      const area = triangleArea(rows[a], point, avgNext);
      if (area > maxArea) {
        maxArea = area;
        maxAreaPoint = point;
      }
    }

    sampled.push(maxAreaPoint);
    a = rows.indexOf(maxAreaPoint);
  }

  sampled.push(rows[rows.length - 1]);
  return sampled;
}

function averageFields(rows: TimeSeriesRow[]) {
  const values: Record<string, number> = {};
  const counts: Record<string, number> = {};

  rows.forEach((row) => {
    Object.entries(row.values).forEach(([field, value]) => {
      values[field] = (values[field] ?? 0) + value;
      counts[field] = (counts[field] ?? 0) + 1;
    });
  });

  Object.keys(values).forEach((field) => {
    values[field] = values[field] / counts[field];
  });

  return values;
}

function triangleArea(a: TimeSeriesRow, b: TimeSeriesRow, c: TimeSeriesRow) {
  const x1 = a.timestamp.getTime();
  const y1 = sumValues(a);
  const x2 = b.timestamp.getTime();
  const y2 = sumValues(b);
  const x3 = c.timestamp.getTime();
  const y3 = sumValues(c);
  return Math.abs((x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2)) / 2);
}

function sumValues(row: TimeSeriesRow) {
  return Object.values(row.values).reduce((acc, value) => acc + value, 0);
}

function averagePoint(rows: TimeSeriesRow[]) {
  if (!rows.length) {
    return { timestamp: new Date(0), values: {} } satisfies TimeSeriesRow;
  }
  const timestamp = new Date(
    rows.reduce((acc, row) => acc + row.timestamp.getTime(), 0) / Math.max(1, rows.length),
  );
  return { timestamp, values: averageFields(rows) };
}
