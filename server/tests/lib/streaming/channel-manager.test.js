"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const channel_manager_1 = require("../../../src/lib/streaming/channel-manager");
(0, globals_1.describe)('MPSCChannel', () => {
    (0, globals_1.it)('should send and receive items', async () => {
        const channel = new channel_manager_1.MPSCChannel(5);
        await channel.send(1);
        await channel.send(2);
        channel.close();
        const received = [];
        for await (const item of channel) {
            received.push(item);
        }
        (0, globals_1.expect)(received).toEqual([1, 2]);
    });
    (0, globals_1.it)('should block sender when channel is full', async () => {
        const channel = new channel_manager_1.MPSCChannel(1);
        await channel.send(1);
        let sent = false;
        channel.send(2).then(() => {
            sent = true;
        });
        await new Promise(resolve => setTimeout(resolve, 10)); // give promise a chance to resolve
        (0, globals_1.expect)(sent).toBe(false);
        // Consume an item to make space
        const iterator = channel[Symbol.asyncIterator]();
        await iterator.next();
        await new Promise(resolve => setTimeout(resolve, 10)); // allow the blocked promise to resolve
        (0, globals_1.expect)(sent).toBe(true);
    });
    (0, globals_1.it)('should handle send timeout', async () => {
        const channel = new channel_manager_1.MPSCChannel(1);
        await channel.send(1);
        await (0, globals_1.expect)(channel.send(2, 10)).rejects.toThrow('Send operation timed out');
    });
    (0, globals_1.it)('should unblock consumer on close', async () => {
        const channel = new channel_manager_1.MPSCChannel(1);
        let receivedItem;
        const consumePromise = (async () => {
            for await (const item of channel) {
                receivedItem = item;
            }
        })();
        channel.close();
        await consumePromise;
        (0, globals_1.expect)(receivedItem).toBeUndefined();
    });
});
