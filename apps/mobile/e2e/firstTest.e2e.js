describe('Mobile App', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should show login screen', async () => {
    await expect(element(by.id('login-screen'))).toBeVisible();
  });

  it('should show email input', async () => {
    await expect(element(by.id('email-input'))).toBeVisible();
  });

  it('should show password input', async () => {
    await expect(element(by.id('password-input'))).toBeVisible();
  });

  it('should allow typing in email', async () => {
    await element(by.id('email-input')).typeText('test@example.com');
    await expect(element(by.id('email-input'))).toHaveText('test@example.com');
  });
});
