export class Windower {
  constructor(private windowMs = 60000) {}
  bucket<T>(events: T[]): T[] {
    return events; // placeholder for real windowing logic
  }
}
