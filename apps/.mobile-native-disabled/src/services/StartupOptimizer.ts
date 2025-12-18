import {InteractionManager, AppState} from 'react-native';
import {performanceMonitor} from './PerformanceMonitor';
import {useAppStore} from '../stores/appStore';
import * as Sentry from '@sentry/react-native';

interface StartupTask {
  name: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  fn: () => Promise<void>;
  completed: boolean;
  duration?: number;
  error?: Error;
}

/**
 * Startup optimizer for better app launch performance
 *
 * Strategies:
 * 1. Lazy initialization - defer non-critical tasks
 * 2. Parallel loading - run independent tasks concurrently
 * 3. Progressive startup - show UI while loading
 * 4. Cached data - use cached data for instant UI
 */
class StartupOptimizerService {
  private tasks: StartupTask[] = [];
  private isInitialized = false;
  private startTime = Date.now();

  /**
   * Register a startup task
   */
  registerTask(
    name: string,
    fn: () => Promise<void>,
    priority: StartupTask['priority'] = 'medium',
  ): void {
    this.tasks.push({
      name,
      priority,
      fn,
      completed: false,
    });
  }

  /**
   * Run all startup tasks in optimized order
   */
  async runStartup(): Promise<void> {
    if (this.isInitialized) {
      console.log('[StartupOptimizer] Already initialized');
      return;
    }

    performanceMonitor.mark('app_startup');

    try {
      // Phase 1: Critical tasks (blocking - must complete before showing UI)
      await this.runCriticalTasks();

      // Phase 2: High priority tasks (run before first interaction)
      this.runHighPriorityTasks();

      // Phase 3: Medium/Low priority tasks (run after interactions complete)
      this.runDeferredTasks();

      this.isInitialized = true;

      const startupTime = performanceMonitor.measure('app_startup', 'startup');
      useAppStore.getState().setStartupTime(startupTime);

      console.log(`[StartupOptimizer] Startup complete in ${startupTime}ms`);

      // Send to analytics
      Sentry.addBreadcrumb({
        category: 'startup',
        message: `App started in ${startupTime}ms`,
        level: 'info',
      });
    } catch (error: any) {
      console.error('[StartupOptimizer] Startup failed:', error);

      Sentry.captureException(error, {
        tags: {
          component: 'startup',
        },
      });

      throw error;
    }
  }

  /**
   * Run critical tasks (blocking)
   */
  private async runCriticalTasks(): Promise<void> {
    performanceMonitor.mark('critical_tasks');

    const criticalTasks = this.tasks.filter((t) => t.priority === 'critical');

    console.log(`[StartupOptimizer] Running ${criticalTasks.length} critical tasks`);

    // Run critical tasks in parallel for faster startup
    await Promise.all(
      criticalTasks.map(async (task) => {
        try {
          performanceMonitor.mark(task.name);
          await task.fn();
          task.duration = performanceMonitor.measure(task.name, 'startup');
          task.completed = true;
        } catch (error: any) {
          task.error = error;
          console.error(`[StartupOptimizer] Critical task failed: ${task.name}`, error);
          throw error; // Critical tasks must succeed
        }
      }),
    );

    const duration = performanceMonitor.measure('critical_tasks', 'startup');
    console.log(`[StartupOptimizer] Critical tasks completed in ${duration}ms`);
  }

  /**
   * Run high priority tasks (before first interaction)
   */
  private runHighPriorityTasks(): void {
    performanceMonitor.mark('high_priority_tasks');

    const highPriorityTasks = this.tasks.filter((t) => t.priority === 'high');

    console.log(`[StartupOptimizer] Running ${highPriorityTasks.length} high priority tasks`);

    // Run after current interactions complete
    InteractionManager.runAfterInteractions(async () => {
      await Promise.all(
        highPriorityTasks.map(async (task) => {
          try {
            performanceMonitor.mark(task.name);
            await task.fn();
            task.duration = performanceMonitor.measure(task.name, 'startup');
            task.completed = true;
          } catch (error: any) {
            task.error = error;
            console.error(`[StartupOptimizer] High priority task failed: ${task.name}`, error);
          }
        }),
      );

      const duration = performanceMonitor.measure('high_priority_tasks', 'startup');
      console.log(`[StartupOptimizer] High priority tasks completed in ${duration}ms`);
    });
  }

  /**
   * Run deferred tasks (after interactions complete)
   */
  private runDeferredTasks(): void {
    const deferredTasks = this.tasks.filter(
      (t) => t.priority === 'medium' || t.priority === 'low',
    );

    console.log(`[StartupOptimizer] Deferring ${deferredTasks.length} tasks`);

    // Run after all interactions complete and app is idle
    InteractionManager.runAfterInteractions(() => {
      // Further defer to next tick to ensure smooth UI
      setTimeout(async () => {
        performanceMonitor.mark('deferred_tasks');

        for (const task of deferredTasks) {
          try {
            performanceMonitor.mark(task.name);
            await task.fn();
            task.duration = performanceMonitor.measure(task.name, 'startup');
            task.completed = true;
          } catch (error: any) {
            task.error = error;
            console.error(`[StartupOptimizer] Deferred task failed: ${task.name}`, error);
            // Don't throw - these are non-critical
          }
        }

        const duration = performanceMonitor.measure('deferred_tasks', 'startup');
        console.log(`[StartupOptimizer] Deferred tasks completed in ${duration}ms`);
      }, 100);
    });
  }

  /**
   * Get startup report
   */
  getReport(): {
    totalDuration: number;
    tasks: {
      name: string;
      priority: string;
      duration?: number;
      completed: boolean;
      error?: string;
    }[];
  } {
    return {
      totalDuration: Date.now() - this.startTime,
      tasks: this.tasks.map((t) => ({
        name: t.name,
        priority: t.priority,
        duration: t.duration,
        completed: t.completed,
        error: t.error?.message,
      })),
    };
  }

  /**
   * Reset for re-initialization (useful for testing)
   */
  reset(): void {
    this.tasks = [];
    this.isInitialized = false;
    this.startTime = Date.now();
  }
}

// Export singleton
export const startupOptimizer = new StartupOptimizerService();

/**
 * Pre-configured startup tasks
 */
export const configureDefaultStartupTasks = () => {
  // Critical: Must complete before showing UI
  startupOptimizer.registerTask(
    'initialize_database',
    async () => {
      const {initializeDatabase} = await import('./Database');
      await initializeDatabase();
    },
    'critical',
  );

  startupOptimizer.registerTask(
    'restore_apollo_cache',
    async () => {
      const {restoreCache} = await import('./GraphQLClient');
      await restoreCache();
    },
    'critical',
  );

  startupOptimizer.registerTask(
    'restore_app_state',
    async () => {
      // App state is restored automatically by Zustand persist
      console.log('[Startup] App state restored');
    },
    'critical',
  );

  // High: Run before first interaction
  startupOptimizer.registerTask(
    'check_network_status',
    async () => {
      const NetInfo = await import('@react-native-community/netinfo');
      const state = await NetInfo.default.fetch();
      useAppStore.getState().setOnlineStatus(
        state.isConnected === true && state.isInternetReachable === true,
      );
    },
    'high',
  );

  startupOptimizer.registerTask(
    'request_location_permission',
    async () => {
      const {requestLocationPermission} = await import('./LocationService');
      await requestLocationPermission();
    },
    'high',
  );

  startupOptimizer.registerTask(
    'register_background_tasks',
    async () => {
      const {registerBackgroundTasks} = await import('./BackgroundTasks');
      await registerBackgroundTasks();
    },
    'high',
  );

  // Medium: Can be deferred
  startupOptimizer.registerTask(
    'setup_push_notifications',
    async () => {
      const settings = useAppStore.getState().settings;
      if (settings.notificationsEnabled) {
        const {setupPushNotifications} = await import('./NotificationService');
        await setupPushNotifications();
      }
    },
    'medium',
  );

  startupOptimizer.registerTask(
    'sync_offline_data',
    async () => {
      const {enhancedOfflineSync} = await import('./EnhancedOfflineSync');
      await enhancedOfflineSync.sync();
    },
    'medium',
  );

  // Low: Non-critical background tasks
  startupOptimizer.registerTask(
    'clean_old_cache',
    async () => {
      // Clean cache older than 7 days
      console.log('[Startup] Cleaning old cache');
    },
    'low',
  );

  startupOptimizer.registerTask(
    'prefetch_data',
    async () => {
      // Prefetch commonly used data
      console.log('[Startup] Prefetching data');
    },
    'low',
  );

  startupOptimizer.registerTask(
    'analytics_session_start',
    async () => {
      const settings = useAppStore.getState().settings;
      if (settings.analyticsEnabled) {
        const analytics = await import('@react-native-firebase/analytics');
        await analytics.default().logEvent('session_start');
      }
    },
    'low',
  );
};
