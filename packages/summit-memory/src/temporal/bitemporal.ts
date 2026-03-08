import type { WriteSet } from "../types.js";

export function compareEventTime(a: WriteSet, b: WriteSet): number {
  return Date.parse(a.eventTime) - Date.parse(b.eventTime);
}

export function compareIngestTime(a: WriteSet, b: WriteSet): number {
  return Date.parse(a.ingestTime) - Date.parse(b.ingestTime);
}

export function isVisibleAtEventTime(writeSet: WriteSet, asOf: string): boolean {
  return Date.parse(writeSet.eventTime) <= Date.parse(asOf);
}

export function isVisibleAtIngestTime(writeSet: WriteSet, asOf: string): boolean {
  return Date.parse(writeSet.ingestTime) <= Date.parse(asOf);
}
