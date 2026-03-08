"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HashChain = void 0;
const node_crypto_1 = require("node:crypto");
const stable_json_js_1 = require("./stable_json.js");
class HashChain {
    events = [];
    constructor(initialEvents = []) {
        this.events = initialEvents;
    }
    get length() {
        return this.events.length;
    }
    get allEvents() {
        return this.events;
    }
    get lastHash() {
        return this.events.length > 0
            ? this.events[this.events.length - 1].hash
            : '0000000000000000000000000000000000000000000000000000000000000000'; // Genesis hash (32 bytes hex)
    }
    /**
     * Add a new event to the chain.
     * @param data The event data.
     * @returns The created event.
     */
    addEvent(data) {
        const prev_hash = this.lastHash;
        const index = this.events.length;
        // Construct the payload to hash.
        // We include index and prev_hash to bind position and history.
        const payload = {
            index,
            prev_hash,
            data
        };
        const hash = (0, node_crypto_1.createHash)('sha256').update((0, stable_json_js_1.stableJson)(payload)).digest('hex');
        const event = {
            index,
            prev_hash,
            data,
            hash
        };
        this.events.push(event);
        return event;
    }
    /**
     * Verify the integrity of the chain.
     * @returns True if valid, false otherwise.
     */
    verify() {
        if (this.events.length === 0)
            return true;
        let expectedPrevHash = '0000000000000000000000000000000000000000000000000000000000000000';
        for (let i = 0; i < this.events.length; i++) {
            const event = this.events[i];
            // Check index
            if (event.index !== i)
                return false;
            // Check prev_hash linking
            if (event.prev_hash !== expectedPrevHash)
                return false;
            // Check hash integrity
            const payload = {
                index: event.index,
                prev_hash: event.prev_hash,
                data: event.data
            };
            const calculatedHash = (0, node_crypto_1.createHash)('sha256').update((0, stable_json_js_1.stableJson)(payload)).digest('hex');
            if (calculatedHash !== event.hash)
                return false;
            expectedPrevHash = event.hash;
        }
        return true;
    }
}
exports.HashChain = HashChain;
