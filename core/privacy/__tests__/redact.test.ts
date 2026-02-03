import { redact } from '../redact';
import { RedactionClass } from '../classification';

describe('Redaction Utility', () => {
  test('should redact emails when PII class is requested', () => {
    const content = "Contact me at alice@example.com or bob@work.co";
    const redacted = redact(content, [RedactionClass.PII]);
    expect(redacted).toBe("Contact me at [EMAIL_REDACTED] or [EMAIL_REDACTED]");
  });

  test('should redact dollar amounts when FINANCIAL class is requested', () => {
    const content = "The cost is $100.50 and the refund is $50";
    const redacted = redact(content, [RedactionClass.FINANCIAL]);
    expect(redacted).toBe("The cost is [AMOUNT_REDACTED] and the refund is [AMOUNT_REDACTED]");
  });

  test('should redact medical terms when PHI class is requested', () => {
    const content = "The patient was prescribed lisinopril for high blood pressure";
    const redacted = redact(content, [RedactionClass.PHI]);
    expect(redacted).toContain("[HEALTH_INFO_REDACTED]");
    expect(redacted).not.toContain("lisinopril");
  });

  test('should NOT redact when no classes are requested', () => {
    const content = "Contact alice@example.com";
    const redacted = redact(content, []);
    expect(redacted).toBe(content);
  });
});
