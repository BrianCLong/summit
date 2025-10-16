import { CommunityStore } from '../store.js';
import type { AccessibilityPreferences, UserProfile } from '../types.js';
import { ActivityFeedService } from './activityFeedService.js';
import { ContributionTracker } from './contributionTracker.js';
import { createId, clamp } from '../utils.js';

export interface CreateProfileInput {
  readonly displayName: string;
  readonly bio?: string;
  readonly avatarAltText?: string;
  readonly interests?: readonly string[];
  readonly accessibility?: Partial<AccessibilityPreferences>;
}

const defaultAccessibility: AccessibilityPreferences = {
  highContrast: false,
  prefersReducedMotion: true,
  prefersReducedTransparency: true,
  fontScale: 1,
  locale: 'en-US',
};

const normalizeAccessibility = (
  input?: Partial<AccessibilityPreferences>,
): AccessibilityPreferences => ({
  highContrast: input?.highContrast ?? defaultAccessibility.highContrast,
  prefersReducedMotion:
    input?.prefersReducedMotion ?? defaultAccessibility.prefersReducedMotion,
  prefersReducedTransparency:
    input?.prefersReducedTransparency ??
    defaultAccessibility.prefersReducedTransparency,
  fontScale: clamp(
    input?.fontScale ?? defaultAccessibility.fontScale,
    0.8,
    1.6,
  ),
  locale: input?.locale ?? defaultAccessibility.locale,
});

export class UserProfileService {
  public constructor(
    private readonly store: CommunityStore,
    private readonly activity: ActivityFeedService,
    private readonly contributions: ContributionTracker,
  ) {}

  public createProfile(input: CreateProfileInput): UserProfile {
    const now = new Date();
    const profile: UserProfile = {
      id: createId('usr'),
      displayName: input.displayName.trim(),
      bio: input.bio?.trim() ?? '',
      avatarAltText:
        input.avatarAltText?.trim() ?? `${input.displayName} avatar`,
      interests: [...(input.interests ?? [])],
      accessibility: normalizeAccessibility(input.accessibility),
      badges: [],
      points: 0,
      joinedAt: now,
      lastActiveAt: now,
    };

    this.store.upsertUser(profile);
    this.contributions.bootstrap(profile.id);
    this.activity.record({
      userId: profile.id,
      type: 'profile_updated',
      summary: `Profile created for ${profile.displayName}`,
      metadata: { accessibility: profile.accessibility },
    });

    return profile;
  }

  public updateProfile(
    userId: string,
    updates: Partial<Omit<UserProfile, 'id' | 'joinedAt'>>,
  ): UserProfile {
    const existing = this.store.getUser(userId);
    if (!existing) {
      throw new Error(`Unknown user ${userId}`);
    }

    const updated: UserProfile = {
      ...existing,
      ...updates,
      accessibility: normalizeAccessibility({
        ...existing.accessibility,
        ...updates.accessibility,
      }),
      badges: updates.badges ? [...updates.badges] : existing.badges,
      interests: updates.interests
        ? [...updates.interests]
        : existing.interests,
      lastActiveAt: new Date(),
    };
    this.store.upsertUser(updated);
    this.activity.record({
      userId: updated.id,
      type: 'profile_updated',
      summary: `Profile updated for ${updated.displayName}`,
      metadata: updates,
    });
    return updated;
  }

  public touch(userId: string): UserProfile {
    const existing = this.store.getUser(userId);
    if (!existing) {
      throw new Error(`Unknown user ${userId}`);
    }
    const updated = { ...existing, lastActiveAt: new Date() };
    this.store.upsertUser(updated);
    return updated;
  }

  public getProfile(userId: string): UserProfile {
    const profile = this.store.getUser(userId);
    if (!profile) {
      throw new Error(`Unknown user ${userId}`);
    }
    return profile;
  }

  public listProfiles(): UserProfile[] {
    return this.store.listUsers();
  }
}
