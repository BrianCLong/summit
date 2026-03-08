"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MPSCChannel = void 0;
const events_1 = require("events");
class MPSCChannel {
    queue = [];
    capacity;
    closed = false;
    consumer;
    producerNotifier = new events_1.EventEmitter();
    consumerNotifier = new events_1.EventEmitter();
    constructor(capacity) {
        this.capacity = capacity;
    }
    async send(item, timeout) {
        if (this.closed) {
            throw new Error('Channel is closed');
        }
        while (this.queue.length >= this.capacity) {
            if (timeout !== undefined) {
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Send operation timed out')), timeout));
                await Promise.race([
                    new Promise(resolve => this.producerNotifier.once('space', resolve)),
                    timeoutPromise,
                ]);
            }
            else {
                await new Promise(resolve => this.producerNotifier.once('space', resolve));
            }
        }
        this.queue.push(item);
        this.consumerNotifier.emit('item');
        return true;
    }
    async *[Symbol.asyncIterator]() {
        while (!this.closed || this.queue.length > 0) {
            while (this.queue.length === 0 && !this.closed) {
                await new Promise(resolve => this.consumerNotifier.once('item', resolve));
            }
            if (this.queue.length > 0) {
                const item = this.queue.shift();
                this.producerNotifier.emit('space');
                yield item;
            }
        }
    }
    close() {
        this.closed = true;
        this.consumerNotifier.emit('item'); // Unblock any waiting consumer
        this.producerNotifier.emit('space'); // Unblock any waiting producer
    }
}
exports.MPSCChannel = MPSCChannel;
