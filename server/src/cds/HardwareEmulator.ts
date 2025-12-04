/**
 * Emulates a hardware diode using an isolated event emitter or queue.
 * In a real deployment, this would be a physically separate network interface.
 */
export class HardwareEmulator {
  private static instance: HardwareEmulator;
  private highToLowQueue: any[] = [];
  private lowToHighQueue: any[] = [];

  // Diode allows one-way flow only per channel.
  // We simulate the "Air Gap" by ensuring no direct memory reference is passed (deep clone).

  async sendHighToLow(packet: any): Promise<void> {
    // Simulate serialization/deserialization across the gap
    const safePacket = JSON.parse(JSON.stringify(packet));
    this.highToLowQueue.push(safePacket);
  }

  async sendLowToHigh(packet: any): Promise<void> {
    const safePacket = JSON.parse(JSON.stringify(packet));
    this.lowToHighQueue.push(safePacket);
  }

  // In a real system, a separate process would poll these.
  // Here we just provide a method to pop from the "other side".

  readHighToLow(): any | null {
    return this.highToLowQueue.shift() || null;
  }

  readLowToHigh(): any | null {
    return this.lowToHighQueue.shift() || null;
  }
}
