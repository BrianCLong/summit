export class BackpressureGate {
  private inFlight = 0;
  constructor(private maxInFlight = 100, private shedPct = 0.1) {}

  canAccept() {
    return this.inFlight < this.maxInFlight;
  }

  start() {
    this.inFlight++;
  }

  done() {
    this.inFlight = Math.max(0, this.inFlight - 1);
  }

  shouldShed() {
    return this.inFlight / this.maxInFlight > 1 - this.shedPct;
  }
}
