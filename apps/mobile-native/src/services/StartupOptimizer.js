"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureDefaultStartupTasks = exports.startupOptimizer = void 0;
const react_native_1 = require("react-native");
const PerformanceMonitor_1 = require("./PerformanceMonitor");
const appStore_1 = require("../stores/appStore");
const Sentry = __importStar(require("@sentry/react-native"));
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
    tasks = [];
    isInitialized = false;
    startTime = Date.now();
    /**
     * Register a startup task
     */
    registerTask(name, fn, priority = 'medium') {
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
    async runStartup() {
        if (this.isInitialized) {
            console.log('[StartupOptimizer] Already initialized');
            return;
        }
        PerformanceMonitor_1.performanceMonitor.mark('app_startup');
        try {
            // Phase 1: Critical tasks (blocking - must complete before showing UI)
            await this.runCriticalTasks();
            // Phase 2: High priority tasks (run before first interaction)
            this.runHighPriorityTasks();
            // Phase 3: Medium/Low priority tasks (run after interactions complete)
            this.runDeferredTasks();
            this.isInitialized = true;
            const startupTime = PerformanceMonitor_1.performanceMonitor.measure('app_startup', 'startup');
            appStore_1.useAppStore.getState().setStartupTime(startupTime);
            console.log(`[StartupOptimizer] Startup complete in ${startupTime}ms`);
            // Send to analytics
            Sentry.addBreadcrumb({
                category: 'startup',
                message: `App started in ${startupTime}ms`,
                level: 'info',
            });
        }
        catch (error) {
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
    async runCriticalTasks() {
        PerformanceMonitor_1.performanceMonitor.mark('critical_tasks');
        const criticalTasks = this.tasks.filter((t) => t.priority === 'critical');
        console.log(`[StartupOptimizer] Running ${criticalTasks.length} critical tasks`);
        // Run critical tasks in parallel for faster startup
        await Promise.all(criticalTasks.map(async (task) => {
            try {
                PerformanceMonitor_1.performanceMonitor.mark(task.name);
                await task.fn();
                task.duration = PerformanceMonitor_1.performanceMonitor.measure(task.name, 'startup');
                task.completed = true;
            }
            catch (error) {
                task.error = error;
                console.error(`[StartupOptimizer] Critical task failed: ${task.name}`, error);
                throw error; // Critical tasks must succeed
            }
        }));
        const duration = PerformanceMonitor_1.performanceMonitor.measure('critical_tasks', 'startup');
        console.log(`[StartupOptimizer] Critical tasks completed in ${duration}ms`);
    }
    /**
     * Run high priority tasks (before first interaction)
     */
    runHighPriorityTasks() {
        PerformanceMonitor_1.performanceMonitor.mark('high_priority_tasks');
        const highPriorityTasks = this.tasks.filter((t) => t.priority === 'high');
        console.log(`[StartupOptimizer] Running ${highPriorityTasks.length} high priority tasks`);
        // Run after current interactions complete
        react_native_1.InteractionManager.runAfterInteractions(async () => {
            await Promise.all(highPriorityTasks.map(async (task) => {
                try {
                    PerformanceMonitor_1.performanceMonitor.mark(task.name);
                    await task.fn();
                    task.duration = PerformanceMonitor_1.performanceMonitor.measure(task.name, 'startup');
                    task.completed = true;
                }
                catch (error) {
                    task.error = error;
                    console.error(`[StartupOptimizer] High priority task failed: ${task.name}`, error);
                }
            }));
            const duration = PerformanceMonitor_1.performanceMonitor.measure('high_priority_tasks', 'startup');
            console.log(`[StartupOptimizer] High priority tasks completed in ${duration}ms`);
        });
    }
    /**
     * Run deferred tasks (after interactions complete)
     */
    runDeferredTasks() {
        const deferredTasks = this.tasks.filter((t) => t.priority === 'medium' || t.priority === 'low');
        console.log(`[StartupOptimizer] Deferring ${deferredTasks.length} tasks`);
        // Run after all interactions complete and app is idle
        react_native_1.InteractionManager.runAfterInteractions(() => {
            // Further defer to next tick to ensure smooth UI
            setTimeout(async () => {
                PerformanceMonitor_1.performanceMonitor.mark('deferred_tasks');
                for (const task of deferredTasks) {
                    try {
                        PerformanceMonitor_1.performanceMonitor.mark(task.name);
                        await task.fn();
                        task.duration = PerformanceMonitor_1.performanceMonitor.measure(task.name, 'startup');
                        task.completed = true;
                    }
                    catch (error) {
                        task.error = error;
                        console.error(`[StartupOptimizer] Deferred task failed: ${task.name}`, error);
                        // Don't throw - these are non-critical
                    }
                }
                const duration = PerformanceMonitor_1.performanceMonitor.measure('deferred_tasks', 'startup');
                console.log(`[StartupOptimizer] Deferred tasks completed in ${duration}ms`);
            }, 100);
        });
    }
    /**
     * Get startup report
     */
    getReport() {
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
    reset() {
        this.tasks = [];
        this.isInitialized = false;
        this.startTime = Date.now();
    }
}
// Export singleton
exports.startupOptimizer = new StartupOptimizerService();
/**
 * Pre-configured startup tasks
 */
const configureDefaultStartupTasks = () => {
    // Critical: Must complete before showing UI
    exports.startupOptimizer.registerTask('initialize_database', async () => {
        const { initializeDatabase } = await Promise.resolve().then(() => __importStar(require('./Database')));
        await initializeDatabase();
    }, 'critical');
    exports.startupOptimizer.registerTask('restore_apollo_cache', async () => {
        const { restoreCache } = await Promise.resolve().then(() => __importStar(require('./GraphQLClient')));
        await restoreCache();
    }, 'critical');
    exports.startupOptimizer.registerTask('restore_app_state', async () => {
        // App state is restored automatically by Zustand persist
        console.log('[Startup] App state restored');
    }, 'critical');
    // High: Run before first interaction
    exports.startupOptimizer.registerTask('check_network_status', async () => {
        const NetInfo = await Promise.resolve().then(() => __importStar(require('@react-native-community/netinfo')));
        const state = await NetInfo.default.fetch();
        appStore_1.useAppStore.getState().setOnlineStatus(state.isConnected === true && state.isInternetReachable === true);
    }, 'high');
    exports.startupOptimizer.registerTask('request_location_permission', async () => {
        const { requestLocationPermission } = await Promise.resolve().then(() => __importStar(require('./LocationService')));
        await requestLocationPermission();
    }, 'high');
    exports.startupOptimizer.registerTask('register_background_tasks', async () => {
        const { registerBackgroundTasks } = await Promise.resolve().then(() => __importStar(require('./BackgroundTasks')));
        await registerBackgroundTasks();
    }, 'high');
    // Medium: Can be deferred
    exports.startupOptimizer.registerTask('setup_push_notifications', async () => {
        const settings = appStore_1.useAppStore.getState().settings;
        if (settings.notificationsEnabled) {
            const { setupPushNotifications } = await Promise.resolve().then(() => __importStar(require('./NotificationService')));
            await setupPushNotifications();
        }
    }, 'medium');
    exports.startupOptimizer.registerTask('sync_offline_data', async () => {
        const { enhancedOfflineSync } = await Promise.resolve().then(() => __importStar(require('./EnhancedOfflineSync')));
        await enhancedOfflineSync.sync();
    }, 'medium');
    // Low: Non-critical background tasks
    exports.startupOptimizer.registerTask('clean_old_cache', async () => {
        // Clean cache older than 7 days
        console.log('[Startup] Cleaning old cache');
    }, 'low');
    exports.startupOptimizer.registerTask('prefetch_data', async () => {
        // Prefetch commonly used data
        console.log('[Startup] Prefetching data');
    }, 'low');
    exports.startupOptimizer.registerTask('analytics_session_start', async () => {
        const settings = appStore_1.useAppStore.getState().settings;
        if (settings.analyticsEnabled) {
            const analytics = await Promise.resolve().then(() => __importStar(require('@react-native-firebase/analytics')));
            await analytics.default().logEvent('session_start');
        }
    }, 'low');
};
exports.configureDefaultStartupTasks = configureDefaultStartupTasks;
