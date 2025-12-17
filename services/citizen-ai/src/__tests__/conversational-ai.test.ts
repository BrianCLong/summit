import { ConversationalAI, conversationalAI } from '../conversational-ai';

describe('ConversationalAI', () => {
  let ai: ConversationalAI;

  beforeEach(() => {
    ai = new ConversationalAI();
  });

  describe('processMessage', () => {
    it('should respond to greetings in English', async () => {
      const response = await ai.processMessage('test-session', 'Hello', 'en');
      expect(response.text).toContain('Welcome');
      expect(response.language).toBe('en');
      expect(response.suggestedActions).toBeDefined();
    });

    it('should respond to greetings in Estonian', async () => {
      const response = await ai.processMessage('test-session', 'Tere', 'et');
      expect(response.text).toContain('Tere tulemast');
      expect(response.language).toBe('et');
    });

    it('should detect e-residency intent', async () => {
      const response = await ai.processMessage(
        'test-session',
        'I want to apply for e-residency',
        'en'
      );
      expect(response.intent?.name).toBe('e-residency.apply');
      expect(response.suggestedActions?.length).toBeGreaterThan(0);
    });

    it('should detect tax intent', async () => {
      const response = await ai.processMessage(
        'test-session',
        'How do I file my tax return?',
        'en'
      );
      expect(response.intent?.name).toBe('tax.filing');
    });

    it('should maintain conversation history', async () => {
      await ai.processMessage('history-test', 'Hello', 'en');
      await ai.processMessage('history-test', 'I need help with taxes', 'en');

      const history = ai.getHistory('history-test');
      expect(history.length).toBe(4); // 2 user + 2 assistant messages
    });
  });

  describe('session management', () => {
    it('should create new session', async () => {
      await ai.processMessage('new-session', 'Hi', 'en');
      const history = ai.getHistory('new-session');
      expect(history.length).toBe(2);
    });

    it('should clear session', async () => {
      await ai.processMessage('clear-test', 'Hi', 'en');
      ai.clearSession('clear-test');
      const history = ai.getHistory('clear-test');
      expect(history.length).toBe(0);
    });

    it('should set preferred language', async () => {
      await ai.processMessage('lang-test', 'Hi', 'en');
      ai.setPreferredLanguage('lang-test', 'et');
      const response = await ai.processMessage('lang-test', 'Help', 'en');
      expect(response.language).toBe('et');
    });
  });

  describe('getServiceCategories', () => {
    it('should return all service categories', () => {
      const services = ai.getServiceCategories();
      expect(services.length).toBeGreaterThan(5);
      expect(services.some((s) => s.id === 'e-residency')).toBe(true);
      expect(services.some((s) => s.id === 'immigration')).toBe(true);
      expect(services.some((s) => s.id === 'taxation')).toBe(true);
    });
  });
});

describe('conversationalAI singleton', () => {
  it('should be defined', () => {
    expect(conversationalAI).toBeDefined();
  });
});
