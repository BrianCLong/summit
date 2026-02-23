describe('User Contract', () => {
  it('should have required fields', () => {
    const providerResponse = {
      id: '123',
      name: 'Alice',
      email: 'alice@example.com',
      extraField: 'ignored'
    };

    expect(providerResponse).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        email: expect.stringMatching(/@/)
    });
  });
});
