
import { MPSCChannel } from '../../../src/lib/streaming/channel-manager';

describe('MPSCChannel', () => {
  it('should send and receive items', async () => {
    const channel = new MPSCChannel<number>(5);
    await channel.send(1);
    await channel.send(2);
    channel.close();

    const received = [];
    for await (const item of channel) {
      received.push(item);
    }

    expect(received).toEqual([1, 2]);
  });

  it('should block sender when channel is full', async () => {
    const channel = new MPSCChannel<number>(1);
    await channel.send(1);

    let sent = false;
    channel.send(2).then(() => {
      sent = true;
    });

    await new Promise(resolve => setTimeout(resolve, 10)); // give promise a chance to resolve
    expect(sent).toBe(false);

    // Consume an item to make space
    const iterator = channel[Symbol.asyncIterator]();
    await iterator.next();

    await new Promise(resolve => setTimeout(resolve, 10)); // allow the blocked promise to resolve
    expect(sent).toBe(true);
  });

  it('should handle send timeout', async () => {
    const channel = new MPSCChannel<number>(1);
    await channel.send(1);

    await expect(channel.send(2, 10)).rejects.toThrow('Send operation timed out');
  });

  it('should unblock consumer on close', async () => {
    const channel = new MPSCChannel<number>(1);
    let receivedItem: number | undefined;

    const consumePromise = (async () => {
      for await (const item of channel) {
        receivedItem = item;
      }
    })();

    channel.close();
    await consumePromise;

    expect(receivedItem).toBeUndefined();
  });
});
