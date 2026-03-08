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
exports.DashboardScreen = void 0;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const native_1 = require("@react-navigation/native");
const lucide_react_native_1 = require("lucide-react-native");
const hooks_1 = require("@/graphql/hooks");
const appStore_1 = require("@/stores/appStore");
const ui_1 = require("@/components/ui");
const cn_1 = require("@/utils/cn");
const DashboardScreen = () => {
    const navigation = (0, native_1.useNavigation)();
    const { stats, loading, refetch } = (0, hooks_1.useDashboardStats)();
    const { alerts } = (0, hooks_1.useAlerts)({ first: 5 });
    const { user, syncStatus, offlineMode } = (0, appStore_1.useAppStore)();
    const [refreshing, setRefreshing] = react_1.default.useState(false);
    const onRefresh = (0, react_1.useCallback)(async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    }, [refetch]);
    const quickStats = [
        {
            label: 'Entities',
            value: stats?.totalEntities || 0,
            icon: lucide_react_native_1.Users,
            color: 'text-intel-400',
            bgColor: 'bg-intel-600/20',
        },
        {
            label: 'Investigations',
            value: stats?.totalInvestigations || 0,
            icon: lucide_react_native_1.FileText,
            color: 'text-purple-400',
            bgColor: 'bg-purple-600/20',
        },
        {
            label: 'Active Alerts',
            value: stats?.activeAlerts || 0,
            icon: lucide_react_native_1.AlertTriangle,
            color: 'text-amber-400',
            bgColor: 'bg-amber-600/20',
        },
        {
            label: 'Pending Tasks',
            value: stats?.pendingTasks || 0,
            icon: lucide_react_native_1.Activity,
            color: 'text-green-400',
            bgColor: 'bg-green-600/20',
        },
    ];
    return (<react_native_safe_area_context_1.SafeAreaView className="flex-1 bg-dark-bg">
      {/* Header */}
      <react_native_1.View className="flex-row items-center justify-between px-4 py-3">
        <react_native_1.View className="flex-row items-center">
          <ui_1.Avatar src={user?.avatar} fallback={user?.name} size="default" online={!offlineMode}/>
          <react_native_1.View className="ml-3">
            <ui_1.Text size="sm" variant="muted">
              Welcome back,
            </ui_1.Text>
            <ui_1.Text size="lg" weight="semibold">
              {user?.name || 'Analyst'}
            </ui_1.Text>
          </react_native_1.View>
        </react_native_1.View>
        <react_native_1.View className="flex-row items-center gap-2">
          <react_native_1.TouchableOpacity onPress={() => navigation.navigate('Search')} className="w-10 h-10 rounded-full bg-dark-elevated items-center justify-center">
            <lucide_react_native_1.Search size={20} color="#fff"/>
          </react_native_1.TouchableOpacity>
          <react_native_1.TouchableOpacity onPress={() => navigation.navigate('Notifications')} className="w-10 h-10 rounded-full bg-dark-elevated items-center justify-center relative">
            <lucide_react_native_1.Bell size={20} color="#fff"/>
            {(stats?.activeAlerts || 0) > 0 && (<react_native_1.View className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full items-center justify-center">
                <ui_1.Text size="xs" weight="bold">
                  {stats?.activeAlerts > 9 ? '9+' : stats?.activeAlerts}
                </ui_1.Text>
              </react_native_1.View>)}
          </react_native_1.TouchableOpacity>
        </react_native_1.View>
      </react_native_1.View>

      {/* Offline Banner */}
      {offlineMode && (<react_native_1.View className="bg-amber-600/20 border-b border-amber-600/50 px-4 py-2">
          <ui_1.Text size="sm" className="text-amber-400 text-center">
            You're offline. Changes will sync when connected.
          </ui_1.Text>
        </react_native_1.View>)}

      <react_native_1.ScrollView className="flex-1" contentContainerClassName="px-4 pb-6" refreshControl={<react_native_1.RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0ea5e9"/>}>
        {/* Quick Stats */}
        <react_native_1.View className="flex-row flex-wrap mt-4 -mx-1">
          {loading
            ? [1, 2, 3, 4].map((i) => (<react_native_1.View key={i} className="w-1/2 px-1 mb-2">
                  <ui_1.Skeleton className="h-24 rounded-xl"/>
                </react_native_1.View>))
            : quickStats.map((stat, index) => (<react_native_1.View key={index} className="w-1/2 px-1 mb-2">
                  <ui_1.Card className="h-24">
                    <ui_1.CardContent className="flex-1 justify-between py-3">
                      <react_native_1.View className={(0, cn_1.cn)('w-8 h-8 rounded-lg items-center justify-center', stat.bgColor)}>
                        <stat.icon size={18} color={stat.color.replace('text-', '#').replace('-400', '')}/>
                      </react_native_1.View>
                      <react_native_1.View>
                        <ui_1.Text size="2xl" weight="bold">
                          {stat.value.toLocaleString()}
                        </ui_1.Text>
                        <ui_1.Text size="xs" variant="muted">
                          {stat.label}
                        </ui_1.Text>
                      </react_native_1.View>
                    </ui_1.CardContent>
                  </ui_1.Card>
                </react_native_1.View>))}
        </react_native_1.View>

        {/* Recent Alerts */}
        <react_native_1.View className="mt-6">
          <react_native_1.View className="flex-row items-center justify-between mb-3">
            <ui_1.Text size="lg" weight="semibold">
              Recent Alerts
            </ui_1.Text>
            <react_native_1.TouchableOpacity onPress={() => navigation.navigate('Alerts')}>
              <ui_1.Text size="sm" variant="primary">
                View All
              </ui_1.Text>
            </react_native_1.TouchableOpacity>
          </react_native_1.View>

          {loading ? (<ui_1.SkeletonCard />) : alerts.length === 0 ? (<ui_1.Card>
              <ui_1.CardContent className="items-center py-8">
                <lucide_react_native_1.AlertTriangle size={32} color="#71717a"/>
                <ui_1.Text variant="muted" className="mt-2">
                  No active alerts
                </ui_1.Text>
              </ui_1.CardContent>
            </ui_1.Card>) : (<ui_1.Card>
              {alerts.map((alert, index) => (<react_native_1.TouchableOpacity key={alert.id} onPress={() => navigation.navigate('AlertDetails', { alertId: alert.id })} className={(0, cn_1.cn)('p-4', index < alerts.length - 1 && 'border-b border-dark-border')}>
                  <react_native_1.View className="flex-row items-start">
                    <react_native_1.View className="flex-1">
                      <react_native_1.View className="flex-row items-center gap-2 mb-1">
                        <ui_1.PriorityBadge priority={alert.priority}/>
                        {!alert.isRead && (<react_native_1.View className="w-2 h-2 bg-intel-500 rounded-full"/>)}
                      </react_native_1.View>
                      <ui_1.Text weight="medium" numberOfLines={1}>
                        {alert.title}
                      </ui_1.Text>
                      <ui_1.Text size="sm" variant="muted" numberOfLines={2} className="mt-1">
                        {alert.description}
                      </ui_1.Text>
                      <react_native_1.View className="flex-row items-center mt-2 gap-3">
                        <ui_1.Text size="xs" variant="muted">
                          {alert.source}
                        </ui_1.Text>
                        {alert.location && (<react_native_1.View className="flex-row items-center">
                            <lucide_react_native_1.MapPin size={12} color="#71717a"/>
                            <ui_1.Text size="xs" variant="muted" className="ml-1">
                              {alert.location.name || 'Location'}
                            </ui_1.Text>
                          </react_native_1.View>)}
                      </react_native_1.View>
                    </react_native_1.View>
                  </react_native_1.View>
                </react_native_1.TouchableOpacity>))}
            </ui_1.Card>)}
        </react_native_1.View>

        {/* Entity Breakdown */}
        {stats?.entityBreakdown && stats.entityBreakdown.length > 0 && (<react_native_1.View className="mt-6">
            <ui_1.Text size="lg" weight="semibold" className="mb-3">
              Entity Distribution
            </ui_1.Text>
            <ui_1.Card>
              <ui_1.CardContent>
                {stats.entityBreakdown.slice(0, 5).map((item, index) => (<react_native_1.View key={item.type} className={(0, cn_1.cn)('flex-row items-center justify-between py-3', index < Math.min(stats.entityBreakdown.length, 5) - 1 &&
                    'border-b border-dark-border')}>
                    <ui_1.Text>{item.type}</ui_1.Text>
                    <react_native_1.View className="flex-row items-center gap-3">
                      <react_native_1.View className="w-24 h-2 bg-dark-elevated rounded-full overflow-hidden">
                        <react_native_1.View style={{
                    width: `${(item.count / stats.totalEntities) * 100}%`,
                }} className="h-full bg-intel-500 rounded-full"/>
                      </react_native_1.View>
                      <ui_1.Text size="sm" variant="muted" className="w-12 text-right">
                        {item.count}
                      </ui_1.Text>
                    </react_native_1.View>
                  </react_native_1.View>))}
              </ui_1.CardContent>
            </ui_1.Card>
          </react_native_1.View>)}

        {/* Sync Status */}
        {syncStatus.pendingChanges > 0 && (<react_native_1.View className="mt-6">
            <ui_1.Card className="bg-intel-600/10 border-intel-600/30">
              <ui_1.CardContent className="flex-row items-center">
                <lucide_react_native_1.Activity size={20} color="#0ea5e9"/>
                <react_native_1.View className="ml-3 flex-1">
                  <ui_1.Text size="sm">
                    {syncStatus.pendingChanges} changes pending sync
                  </ui_1.Text>
                  {syncStatus.lastSyncAt && (<ui_1.Text size="xs" variant="muted">
                      Last synced: {new Date(syncStatus.lastSyncAt).toLocaleTimeString()}
                    </ui_1.Text>)}
                </react_native_1.View>
              </ui_1.CardContent>
            </ui_1.Card>
          </react_native_1.View>)}
      </react_native_1.ScrollView>
    </react_native_safe_area_context_1.SafeAreaView>);
};
exports.DashboardScreen = DashboardScreen;
