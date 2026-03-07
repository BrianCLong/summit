import { WorldSpec } from './WorldSpec.js';

export class TickEngine {
  tick: number = 0;
  maxTicks: number;

  constructor(spec: WorldSpec) {
    this.maxTicks = spec.ticks;
  }

  step() {
    if (this.tick < this.maxTicks) {
      this.tick++;
      return true;
    }
    return false;
  }
}
