import { CommunityStore } from '../store.js';
import { ActivityFeedService } from './activityFeedService.js';
import { ContributionTracker } from './contributionTracker.js';
import { GamificationService } from './gamificationService.js';
import { DiscussionForumService } from './discussionForumService.js';
import { NotificationService } from './notificationService.js';
import { UserProfileService } from './userProfileService.js';
import { ModerationService } from './moderationService.js';
import { SearchService } from './searchService.js';
import { AnalyticsService } from './analyticsService.js';
import { DashboardService } from './dashboardService.js';

export class CommunityHub {
  public readonly store: CommunityStore;
  public readonly activity: ActivityFeedService;
  public readonly contributions: ContributionTracker;
  public readonly gamification: GamificationService;
  public readonly forum: DiscussionForumService;
  public readonly notifications: NotificationService;
  public readonly profiles: UserProfileService;
  public readonly moderation: ModerationService;
  public readonly search: SearchService;
  public readonly analytics: AnalyticsService;
  public readonly dashboard: DashboardService;

  public constructor(store?: CommunityStore) {
    this.store = store ?? new CommunityStore();
    this.activity = new ActivityFeedService(this.store);
    this.contributions = new ContributionTracker(this.store);
    this.notifications = new NotificationService(this.store);
    this.gamification = new GamificationService(this.store, this.contributions);
    this.forum = new DiscussionForumService(
      this.store,
      this.activity,
      this.contributions,
      this.gamification,
      this.notifications,
    );
    this.profiles = new UserProfileService(
      this.store,
      this.activity,
      this.contributions,
    );
    this.moderation = new ModerationService(
      this.store,
      this.activity,
      this.notifications,
    );
    this.search = new SearchService(this.store);
    this.analytics = new AnalyticsService(this.store);
    this.dashboard = new DashboardService(this.analytics, this.contributions);
  }
}
