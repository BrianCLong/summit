"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HardwareEmulator = void 0;
/**
 * Emulates a hardware diode using an isolated event emitter or queue.
 * In a real deployment, this would be a physically separate network interface.
 */
class HardwareEmulator {
    highToLowQueue = [];
    lowToHighQueue = [];
    // Diode allows one-way flow only per channel.
    // We simulate the "Air Gap" by ensuring no direct memory reference is passed (deep clone).
    async sendHighToLow(packet) {
        // Simulate serialization/deserialization across the gap
        const safePacket = JSON.parse(JSON.stringify(packet));
        this.highToLowQueue.push(safePacket);
    }
    async sendLowToHigh(packet) {
        const safePacket = JSON.parse(JSON.stringify(packet));
        this.lowToHighQueue.push(safePacket);
    }
    // In a real system, a separate process would poll these.
    readHighToLow() {
        return this.highToLowQueue.shift() || null;
    }
    readLowToHigh() {
        return this.lowToHighQueue.shift() || null;
    }
}
exports.HardwareEmulator = HardwareEmulator;
