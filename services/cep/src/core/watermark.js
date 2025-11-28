export class Watermark {
  constructor({ allowedLatenessMs }) {
    this.allowedLatenessMs = allowedLatenessMs;
    this.maxTimestamp = 0;
  }

  observe(timestamp) {
    if (timestamp > this.maxTimestamp) {
      this.maxTimestamp = timestamp;
    }
    return this.watermark();
  }

  watermark() {
    return this.maxTimestamp - this.allowedLatenessMs;
  }

  isLate(timestamp) {
    return timestamp < this.watermark();
  }
}
