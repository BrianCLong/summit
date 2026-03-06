import services from './__mocks__/services-api';

describe('Integration API placeholder', () => {
  it('returns healthy status', async () => {
    const response = await services.get('/health');
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.method).toBe('GET');
  });

  it('accepts POST payloads', async () => {
    const response = await services.post('/graphql', { query: '{ ok }' });
    const data = await response.json();
    expect(response.status).toBe(202);
    expect(data.method).toBe('POST');
  });
});
