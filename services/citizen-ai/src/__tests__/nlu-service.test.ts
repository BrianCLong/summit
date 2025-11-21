import { NLUService, nluService } from '../nlu-service';

describe('NLUService', () => {
  let nlu: NLUService;

  beforeEach(() => {
    nlu = new NLUService();
  });

  describe('detectLanguage', () => {
    it('should detect English', () => {
      const result = nlu.detectLanguage('Hello, how are you today?');
      expect(result.detected).toBe('en');
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.isRTL).toBe(false);
    });

    it('should detect Estonian', () => {
      const result = nlu.detectLanguage('Tere, kuidas sul läheb täna?');
      expect(result.detected).toBe('et');
    });

    it('should detect Russian', () => {
      const result = nlu.detectLanguage('Привет, как дела сегодня?');
      expect(result.detected).toBe('ru');
    });

    it('should detect Arabic and mark as RTL', () => {
      const result = nlu.detectLanguage('مرحبا كيف حالك');
      expect(result.detected).toBe('ar');
      expect(result.isRTL).toBe(true);
    });

    it('should detect Chinese', () => {
      const result = nlu.detectLanguage('你好，今天怎么样？');
      expect(result.detected).toBe('zh');
    });

    it('should return alternatives', () => {
      const result = nlu.detectLanguage('The weather is good today');
      expect(Array.isArray(result.alternatives)).toBe(true);
    });
  });

  describe('extractEntities', () => {
    it('should extract email addresses', () => {
      const entities = nlu.extractEntities('Contact me at test@example.com', 'en');
      const email = entities.find((e) => e.type === 'email');
      expect(email).toBeDefined();
      expect(email?.value).toBe('test@example.com');
    });

    it('should extract Estonian ID codes', () => {
      const entities = nlu.extractEntities('My ID is 38001010001', 'et');
      const id = entities.find((e) => e.type === 'estonian_id');
      expect(id).toBeDefined();
      expect(id?.value).toBe('38001010001');
    });

    it('should extract phone numbers', () => {
      const entities = nlu.extractEntities('Call me at +372 5123 4567', 'en');
      const phone = entities.find((e) => e.type === 'phone');
      expect(phone).toBeDefined();
    });

    it('should extract dates', () => {
      const entities = nlu.extractEntities('Meeting on 15.01.2024', 'en');
      const date = entities.find((e) => e.type === 'date');
      expect(date).toBeDefined();
      expect(date?.value).toBe('15.01.2024');
    });

    it('should extract company registration codes', () => {
      const entities = nlu.extractEntities('Company reg: 12345678', 'et');
      const reg = entities.find((e) => e.type === 'registration_code');
      expect(reg).toBeDefined();
    });
  });

  describe('classifyIntent', () => {
    it('should classify status query', () => {
      const intent = nlu.classifyIntent('What is the status of my application?', 'en');
      expect(intent.primary).toBe('query.status');
      expect(intent.confidence).toBeGreaterThan(0.5);
    });

    it('should classify service request', () => {
      const intent = nlu.classifyIntent('I want to apply for a visa', 'en');
      expect(intent.primary).toBe('request.service');
    });

    it('should classify appointment booking', () => {
      const intent = nlu.classifyIntent('Can I schedule an appointment?', 'en');
      expect(intent.primary).toBe('appointment.book');
    });

    it('should classify document request', () => {
      const intent = nlu.classifyIntent('I need a certificate', 'en');
      expect(intent.primary).toBe('document.request');
    });

    it('should return general inquiry for unknown', () => {
      const intent = nlu.classifyIntent('xyz abc 123', 'en');
      expect(intent.primary).toBe('general.inquiry');
    });
  });

  describe('analyzeSentiment', () => {
    it('should detect positive sentiment', () => {
      const result = nlu.analyzeSentiment('Thank you so much, this is great!', 'en');
      expect(result.label).toBe('positive');
      expect(result.score).toBeGreaterThan(0);
    });

    it('should detect negative sentiment', () => {
      const result = nlu.analyzeSentiment('This is terrible, I am very frustrated', 'en');
      expect(result.label).toBe('negative');
      expect(result.score).toBeLessThan(0);
    });

    it('should detect neutral sentiment', () => {
      const result = nlu.analyzeSentiment('The office is located on Main Street', 'en');
      expect(result.label).toBe('neutral');
    });
  });

  describe('assessUrgency', () => {
    it('should detect critical urgency', () => {
      const result = nlu.assessUrgency('This is an emergency, I need help immediately!');
      expect(result).toBe('critical');
    });

    it('should detect high urgency', () => {
      const result = nlu.assessUrgency('This is important and needs attention quickly');
      expect(result).toBe('high');
    });

    it('should detect medium urgency', () => {
      const result = nlu.assessUrgency('I need some information please');
      expect(result).toBe('medium');
    });

    it('should default to low urgency', () => {
      const result = nlu.assessUrgency('Just a general question');
      expect(result).toBe('low');
    });
  });

  describe('analyze', () => {
    it('should perform comprehensive analysis', async () => {
      const result = await nlu.analyze(
        'Hello, I urgently need to apply for e-residency. Contact me at test@example.com'
      );

      expect(result.language.detected).toBe('en');
      expect(result.entities.length).toBeGreaterThan(0);
      expect(result.intent.primary).toBeDefined();
      expect(result.urgency).toBe('critical');
    });
  });
});

describe('nluService singleton', () => {
  it('should be defined', () => {
    expect(nluService).toBeDefined();
  });
});
