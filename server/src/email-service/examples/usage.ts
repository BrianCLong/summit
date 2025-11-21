/**
 * Email System Usage Examples
 *
 * Demonstrates how to use the email template system in various scenarios
 */

import { EmailService } from '../EmailService.js';
import { EmailTemplateCategory } from '../types.js';

// Initialize Email Service
const emailService = new EmailService({
  provider: {
    provider: 'smtp',
    smtp: {
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587'),
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

// Example 1: Send Welcome Email
export async function sendWelcomeEmail(userEmail: string, userName: string) {
  await emailService.initialize();

  const result = await emailService.sendFromTemplate(
    'welcome-email',
    userEmail,
    {
      firstName: userName,
      logoUrl: 'https://intelgraph.com/logo.png',
      appUrl: 'https://app.intelgraph.com',
      docsUrl: 'https://docs.intelgraph.com',
      supportEmail: 'support@intelgraph.com',
      companyName: 'IntelGraph Inc.',
      companyAddress: '123 Main Street, San Francisco, CA 94105',
      unsubscribeUrl: '', // Auto-generated
      preferencesUrl: '', // Auto-generated
    },
    {
      useABTesting: true, // Automatically uses A/B test if configured
      userId: userEmail,
    }
  );

  if (result.success) {
    console.log(`Welcome email sent to ${userEmail}`);
  } else {
    console.error(`Failed to send welcome email: ${result.error?.message}`);
  }

  return result;
}

// Example 2: Send Password Reset Email
export async function sendPasswordReset(userEmail: string, userName: string, resetToken: string) {
  const resetUrl = `https://app.intelgraph.com/reset-password?token=${resetToken}`;

  const result = await emailService.sendFromTemplate(
    'password-reset',
    userEmail,
    {
      firstName: userName,
      resetUrl,
      expiryHours: 24,
      logoUrl: 'https://intelgraph.com/logo.png',
      companyName: 'IntelGraph Inc.',
      companyAddress: '123 Main Street, San Francisco, CA 94105',
    },
    {
      skipQueue: true, // Send immediately (high priority)
    }
  );

  return result;
}

// Example 3: Send Investigation Shared Notification
export async function notifyInvestigationShared(params: {
  recipientEmail: string;
  recipientName: string;
  sharedByName: string;
  investigationName: string;
  investigationDescription: string;
  investigationId: string;
  accessLevel: string;
  entityCount: number;
  relationshipCount: number;
  message?: string;
}) {
  const result = await emailService.sendFromTemplate(
    'investigation-shared',
    params.recipientEmail,
    {
      recipientName: params.recipientName,
      sharedBy: params.sharedByName,
      investigationName: params.investigationName,
      investigationDescription: params.investigationDescription,
      accessLevel: params.accessLevel,
      entityCount: params.entityCount.toString(),
      relationshipCount: params.relationshipCount.toString(),
      message: params.message || 'No message provided.',
      investigationUrl: `https://app.intelgraph.com/investigations/${params.investigationId}`,
      logoUrl: 'https://intelgraph.com/logo.png',
      unsubscribeUrl: '', // Auto-generated
      preferencesUrl: '', // Auto-generated
      companyName: 'IntelGraph Inc.',
      companyAddress: '123 Main Street, San Francisco, CA 94105',
    }
  );

  return result;
}

// Example 4: Send Critical Alert
export async function sendCriticalAlert(params: {
  recipientEmail: string;
  alertTitle: string;
  alertMessage: string;
  alertId: string;
  severity: string;
  environment: string;
  alertType: string;
  source: string;
  affectedService: string;
  recommendedActions: string;
}) {
  const result = await emailService.sendFromTemplate(
    'alert-critical',
    params.recipientEmail,
    {
      alertTitle: params.alertTitle,
      severity: params.severity,
      triggeredAt: new Date().toISOString(),
      environment: params.environment,
      alertMessage: params.alertMessage,
      alertId: params.alertId,
      alertType: params.alertType,
      source: params.source,
      affectedService: params.affectedService,
      recommendedActions: params.recommendedActions,
      alertUrl: `https://app.intelgraph.com/alerts/${params.alertId}`,
      preferencesUrl: '', // Auto-generated
      companyName: 'IntelGraph Inc.',
      companyAddress: '123 Main Street, San Francisco, CA 94105',
    },
    {
      skipQueue: true, // Critical alerts send immediately
    }
  );

  return result;
}

// Example 5: Send Weekly Digest
export async function sendWeeklyDigest(params: {
  recipientEmail: string;
  firstName: string;
  weekStart: string;
  weekEnd: string;
  newEntities: number;
  newRelationships: number;
  newInsights: number;
  investigations: Array<{
    name: string;
    updatesCount: number;
    collaborators: number;
    url: string;
  }>;
  insights: string[];
  upcomingDeadlines: string;
}) {
  const result = await emailService.sendFromTemplate(
    'weekly-digest',
    params.recipientEmail,
    {
      firstName: params.firstName,
      weekStart: params.weekStart,
      weekEnd: params.weekEnd,
      newEntities: params.newEntities.toString(),
      newRelationships: params.newRelationships.toString(),
      newInsights: params.newInsights.toString(),
      // First investigation (template supports multiple)
      'investigation1.name': params.investigations[0]?.name || 'N/A',
      'investigation1.updatesCount': params.investigations[0]?.updatesCount?.toString() || '0',
      'investigation1.collaborators': params.investigations[0]?.collaborators?.toString() || '0',
      'investigation1.url': params.investigations[0]?.url || '#',
      // Insights
      insight1: params.insights[0] || 'No insights this week',
      insight2: params.insights[1] || '',
      insight3: params.insights[2] || '',
      upcomingDeadlines: params.upcomingDeadlines || 'None',
      dashboardUrl: 'https://app.intelgraph.com/dashboard',
      logoUrl: 'https://intelgraph.com/logo.png',
      unsubscribeUrl: '', // Auto-generated
      preferencesUrl: '', // Auto-generated
      companyName: 'IntelGraph Inc.',
      companyAddress: '123 Main Street, San Francisco, CA 94105',
    }
  );

  return result;
}

// Example 6: Send Bulk Campaign with A/B Testing
export async function sendCampaignEmail(recipients: string[]) {
  // Create A/B test first
  await emailService.abTestManager.createTest({
    id: 'campaign-2025-q1',
    name: 'Q1 Feature Announcement',
    templateId: 'feature-announcement',
    active: true,
    startDate: new Date(),
    variants: [
      {
        id: 'control',
        name: 'Control - Standard Subject',
        templateVariantId: 'feature-announcement-v1',
        weight: 50,
        sent: 0,
        opened: 0,
        clicked: 0,
        converted: 0,
        bounced: 0,
      },
      {
        id: 'variant-a',
        name: 'Variant A - Question Subject',
        templateVariantId: 'feature-announcement-v2',
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

  // Send to all recipients with A/B testing
  const messages = recipients.map((email) => ({
    to: email,
    subject: '', // Will be set by template
    text: '',
    html: '',
    templateId: 'feature-announcement',
    metadata: {
      campaignId: 'campaign-2025-q1',
    },
  }));

  const results = await emailService.sendBulk(messages, {
    batchSize: 100,
    delayBetweenBatches: 1000,
  });

  console.log(`Campaign sent: ${results.filter((r) => r.success).length} successful, ${results.filter((r) => !r.success).length} failed`);

  return results;
}

// Example 7: Check Email Deliverability Before Sending
export async function checkAndSendEmail(email: string, subject: string, html: string) {
  // Check deliverability first
  const deliveryReport = await emailService.checkDeliverability({
    to: email,
    subject,
    html,
    text: '', // Will be generated
  });

  console.log(`Deliverability Score: ${deliveryReport.overallScore}/100`);
  console.log(`Spam Score: ${deliveryReport.spamScore.score}`);

  if (!deliveryReport.spamScore.passed) {
    console.error('Email failed spam check:');
    deliveryReport.spamScore.issues.forEach((issue) => {
      console.error(`  [${issue.severity}] ${issue.message}`);
      if (issue.fix) {
        console.error(`    Fix: ${issue.fix}`);
      }
    });
    return { success: false, error: new Error('Failed deliverability check') };
  }

  // Send if checks passed
  return await emailService.sendEmail({
    to: email,
    subject,
    html,
    text: '', // Will be generated
  });
}

// Example 8: Preview Template Before Sending
export async function previewEmailTemplate(templateId: string, variables: Record<string, any>) {
  const preview = await emailService.previewTemplate(templateId, variables);

  console.log('Subject:', preview.subject);
  console.log('Preview Text:', preview.previewText);
  console.log('HTML Length:', preview.html.length);
  console.log('Text Length:', preview.text.length);

  // You can save the HTML to a file for browser preview
  // fs.writeFileSync('preview.html', preview.html);

  return preview;
}

// Example 9: Get Email Analytics
export async function getEmailAnalytics(messageId: string) {
  const analytics = await emailService.getAnalytics(messageId);

  if (!analytics) {
    console.log('No analytics found for message');
    return null;
  }

  console.log(`Email Analytics for ${messageId}:`);
  console.log(`  Opened: ${analytics.opened} (${analytics.openCount} times)`);
  console.log(`  Clicked: ${analytics.clicked} (${analytics.clickCount} times)`);
  console.log(`  Bounced: ${analytics.bounced}`);
  console.log(`  Links clicked: ${analytics.clickedLinks.join(', ')}`);

  return analytics;
}

// Example 10: Get Template Performance
export async function getTemplatePerformance(templateId: string) {
  const stats = await emailService.getTemplateAnalytics(templateId, {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    end: new Date(),
  });

  console.log(`Template Performance: ${templateId}`);
  console.log(`  Total Sent: ${stats.totalSent}`);
  console.log(`  Open Rate: ${stats.openRate.toFixed(2)}%`);
  console.log(`  Click Rate: ${stats.clickRate.toFixed(2)}%`);
  console.log(`  Bounce Rate: ${stats.bounceRate.toFixed(2)}%`);

  return stats;
}

// Example 11: Manage User Preferences
export async function updateUserEmailPreferences(
  userEmail: string,
  preferences: {
    unsubscribeAll?: boolean;
    unsubscribeMarketing?: boolean;
    maxEmailsPerDay?: number;
    enableDigest?: boolean;
  }
) {
  if (preferences.unsubscribeAll) {
    await emailService.unsubscribeManager.unsubscribeAll(userEmail);
  }

  if (preferences.unsubscribeMarketing) {
    await emailService.unsubscribeManager.unsubscribeCategory(
      userEmail,
      EmailTemplateCategory.MARKETING
    );
  }

  if (preferences.maxEmailsPerDay || preferences.enableDigest) {
    await emailService.updateUnsubscribePreferences(userEmail, {
      frequency: {
        maxEmailsPerDay: preferences.maxEmailsPerDay,
        digestEnabled: preferences.enableDigest,
        digestFrequency: 'weekly',
      },
    });
  }

  console.log(`Preferences updated for ${userEmail}`);
}

// Example 12: Integration with Express.js Route
export function setupEmailRoutes(app: any) {
  // Tracking pixel endpoint
  app.get('/email/track/open/:messageId', async (req: any, res: any) => {
    const { messageId } = req.params;
    await emailService.analyticsService.trackOpen(messageId);

    // Return 1x1 transparent pixel
    const pixel = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    );
    res.set('Content-Type', 'image/gif');
    res.send(pixel);
  });

  // Click tracking endpoint
  app.get('/email/track/click/:messageId', async (req: any, res: any) => {
    const { messageId } = req.params;
    const { url } = req.query;

    if (url) {
      await emailService.analyticsService.trackClick(messageId, url as string);
      res.redirect(url as string);
    } else {
      res.status(400).send('Missing URL parameter');
    }
  });

  // Unsubscribe endpoint
  app.get('/email/unsubscribe', async (req: any, res: any) => {
    const { token } = req.query;

    if (!token) {
      return res.status(400).send('Missing token');
    }

    const verified = await emailService.unsubscribeManager.verifyUnsubscribeToken(token as string);

    if (!verified) {
      return res.status(400).send('Invalid or expired token');
    }

    await emailService.unsubscribeManager.unsubscribeAll(verified.email);

    res.send(`
      <html>
        <body style="font-family: sans-serif; padding: 40px; text-align: center;">
          <h1>You've been unsubscribed</h1>
          <p>You will no longer receive emails from IntelGraph.</p>
          <p><a href="/email/preferences?token=${token}">Manage email preferences</a></p>
        </body>
      </html>
    `);
  });

  // Preference center endpoint
  app.get('/email/preferences', async (req: any, res: any) => {
    const { token } = req.query;
    // Render preference center UI
    // (Implementation depends on your frontend framework)
    res.send('Preference Center UI');
  });
}

// Export for use in other modules
export { emailService };
