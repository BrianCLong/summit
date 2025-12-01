# Email Template System

Comprehensive email template system for IntelGraph with support for MJML/React Email templates, A/B testing, analytics tracking, unsubscribe management, and deliverability optimization.

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Usage Examples](#usage-examples)
- [Template Development](#template-development)
- [A/B Testing](#ab-testing)
- [Email Analytics](#email-analytics)
- [Unsubscribe Management](#unsubscribe-management)
- [Deliverability Optimization](#deliverability-optimization)
- [API Reference](#api-reference)
- [Best Practices](#best-practices)

## Features

✅ **Multi-Provider Support**: SMTP, SendGrid, AWS SES, Mailgun, Postmark
✅ **Responsive Templates**: MJML and React Email support
✅ **A/B Testing**: Built-in variant testing with statistical analysis
✅ **Email Analytics**: Open tracking, click tracking, bounce tracking
✅ **Unsubscribe Management**: One-click unsubscribe, preference center, frequency limits
✅ **Template Versioning**: Git-like versioning with rollback capability
✅ **Spam Score Checking**: Pre-send deliverability analysis
✅ **Queue Management**: BullMQ-based queue with retry logic
✅ **Rate Limiting**: Configurable sending limits
✅ **Tracking**: Open and click tracking with privacy compliance

## Quick Start

### 1. Configure the Email Service

```typescript
import { EmailService } from './email-service/EmailService.js';
import { EmailTemplateCategory } from './email-service/types.js';

const emailService = new EmailService({
  provider: {
    provider: 'smtp',
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASS!,
      },
    },
    from: {
      name: 'IntelGraph',
      email: 'noreply@intelgraph.com',
    },
  },
  queue: {
    enabled: true,
    concurrency: 5,
    retryAttempts: 3,
    retryBackoff: 'exponential',
    retryDelay: 1000,
  },
  tracking: {
    enabled: true,
    openTracking: true,
    clickTracking: true,
    trackingDomain: 'track.intelgraph.com',
  },
  deliverability: {
    spamScoreThreshold: 5.0,
    enforceAuthentication: true,
    requireUnsubscribeLink: true,
  },
  abTesting: {
    enabled: true,
    defaultTrafficPercentage: 100,
    minSampleSize: 100,
  },
});

await emailService.initialize();
```

### 2. Send a Simple Email

```typescript
await emailService.sendEmail({
  to: 'user@example.com',
  subject: 'Welcome to IntelGraph',
  text: 'Plain text version',
  html: '<h1>Welcome!</h1><p>Thanks for joining.</p>',
});
```

### 3. Send from Template

```typescript
await emailService.sendFromTemplate(
  'welcome-email',
  'user@example.com',
  {
    firstName: 'John',
    logoUrl: 'https://example.com/logo.png',
    appUrl: 'https://app.intelgraph.com',
    docsUrl: 'https://docs.intelgraph.com',
    supportEmail: 'support@intelgraph.com',
    companyName: 'IntelGraph Inc.',
    companyAddress: '123 Main St, San Francisco, CA 94105',
  },
  {
    useABTesting: true,
    userId: 'user-123',
  }
);
```

## Architecture

### Core Components

```
email-service/
├── EmailService.ts              # Main service coordinator
├── TemplateRenderer.ts          # MJML/React Email renderer
├── EmailQueue.ts                # BullMQ queue management
├── types.ts                     # Type definitions
│
├── providers/
│   ├── EmailProvider.ts         # Abstract provider interface
│   ├── SMTPProvider.ts          # SMTP implementation
│   └── [Other providers...]
│
├── templates/
│   ├── welcome.mjml             # Welcome email template
│   ├── password-reset.mjml      # Password reset
│   ├── investigation-shared.mjml
│   ├── alert-critical.mjml
│   └── weekly-digest.mjml
│
├── ab-testing/
│   └── ABTestManager.ts         # A/B test management
│
├── analytics/
│   └── EmailAnalyticsService.ts # Tracking & analytics
│
├── unsubscribe/
│   └── UnsubscribeManager.ts    # Unsubscribe handling
│
├── deliverability/
│   └── DeliverabilityChecker.ts # Spam score & validation
│
└── versioning/
    └── TemplateVersionManager.ts # Template versions
```

## Usage Examples

### Sending Transactional Emails

```typescript
// Welcome email
await emailService.sendFromTemplate(
  'welcome-email',
  'user@example.com',
  {
    firstName: 'Jane',
    // ... other variables
  }
);

// Password reset
await emailService.sendFromTemplate(
  'password-reset',
  'user@example.com',
  {
    firstName: 'Jane',
    resetUrl: 'https://app.intelgraph.com/reset?token=xxx',
    expiryHours: 24,
  }
);
```

### Sending Bulk Emails

```typescript
const messages = users.map(user => ({
  to: user.email,
  subject: 'New Feature Announcement',
  html: '<h1>Check out our new feature!</h1>',
  templateId: 'feature-announcement',
}));

const results = await emailService.sendBulk(messages, {
  batchSize: 100,
  delayBetweenBatches: 1000, // 1 second between batches
});

console.log(`Sent: ${results.filter(r => r.success).length}`);
console.log(`Failed: ${results.filter(r => !r.success).length}`);
```

### Using Scheduled Sends

```typescript
await emailService.sendEmail(
  {
    to: 'user@example.com',
    subject: 'Reminder',
    html: '<p>Your investigation is due tomorrow!</p>',
  },
  {
    scheduledFor: new Date('2025-12-01T09:00:00Z'),
  }
);
```

## Template Development

### Creating MJML Templates

1. Create a new `.mjml` file in `templates/`
2. Use MJML components for responsive design
3. Use `{{variable}}` syntax for dynamic content

```xml
<mjml>
  <mj-body>
    <mj-section>
      <mj-column>
        <mj-text>Hello {{firstName}}!</mj-text>
        <mj-button href="{{actionUrl}}">
          Click Here
        </mj-button>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
```

### Template Variables

Define variables in template metadata:

```typescript
const template: EmailTemplate = {
  id: 'welcome-email',
  name: 'Welcome Email',
  category: EmailTemplateCategory.AUTH,
  subject: 'Welcome to {{companyName}}',
  version: '1.0.0',
  variables: [
    { name: 'firstName', type: 'string', required: true },
    { name: 'logoUrl', type: 'url', required: true },
    { name: 'appUrl', type: 'url', required: false, defaultValue: 'https://app.example.com' },
  ],
  // ...
};
```

### Preview Templates

```typescript
const preview = await emailService.previewTemplate(
  'welcome-email',
  {
    firstName: 'Test User',
    logoUrl: 'https://example.com/logo.png',
    // ... other variables
  }
);

console.log(preview.subject);
console.log(preview.html);
console.log(preview.text);
```

## A/B Testing

### Creating an A/B Test

```typescript
await emailService.abTestManager.createTest({
  id: 'welcome-subject-test',
  name: 'Welcome Email Subject Line Test',
  templateId: 'welcome-email',
  active: true,
  startDate: new Date(),
  variants: [
    {
      id: 'control',
      name: 'Control',
      templateVariantId: 'welcome-email-v1',
      weight: 50,
      sent: 0,
      opened: 0,
      clicked: 0,
      converted: 0,
      bounced: 0,
    },
    {
      id: 'variant-a',
      name: 'Variant A',
      templateVariantId: 'welcome-email-v2',
      weight: 50,
      sent: 0,
      opened: 0,
      clicked: 0,
      converted: 0,
      bounced: 0,
    },
  ],
  goalMetric: 'click-rate',
  trafficPercentage: 100,
});
```

### Getting Test Results

```typescript
const results = await emailService.getABTestResults('welcome-subject-test');

console.log(`Winner: ${results.winningVariantId}`);
console.log(`Confidence: ${results.confidence}%`);
console.log(`Total Sent: ${results.totalSent}`);

results.variantResults.forEach(variant => {
  console.log(`
    Variant: ${variant.variantId}
    Open Rate: ${variant.openRate}%
    Click Rate: ${variant.clickRate}%
    Conversion Rate: ${variant.conversionRate}%
  `);
});
```

## Email Analytics

### Tracking Email Performance

```typescript
// Get analytics for a specific email
const analytics = await emailService.getAnalytics('message-id-123');

console.log(`Opened: ${analytics.opened}`);
console.log(`Clicked: ${analytics.clicked}`);
console.log(`Bounce Type: ${analytics.bounceType}`);

// Get template analytics
const templateAnalytics = await emailService.getTemplateAnalytics(
  'welcome-email',
  {
    start: new Date('2025-01-01'),
    end: new Date('2025-01-31'),
  }
);

console.log(`
  Total Sent: ${templateAnalytics.totalSent}
  Open Rate: ${templateAnalytics.openRate}%
  Click Rate: ${templateAnalytics.clickRate}%
  Bounce Rate: ${templateAnalytics.bounceRate}%
`);
```

## Unsubscribe Management

### Managing Preferences

```typescript
// Unsubscribe from all emails
await emailService.unsubscribeManager.unsubscribeAll('user@example.com');

// Unsubscribe from specific category
await emailService.unsubscribeManager.unsubscribeCategory(
  'user@example.com',
  EmailTemplateCategory.MARKETING
);

// Update frequency preferences
await emailService.updateUnsubscribePreferences('user@example.com', {
  frequency: {
    maxEmailsPerDay: 5,
    maxEmailsPerWeek: 20,
    digestEnabled: true,
    digestFrequency: 'weekly',
  },
});

// Generate preference center URL
const preferencesUrl = await emailService.unsubscribeManager.generatePreferenceCenterUrl(
  'user@example.com',
  'user-id-123'
);
```

## Deliverability Optimization

### Checking Spam Score

```typescript
const report = await emailService.checkDeliverability({
  to: 'user@example.com',
  subject: 'Your subject line',
  html: '<html>...</html>',
  text: 'Text version...',
});

console.log(`Overall Score: ${report.overallScore}/100`);
console.log(`Spam Score: ${report.spamScore.score}`);
console.log(`Passed: ${report.spamScore.passed}`);

console.log('Issues:');
report.spamScore.issues.forEach(issue => {
  console.log(`  [${issue.severity}] ${issue.message}`);
  if (issue.fix) {
    console.log(`    Fix: ${issue.fix}`);
  }
});

console.log('Recommendations:');
report.recommendations.forEach(rec => {
  console.log(`  - ${rec}`);
});
```

### Authentication Setup

Ensure SPF, DKIM, and DMARC records are configured:

```dns
; SPF Record
example.com. IN TXT "v=spf1 include:_spf.google.com ~all"

; DKIM Record
default._domainkey.example.com. IN TXT "v=DKIM1; k=rsa; p=MIGfMA0GCS..."

; DMARC Record
_dmarc.example.com. IN TXT "v=DMARC1; p=quarantine; rua=mailto:dmarc@example.com"
```

## Best Practices

### Email Content

1. **Subject Lines**
   - Keep under 50 characters
   - Avoid spam trigger words (FREE, WINNER, URGENT)
   - Personalize when possible
   - A/B test different variations

2. **HTML Content**
   - Maintain text-to-HTML ratio above 30%
   - Use responsive design (MJML handles this)
   - Include alt text for all images
   - Test across multiple email clients

3. **Compliance**
   - Always include unsubscribe link
   - Add physical mailing address (CAN-SPAM requirement)
   - Honor unsubscribe requests within 10 business days
   - Include company name and contact information

### Performance

1. **Queue Management**
   - Use queue for non-critical emails
   - Set appropriate retry strategies
   - Monitor queue metrics regularly

2. **Rate Limiting**
   - Configure based on provider limits
   - Implement exponential backoff for retries
   - Monitor bounce rates

3. **Template Optimization**
   - Keep HTML size under 102KB
   - Minimize external resources
   - Inline critical CSS
   - Optimize images

### Security

1. **Authentication**
   - Configure SPF, DKIM, DMARC
   - Use dedicated sending domain
   - Monitor authentication reports

2. **Data Privacy**
   - Anonymize tracking pixels
   - Secure unsubscribe tokens
   - Comply with GDPR/CCPA

3. **Content Security**
   - Sanitize user-generated content
   - Validate all template variables
   - Use HTTPS for all links

## API Reference

See type definitions in `types.ts` for complete API reference.

### Key Interfaces

- `EmailMessage`: Email message structure
- `EmailTemplate`: Template definition
- `EmailSendResult`: Send operation result
- `EmailAnalytics`: Analytics data
- `UnsubscribePreferences`: User preferences
- `SpamScoreResult`: Deliverability check result

## Configuration

### Environment Variables

```bash
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Redis (for queue)
REDIS_HOST=localhost
REDIS_PORT=6379

# Application
APP_URL=https://app.intelgraph.com
TRACKING_DOMAIN=track.intelgraph.com

# From Address
EMAIL_FROM_NAME=IntelGraph
EMAIL_FROM_EMAIL=noreply@intelgraph.com
```

## Testing

### Unit Tests

```typescript
import { EmailService } from './EmailService';

describe('EmailService', () => {
  it('should send email successfully', async () => {
    const service = new EmailService(config);
    await service.initialize();

    const result = await service.sendEmail({
      to: 'test@example.com',
      subject: 'Test',
      text: 'Test',
      html: '<p>Test</p>',
    });

    expect(result.success).toBe(true);
  });
});
```

### Preview Testing

Use the preview endpoint to test templates:

```typescript
const preview = await emailService.previewTemplate('template-id', variables);
// Inspect preview.html in browser
```

## Support

For issues and questions:
- GitHub Issues: https://github.com/BrianCLong/summit/issues
- Email: support@intelgraph.com
- Documentation: https://docs.intelgraph.com/email-system

## License

MIT
