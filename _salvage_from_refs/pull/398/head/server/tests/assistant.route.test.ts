import request from 'supertest';
import axios from 'axios';
import { createApp } from '../src/appFactory';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('POST /api/assistant/chat', () => {
  it('returns assistant response', async () => {
    mockedAxios.post.mockResolvedValue({
      data: { choices: [{ message: { content: 'hello' } }] }
    });

    const app = createApp({ lightweight: true });
    const res = await request(app)
      .post('/api/assistant/chat')
      .send({ message: 'hi', context: { workspace: 'w' } });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('reply', 'hello');
  });

  it('validates request body', async () => {
    const app = createApp({ lightweight: true });
    const res = await request(app).post('/api/assistant/chat').send({});
    expect(res.status).toBe(400);
  });
});
