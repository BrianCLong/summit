/**
 * Deliverability Checker
 *
 * Checks email deliverability including spam score, authentication, and content analysis
 */

import {
  EmailMessage,
  DeliverabilityReport,
  SpamScoreResult,
  SpamScoreIssue,
  EmailServiceConfig,
} from '../types.js';

export class DeliverabilityChecker {
  private config?: EmailServiceConfig['deliverability'];
  private spamScoreThreshold: number;

  constructor(config?: EmailServiceConfig['deliverability']) {
    this.config = config;
    this.spamScoreThreshold = config?.spamScoreThreshold || 5.0;
  }

  /**
   * Check email deliverability
   */
  async check(message: EmailMessage): Promise<DeliverabilityReport> {
    const spamScore = await this.calculateSpamScore(message);
    const contentAnalysis = this.analyzeContent(message);
    const authentication = await this.checkAuthentication();

    const recommendations = this.generateRecommendations(
      spamScore,
      contentAnalysis,
      authentication,
    );

    const overallScore = this.calculateOverallScore(
      spamScore,
      contentAnalysis,
      authentication,
    );

    return {
      emailMessage: message,
      spamScore,
      authentication,
      contentAnalysis,
      recommendations,
      overallScore,
    };
  }

  /**
   * Calculate spam score
   */
  private async calculateSpamScore(message: EmailMessage): Promise<SpamScoreResult> {
    const issues: SpamScoreIssue[] = [];
    let score = 0;

    // Check subject line
    const subjectScore = this.checkSubject(message.subject, issues);
    score += subjectScore;

    // Check content
    const contentScore = this.checkContent(message.html, message.text, issues);
    score += contentScore;

    // Check links
    const linksScore = this.checkLinks(message.html, issues);
    score += linksScore;

    // Check images
    const imagesScore = this.checkImages(message.html, issues);
    score += imagesScore;

    // Check authentication
    const authScore = message.headers?.['DKIM-Signature'] ? 0 : 1;
    if (authScore > 0) {
      issues.push({
        severity: 'warning',
        category: 'authentication',
        message: 'DKIM signature not found',
        fix: 'Configure DKIM for your sending domain',
      });
    }
    score += authScore;

    const passed = score < this.spamScoreThreshold;
    const suggestions = issues
      .filter((i) => i.fix)
      .map((i) => i.fix!);

    return {
      score,
      passed,
      threshold: this.spamScoreThreshold,
      issues,
      suggestions,
      details: {
        subjectScore,
        contentScore,
        linksScore,
        imagesScore,
        authenticationScore: authScore,
      },
    };
  }

  private checkSubject(subject: string, issues: SpamScoreIssue[]): number {
    let score = 0;

    // Check for spam trigger words
    const spamWords = ['free', 'winner', 'cash', 'prize', 'urgent', 'act now', '!!!'];
    const lowerSubject = subject.toLowerCase();

    for (const word of spamWords) {
      if (lowerSubject.includes(word)) {
        score += 0.5;
        issues.push({
          severity: 'warning',
          category: 'subject',
          message: `Spam trigger word found: "${word}"`,
          fix: `Avoid using the word "${word}" in subject line`,
        });
      }
    }

    // Check for excessive punctuation
    const exclamationCount = (subject.match(/!/g) || []).length;
    if (exclamationCount > 1) {
      score += 0.5;
      issues.push({
        severity: 'warning',
        category: 'subject',
        message: 'Excessive exclamation marks in subject',
        fix: 'Limit exclamation marks to 1 or less',
      });
    }

    // Check for all caps
    if (subject === subject.toUpperCase() && subject.length > 5) {
      score += 1.0;
      issues.push({
        severity: 'warning',
        category: 'subject',
        message: 'Subject line is all uppercase',
        fix: 'Use normal capitalization in subject line',
      });
    }

    return score;
  }

  private checkContent(html: string, text: string, issues: SpamScoreIssue[]): number {
    let score = 0;

    // Check text-to-HTML ratio
    const htmlLength = html.replace(/<[^>]*>/g, '').length;
    const textLength = text.length;
    const ratio = textLength > 0 ? textLength / htmlLength : 0;

    if (ratio < 0.3) {
      score += 1.0;
      issues.push({
        severity: 'warning',
        category: 'content',
        message: 'Low text-to-HTML ratio',
        fix: 'Add more text content relative to HTML markup',
      });
    }

    // Check for excessive links
    const linkCount = (html.match(/<a/gi) || []).length;
    const wordCount = text.split(/\s+/).length;
    const linksPerWord = wordCount > 0 ? linkCount / wordCount : 0;

    if (linksPerWord > 0.1) {
      score += 1.0;
      issues.push({
        severity: 'warning',
        category: 'links',
        message: 'Too many links relative to content',
        fix: 'Reduce number of links in email',
      });
    }

    return score;
  }

  private checkLinks(html: string, issues: SpamScoreIssue[]): number {
    let score = 0;

    // Check for shortened URLs
    const shortenedUrlPatterns = ['bit.ly', 'tinyurl.com', 'goo.gl', 't.co'];
    for (const pattern of shortenedUrlPatterns) {
      if (html.includes(pattern)) {
        score += 0.5;
        issues.push({
          severity: 'warning',
          category: 'links',
          message: `Shortened URL detected: ${pattern}`,
          fix: 'Use full URLs instead of URL shorteners',
        });
      }
    }

    // Check for mismatched link text and href
    const linkRegex = /<a[^>]*href="([^"]*)"[^>]*>([^<]*)</gi;
    let match;
    while ((match = linkRegex.exec(html)) !== null) {
      const href = match[1];
      const text = match[2];

      // If text looks like a URL but doesn't match href
      if (text.match(/https?:\/\//i) && text !== href) {
        score += 1.0;
        issues.push({
          severity: 'critical',
          category: 'links',
          message: 'Link text and href mismatch',
          fix: 'Ensure link text matches the actual destination',
        });
      }
    }

    return score;
  }

  private checkImages(html: string, issues: SpamScoreIssue[]): number {
    let score = 0;

    const imageCount = (html.match(/<img/gi) || []).length;
    const textLength = html.replace(/<[^>]*>/g, '').length;

    // Check image-to-text ratio
    if (imageCount > 0 && textLength < 100) {
      score += 1.0;
      issues.push({
        severity: 'warning',
        category: 'images',
        message: 'Email is mostly images with little text',
        fix: 'Add more text content to balance images',
      });
    }

    // Check for missing alt text
    const imagesWithoutAlt = (html.match(/<img(?![^>]*alt=)[^>]*>/gi) || []).length;
    if (imagesWithoutAlt > 0) {
      score += 0.5;
      issues.push({
        severity: 'info',
        category: 'images',
        message: `${imagesWithoutAlt} images without alt text`,
        fix: 'Add alt text to all images',
      });
    }

    return score;
  }

  private analyzeContent(message: EmailMessage) {
    const html = message.html;
    const text = message.text;

    const textToHtmlRatio = text.length / html.replace(/<[^>]*>/g, '').length;
    const wordCount = text.split(/\s+/).length;
    const linkCount = (html.match(/<a/gi) || []).length;
    const imageCount = (html.match(/<img/gi) || []).length;
    const hasUnsubscribeLink = !!(
      message.unsubscribeUrl ||
      message.listUnsubscribe ||
      html.toLowerCase().includes('unsubscribe')
    );
    const hasPhysicalAddress = /\d+\s+[\w\s]+,\s*\w+\s+\d{5}/.test(html);

    return {
      textToHtmlRatio,
      wordCount,
      linkCount,
      imageCount,
      hasUnsubscribeLink,
      hasPhysicalAddress,
    };
  }

  private async checkAuthentication() {
    // In production, check DNS records for SPF, DKIM, DMARC
    // This is a placeholder implementation
    return {
      spfConfigured: true, // Placeholder
      dkimConfigured: true, // Placeholder
      dmarcConfigured: true, // Placeholder
    };
  }

  private generateRecommendations(
    spamScore: SpamScoreResult,
    contentAnalysis: DeliverabilityReport['contentAnalysis'],
    authentication: DeliverabilityReport['authentication'],
  ): string[] {
    const recommendations: string[] = [];

    if (spamScore.score >= this.spamScoreThreshold) {
      recommendations.push(
        `Spam score is ${spamScore.score.toFixed(1)}, which exceeds the threshold of ${this.spamScoreThreshold}. Review and fix issues.`,
      );
    }

    if (!contentAnalysis.hasUnsubscribeLink) {
      recommendations.push('Add an unsubscribe link to comply with CAN-SPAM Act');
    }

    if (!contentAnalysis.hasPhysicalAddress) {
      recommendations.push('Include your physical mailing address to comply with CAN-SPAM Act');
    }

    if (contentAnalysis.textToHtmlRatio < 0.3) {
      recommendations.push('Increase text content relative to HTML markup');
    }

    if (!authentication.spfConfigured) {
      recommendations.push('Configure SPF record for your sending domain');
    }

    if (!authentication.dkimConfigured) {
      recommendations.push('Configure DKIM signature for your emails');
    }

    if (!authentication.dmarcConfigured) {
      recommendations.push('Configure DMARC policy for your domain');
    }

    return recommendations;
  }

  private calculateOverallScore(
    spamScore: SpamScoreResult,
    contentAnalysis: DeliverabilityReport['contentAnalysis'],
    authentication: DeliverabilityReport['authentication'],
  ): number {
    let score = 100;

    // Deduct for spam score
    score -= spamScore.score * 5;

    // Deduct for missing authentication
    if (!authentication.spfConfigured) score -= 10;
    if (!authentication.dkimConfigured) score -= 10;
    if (!authentication.dmarcConfigured) score -= 5;

    // Deduct for missing compliance elements
    if (!contentAnalysis.hasUnsubscribeLink) score -= 15;
    if (!contentAnalysis.hasPhysicalAddress) score -= 10;

    return Math.max(0, Math.min(100, score));
  }
}
