/**
 * Digital footprint analyzer
 */

import type {
  DigitalFootprint,
  FootprintAnalysis,
  Pattern,
  Correlation,
  Anomaly,
  TimelineEvent,
  CrossPlatformLink,
  PatternType
} from './types.js';

export class FootprintAnalyzer {
  /**
   * Analyze a digital footprint
   */
  analyze(footprint: DigitalFootprint): FootprintAnalysis {
    return {
      footprint,
      patterns: this.detectPatterns(footprint),
      correlations: this.findCorrelations(footprint),
      anomalies: this.detectAnomalies(footprint),
      timeline: this.buildTimeline(footprint)
    };
  }

  /**
   * Detect patterns in digital footprint
   */
  private detectPatterns(footprint: DigitalFootprint): Pattern[] {
    const patterns: Pattern[] = [];

    // Username reuse pattern
    const usernamePattern = this.detectUsernameReuse(footprint);
    if (usernamePattern) patterns.push(usernamePattern);

    // Email pattern
    const emailPattern = this.detectEmailPattern(footprint);
    if (emailPattern) patterns.push(emailPattern);

    // Timezone pattern
    const timezonePattern = this.detectTimezonePattern(footprint);
    if (timezonePattern) patterns.push(timezonePattern);

    // Activity pattern
    const activityPattern = this.detectActivityPattern(footprint);
    if (activityPattern) patterns.push(activityPattern);

    return patterns;
  }

  /**
   * Detect username reuse across platforms
   */
  private detectUsernameReuse(footprint: DigitalFootprint): Pattern | null {
    const usernames = new Map<string, string[]>();

    for (const record of footprint.usernames) {
      const platforms = usernames.get(record.username) || [];
      platforms.push(record.platform);
      usernames.set(record.username, platforms);
    }

    const reused = Array.from(usernames.entries()).filter(
      ([, platforms]) => platforms.length > 1
    );

    if (reused.length > 0) {
      return {
        type: 'username_reuse' as PatternType,
        description: `Username reused across ${reused.length} different username(s)`,
        confidence: 0.9,
        evidence: reused.map(
          ([username, platforms]) => `${username} on ${platforms.join(', ')}`
        )
      };
    }

    return null;
  }

  /**
   * Detect email patterns
   */
  private detectEmailPattern(footprint: DigitalFootprint): Pattern | null {
    if (footprint.emails.length < 2) return null;

    const domains = new Set(footprint.emails.map(e => e.domain));
    const patterns: string[] = [];

    // Check for consistent domain usage
    if (domains.size === 1) {
      patterns.push(`All emails use domain ${Array.from(domains)[0]}`);
    }

    // Check for numbered variations (e.g., user1@, user2@)
    const numberedPattern = /\d+/;
    const hasNumbered = footprint.emails.some(e =>
      numberedPattern.test(e.email.split('@')[0])
    );

    if (hasNumbered) {
      patterns.push('Uses numbered email variations');
    }

    if (patterns.length > 0) {
      return {
        type: 'email_pattern' as PatternType,
        description: 'Email usage patterns detected',
        confidence: 0.8,
        evidence: patterns
      };
    }

    return null;
  }

  /**
   * Detect timezone patterns from IP geolocation
   */
  private detectTimezonePattern(footprint: DigitalFootprint): Pattern | null {
    if (footprint.ipAddresses.length < 2) return null;

    const timezones = footprint.ipAddresses
      .map(ip => ip.geolocation.timezone)
      .filter(tz => tz);

    if (timezones.length === 0) return null;

    const uniqueTimezones = new Set(timezones);

    if (uniqueTimezones.size === 1) {
      return {
        type: 'timezone_pattern' as PatternType,
        description: `Consistent timezone: ${Array.from(uniqueTimezones)[0]}`,
        confidence: 0.85,
        evidence: [`All IPs in ${Array.from(uniqueTimezones)[0]}`]
      };
    }

    return null;
  }

  /**
   * Detect activity patterns
   */
  private detectActivityPattern(footprint: DigitalFootprint): Pattern | null {
    const activities: Date[] = [];

    // Collect all activity timestamps
    for (const social of footprint.socialMedia) {
      if (social.lastActive) activities.push(social.lastActive);
    }

    if (activities.length < 3) return null;

    // Analyze activity times
    const hours = activities.map(d => d.getHours());
    const avgHour = hours.reduce((a, b) => a + b, 0) / hours.length;

    let timeOfDay = 'night';
    if (avgHour >= 6 && avgHour < 12) timeOfDay = 'morning';
    else if (avgHour >= 12 && avgHour < 18) timeOfDay = 'afternoon';
    else if (avgHour >= 18 && avgHour < 22) timeOfDay = 'evening';

    return {
      type: 'activity_pattern' as PatternType,
      description: `Most active during ${timeOfDay}`,
      confidence: 0.7,
      evidence: [`Average activity hour: ${avgHour.toFixed(1)}`]
    };
  }

  /**
   * Find correlations between different footprint elements
   */
  private findCorrelations(footprint: DigitalFootprint): Correlation[] {
    const correlations: Correlation[] = [];

    // Username correlations
    const usernameCorr = this.findUsernameCorrelations(footprint);
    if (usernameCorr) correlations.push(usernameCorr);

    // Email-username correlations
    const emailUsernameCorr = this.findEmailUsernameCorrelations(footprint);
    if (emailUsernameCorr) correlations.push(emailUsernameCorr);

    return correlations;
  }

  /**
   * Find username correlations
   */
  private findUsernameCorrelations(footprint: DigitalFootprint): Correlation | null {
    if (footprint.usernames.length < 2) return null;

    const usernames = footprint.usernames.map(u => u.username);
    const commonPrefixes = this.findCommonPrefixes(usernames);

    if (commonPrefixes.length > 0) {
      return {
        type: 'username_correlation',
        entities: usernames,
        strength: 0.8,
        evidence: [`Common prefixes: ${commonPrefixes.join(', ')}`]
      };
    }

    return null;
  }

  /**
   * Find email-username correlations
   */
  private findEmailUsernameCorrelations(
    footprint: DigitalFootprint
  ): Correlation | null {
    if (footprint.emails.length === 0 || footprint.usernames.length === 0)
      return null;

    const emailUsers = footprint.emails.map(e => e.email.split('@')[0]);
    const usernames = footprint.usernames.map(u => u.username);

    const matches = emailUsers.filter(eu =>
      usernames.some(un => un.toLowerCase().includes(eu.toLowerCase()))
    );

    if (matches.length > 0) {
      return {
        type: 'email_username_correlation',
        entities: [...emailUsers, ...usernames],
        strength: 0.85,
        evidence: [`Matching patterns: ${matches.join(', ')}`]
      };
    }

    return null;
  }

  /**
   * Find common prefixes in strings
   */
  private findCommonPrefixes(strings: string[], minLength: number = 3): string[] {
    if (strings.length < 2) return [];

    const prefixes = new Set<string>();

    for (let i = 0; i < strings.length; i++) {
      for (let j = i + 1; j < strings.length; j++) {
        const prefix = this.longestCommonPrefix(strings[i], strings[j]);
        if (prefix.length >= minLength) {
          prefixes.add(prefix);
        }
      }
    }

    return Array.from(prefixes);
  }

  /**
   * Find longest common prefix
   */
  private longestCommonPrefix(str1: string, str2: string): string {
    let i = 0;
    while (i < str1.length && i < str2.length && str1[i] === str2[i]) {
      i++;
    }
    return str1.slice(0, i);
  }

  /**
   * Detect anomalies in digital footprint
   */
  private detectAnomalies(footprint: DigitalFootprint): Anomaly[] {
    const anomalies: Anomaly[] = [];

    // Check for VPN/Proxy usage
    const vpnIPs = footprint.ipAddresses.filter(ip => ip.vpn || ip.proxy);
    if (vpnIPs.length > 0) {
      anomalies.push({
        type: 'vpn_usage',
        description: `VPN/Proxy detected on ${vpnIPs.length} IP(s)`,
        severity: 'medium',
        timestamp: new Date(),
        details: { count: vpnIPs.length }
      });
    }

    // Check for Tor usage
    const torIPs = footprint.ipAddresses.filter(ip => ip.tor);
    if (torIPs.length > 0) {
      anomalies.push({
        type: 'tor_usage',
        description: `Tor network detected on ${torIPs.length} IP(s)`,
        severity: 'high',
        timestamp: new Date(),
        details: { count: torIPs.length }
      });
    }

    // Check for breached emails
    const breachedEmails = footprint.emails.filter(e => e.breached);
    if (breachedEmails.length > 0) {
      anomalies.push({
        type: 'email_breach',
        description: `${breachedEmails.length} email(s) found in breaches`,
        severity: 'high',
        timestamp: new Date(),
        details: {
          emails: breachedEmails.map(e => e.email)
        }
      });
    }

    // Check for geographic inconsistencies
    const countries = new Set(
      footprint.ipAddresses.map(ip => ip.geolocation.country)
    );
    if (countries.size > 3) {
      anomalies.push({
        type: 'geographic_anomaly',
        description: `Activity from ${countries.size} different countries`,
        severity: 'medium',
        timestamp: new Date(),
        details: { countries: Array.from(countries) }
      });
    }

    return anomalies;
  }

  /**
   * Build timeline of events
   */
  private buildTimeline(footprint: DigitalFootprint): TimelineEvent[] {
    const events: TimelineEvent[] = [];

    // Username events
    for (const username of footprint.usernames) {
      events.push({
        timestamp: username.firstSeen,
        type: 'username_first_seen',
        platform: username.platform,
        description: `Username ${username.username} first seen on ${username.platform}`,
        metadata: { username: username.username }
      });
    }

    // Social media events
    for (const social of footprint.socialMedia) {
      if (social.created) {
        events.push({
          timestamp: social.created,
          type: 'social_account_created',
          platform: social.platform,
          description: `${social.platform} account created`,
          metadata: { username: social.username }
        });
      }
    }

    // Sort by timestamp
    return events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Find cross-platform links
   */
  findCrossPlatformLinks(footprint: DigitalFootprint): CrossPlatformLink[] {
    const links: CrossPlatformLink[] = [];

    // Username-based links
    const usernameMap = new Map<string, string[]>();
    for (const record of footprint.usernames) {
      const platforms = usernameMap.get(record.username) || [];
      platforms.push(record.platform);
      usernameMap.set(record.username, platforms);
    }

    for (const [username, platforms] of usernameMap) {
      if (platforms.length > 1) {
        for (let i = 0; i < platforms.length; i++) {
          for (let j = i + 1; j < platforms.length; j++) {
            links.push({
              platform1: platforms[i],
              platform2: platforms[j],
              linkType: 'username',
              confidence: 0.9,
              evidence: [`Shared username: ${username}`]
            });
          }
        }
      }
    }

    return links;
  }
}
