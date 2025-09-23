export class StreamingDpAggregator {
  constructor(private accountant: any, private kMin = 25, private windowMs = 60000) {}

  async processBatch(streamKey: string, values: number[]) {
    if (values.length < this.kMin) throw new Error('k_anonymity_violated');
    const epsilon = 0.1;
    await this.accountant.charge(`dp:stream:${streamKey}`, epsilon);
    const clip = 1000;
    const clipped = values.map(v => Math.max(Math.min(v, clip), -clip));
    const sum = clipped.reduce((a, b) => a + b, 0);
    const scale = clip / epsilon;
    const noisy = sum + (Math.random() - 0.5) * 2 * scale;
    return { value: noisy, meta: { epsilon, k: values.length, clip, windowMs: this.windowMs } };
  }
}
