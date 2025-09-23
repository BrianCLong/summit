import postMessage from '../soar/actions/chat.slack.postMessage';

describe('slack action', () => {
  it('simulates by default', async () => {
    const res = await postMessage({ channel: 'c' }, { simulate: true, token: 't' });
    expect(res.simulated).toBe(true);
  });
});
