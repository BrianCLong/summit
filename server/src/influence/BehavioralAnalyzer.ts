
import { Actor, SocialPost, BehavioralFingerprint, AnomalyDetectionResult } from './types';

export class BehavioralAnalyzer {

  /**
   * Generates a behavioral fingerprint for an actor based on their posts.
   */
  public generateFingerprint(actor: Actor, posts: SocialPost[]): BehavioralFingerprint {
    if (posts.length === 0) {
      return {
        postFrequency: 0,
        burstiness: 0,
        contentRepetition: 0,
        sentimentVolatility: 0,
        accountAgeDays: this.calculateAccountAge(actor),
      };
    }

    const sortedPosts = posts.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const durationHours = (sortedPosts[sortedPosts.length - 1].timestamp.getTime() - sortedPosts[0].timestamp.getTime()) / (1000 * 60 * 60) || 1;

    const postFrequency = posts.length / durationHours;
    const burstiness = this.calculateBurstiness(sortedPosts);
    const contentRepetition = this.calculateContentRepetition(posts);
    const sentimentVolatility = this.calculateSentimentVolatility(posts); // Placeholder, requires NLP
    const accountAgeDays = this.calculateAccountAge(actor);

    return {
      postFrequency,
      burstiness,
      contentRepetition,
      sentimentVolatility,
      accountAgeDays,
    };
  }

  /**
   * Detects if an actor is likely a bot based on their fingerprint.
   */
  public detectBot(fingerprint: BehavioralFingerprint): AnomalyDetectionResult {
    let score = 0;
    const reasons: string[] = [];

    // High frequency is suspicious
    if (fingerprint.postFrequency > 50) {
      score += 0.4;
      reasons.push('High post frequency');
    }

    // High burstiness might indicate automated scripts
    if (fingerprint.burstiness > 0.8) {
      score += 0.3;
      reasons.push('High burstiness');
    }

    // High content repetition
    if (fingerprint.contentRepetition > 0.7) {
      score += 0.3;
      reasons.push('High content repetition');
    }

    // New accounts with high activity
    if (fingerprint.accountAgeDays < 7 && fingerprint.postFrequency > 10) {
      score += 0.5;
      reasons.push('New account with high activity');
    }

    return {
      isAnomalous: score >= 0.7,
      score: Math.min(score, 1),
      reason: reasons.join(', '),
    };
  }

  /**
   * Detects coordinated temporal behavior among a group of actors.
   * Checks if they post at the exact same times.
   */
  public detectTemporalCoordination(postsByActor: Map<string, SocialPost[]>): AnomalyDetectionResult {
    const timeBuckets = new Map<number, Set<string>>();
    const bucketSizeMs = 60 * 1000; // 1 minute buckets

    for (const [actorId, posts] of postsByActor.entries()) {
      for (const post of posts) {
        const bucket = Math.floor(post.timestamp.getTime() / bucketSizeMs);
        if (!timeBuckets.has(bucket)) {
          timeBuckets.set(bucket, new Set());
        }
        timeBuckets.get(bucket)!.add(actorId);
      }
    }

    let maxCoordination = 0;
    let coordinatedBuckets = 0;

    for (const actors of timeBuckets.values()) {
      if (actors.size > 2) { // Threshold for coordination
        coordinatedBuckets++;
        maxCoordination = Math.max(maxCoordination, actors.size);
      }
    }

    const coordinationScore = (coordinatedBuckets / timeBuckets.size) || 0;

    if (maxCoordination > 5 && coordinationScore > 0.1) {
       return {
         isAnomalous: true,
         score: Math.min(0.5 + (maxCoordination / 20), 1),
         reason: `High temporal coordination detected: max ${maxCoordination} concurrent actors`,
       };
    }

    return {
      isAnomalous: false,
      score: coordinationScore,
      reason: 'No significant coordination detected',
    };
  }

  private calculateBurstiness(sortedPosts: SocialPost[]): number {
    if (sortedPosts.length < 2) return 0;

    const intervals: number[] = [];
    for (let i = 1; i < sortedPosts.length; i++) {
      intervals.push(sortedPosts[i].timestamp.getTime() - sortedPosts[i-1].timestamp.getTime());
    }

    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    if (mean === 0) return 0;

    const variance = intervals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);

    // Coefficient of variation as a proxy for burstiness
    // -1 to 1 normalization could be applied, but raw CV is useful.
    // Here we return a normalized value where 0 is periodic (stdDev=0) and 1 is highly bursty (stdDev >= mean)
    return Math.min(stdDev / mean, 1);
  }

  private calculateContentRepetition(posts: SocialPost[]): number {
    if (posts.length === 0) return 0;
    const uniqueContents = new Set(posts.map(p => p.content)); // Ideally hash content
    return 1 - (uniqueContents.size / posts.length);
  }

  /**
   * Detects anomalies in geolocation vs timestamp.
   * Checks for "impossible travel" or impossible coordination (e.g. same person multiple places).
   */
  public detectGeoTemporalAnomalies(posts: SocialPost[]): AnomalyDetectionResult {
    const sortedPosts = posts
      .filter(p => p.location)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    if (sortedPosts.length < 2) {
      return { isAnomalous: false, score: 0, reason: 'Insufficient geo-tagged posts' };
    }

    let impossibleTravelCount = 0;
    const maxSpeedKmh = 1000; // Plane speed roughly

    for (let i = 1; i < sortedPosts.length; i++) {
      const prev = sortedPosts[i - 1];
      const curr = sortedPosts[i];

      const distanceKm = this.haversineDistance(
        prev.location!.lat, prev.location!.lng,
        curr.location!.lat, curr.location!.lng
      );

      const timeDiffHours = (curr.timestamp.getTime() - prev.timestamp.getTime()) / (1000 * 60 * 60);

      if (timeDiffHours <= 0) {
          // Simultaneous posts from different locations?
          if (distanceKm > 100) {
              impossibleTravelCount++;
          }
          continue;
      }

      const speed = distanceKm / timeDiffHours;
      if (speed > maxSpeedKmh) {
        impossibleTravelCount++;
      }
    }

    if (impossibleTravelCount > 0) {
      return {
        isAnomalous: true,
        score: Math.min(impossibleTravelCount / 5, 1),
        reason: `Detected ${impossibleTravelCount} instances of impossible travel`,
      };
    }

    return { isAnomalous: false, score: 0, reason: 'No geo-temporal anomalies' };
  }

  private calculateSentimentVolatility(posts: SocialPost[]): number {
    const scores = posts
      .map(p => p.metadata?.sentimentScore)
      .filter(s => typeof s === 'number');

    if (scores.length < 2) return 0; // Not enough data

    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length;

    // Normalize: standard deviation of sentiment (0-1 scale)
    return Math.sqrt(variance);
  }

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private calculateAccountAge(actor: Actor): number {
    const now = new Date();
    const diff = now.getTime() - actor.createdAt.getTime();
    return diff / (1000 * 60 * 60 * 24);
  }
}
