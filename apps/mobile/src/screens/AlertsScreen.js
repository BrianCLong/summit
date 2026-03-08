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
exports.AlertsScreen = void 0;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const native_1 = require("@react-navigation/native");
const lucide_react_native_1 = require("lucide-react-native");
const date_fns_1 = require("date-fns");
const hooks_1 = require("@/graphql/hooks");
const ui_1 = require("@/components/ui");
const cn_1 = require("@/utils/cn");
const PRIORITY_OPTIONS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
const AlertsScreen = () => {
    const navigation = (0, native_1.useNavigation)();
    const [selectedPriority, setSelectedPriority] = (0, react_1.useState)();
    const [showFilters, setShowFilters] = (0, react_1.useState)(false);
    const { alerts, loading, hasNextPage, loadMore, refetch } = (0, hooks_1.useAlerts)({
        priority: selectedPriority,
        first: 20,
    });
    const { acknowledgeAlert } = (0, hooks_1.useAcknowledgeAlert)();
    const { markAlertRead } = (0, hooks_1.useMarkAlertRead)();
    const [refreshing, setRefreshing] = (0, react_1.useState)(false);
    const onRefresh = (0, react_1.useCallback)(async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    }, [refetch]);
    const handleAlertPress = (0, react_1.useCallback)(async (alert) => {
        if (!alert.isRead) {
            await markAlertRead(alert.id);
        }
        navigation.navigate('AlertDetails', { alertId: alert.id });
    }, [markAlertRead, navigation]);
    const handleAcknowledge = (0, react_1.useCallback)(async (alertId) => {
        await acknowledgeAlert(alertId);
    }, [acknowledgeAlert]);
    const renderAlert = (0, react_1.useCallback)(({ item: alert }) => (<react_native_1.TouchableOpacity onPress={() => handleAlertPress(alert)} activeOpacity={0.7} className="mb-3">
        <ui_1.Card className={(0, cn_1.cn)(!alert.isRead && 'border-intel-600/50')}>
          <ui_1.CardContent>
            <react_native_1.View className="flex-row items-start justify-between">
              <react_native_1.View className="flex-1">
                <react_native_1.View className="flex-row items-center gap-2 mb-2">
                  <ui_1.PriorityBadge priority={alert.priority}/>
                  {!alert.isRead && (<ui_1.Badge variant="primary" size="sm">
                      NEW
                    </ui_1.Badge>)}
                  {alert.isAcknowledged && (<lucide_react_native_1.CheckCircle size={14} color="#22c55e"/>)}
                </react_native_1.View>

                <ui_1.Text weight="semibold" numberOfLines={2}>
                  {alert.title}
                </ui_1.Text>

                <ui_1.Text size="sm" variant="muted" numberOfLines={3} className="mt-1">
                  {alert.description}
                </ui_1.Text>

                <react_native_1.View className="flex-row items-center mt-3 gap-4">
                  <react_native_1.View className="flex-row items-center">
                    <lucide_react_native_1.Clock size={12} color="#71717a"/>
                    <ui_1.Text size="xs" variant="muted" className="ml-1">
                      {(0, date_fns_1.formatDistanceToNow)(new Date(alert.timestamp), { addSuffix: true })}
                    </ui_1.Text>
                  </react_native_1.View>

                  {alert.location && (<react_native_1.View className="flex-row items-center">
                      <lucide_react_native_1.MapPin size={12} color="#71717a"/>
                      <ui_1.Text size="xs" variant="muted" className="ml-1" numberOfLines={1}>
                        {alert.location.name || 'View on map'}
                      </ui_1.Text>
                    </react_native_1.View>)}

                  <ui_1.Text size="xs" variant="muted">
                    {alert.source}
                  </ui_1.Text>
                </react_native_1.View>
              </react_native_1.View>
            </react_native_1.View>

            {!alert.isAcknowledged && (<react_native_1.View className="flex-row mt-4 gap-2">
                <ui_1.Button variant="secondary" size="sm" onPress={() => handleAcknowledge(alert.id)} className="flex-1">
                  Acknowledge
                </ui_1.Button>
                {alert.location && (<ui_1.Button variant="outline" size="sm" onPress={() => navigation.navigate('MapFullScreen', {
                    centerOn: {
                        lat: alert.location.latitude,
                        lng: alert.location.longitude,
                    },
                })} leftIcon={<lucide_react_native_1.MapPin size={14} color="#fff"/>}>
                    Map
                  </ui_1.Button>)}
              </react_native_1.View>)}
          </ui_1.CardContent>
        </ui_1.Card>
      </react_native_1.TouchableOpacity>), [handleAlertPress, handleAcknowledge, navigation]);
    const renderEmpty = () => (<react_native_1.View className="flex-1 items-center justify-center py-20">
      <lucide_react_native_1.Bell size={48} color="#71717a"/>
      <ui_1.Text size="lg" weight="medium" className="mt-4">
        No alerts
      </ui_1.Text>
      <ui_1.Text variant="muted" className="mt-1 text-center px-8">
        {selectedPriority
            ? `No ${selectedPriority.toLowerCase()} priority alerts found`
            : 'All clear! No active alerts at this time'}
      </ui_1.Text>
    </react_native_1.View>);
    return (<react_native_safe_area_context_1.SafeAreaView className="flex-1 bg-dark-bg">
      {/* Header */}
      <react_native_1.View className="flex-row items-center justify-between px-4 py-3 border-b border-dark-border">
        <ui_1.Text size="xl" weight="bold">
          OSINT Alerts
        </ui_1.Text>
        <react_native_1.TouchableOpacity onPress={() => setShowFilters(true)} className={(0, cn_1.cn)('flex-row items-center px-3 py-2 rounded-lg', selectedPriority ? 'bg-intel-600/20' : 'bg-dark-elevated')}>
          <lucide_react_native_1.Filter size={16} color={selectedPriority ? '#0ea5e9' : '#fff'}/>
          <ui_1.Text size="sm" className={(0, cn_1.cn)('ml-2', selectedPriority && 'text-intel-400')}>
            {selectedPriority || 'Filter'}
          </ui_1.Text>
        </react_native_1.TouchableOpacity>
      </react_native_1.View>

      {/* Active filter indicator */}
      {selectedPriority && (<react_native_1.View className="px-4 py-2 bg-dark-surface border-b border-dark-border">
          <react_native_1.View className="flex-row items-center">
            <ui_1.Text size="sm" variant="muted">
              Filtering by:
            </ui_1.Text>
            <ui_1.Chip variant="primary" className="ml-2" onRemove={() => setSelectedPriority(undefined)}>
              {selectedPriority}
            </ui_1.Chip>
          </react_native_1.View>
        </react_native_1.View>)}

      {/* Alert list */}
      <react_native_1.FlatList data={alerts} renderItem={renderAlert} keyExtractor={(item) => item.id} contentContainerStyle={{ padding: 16, flexGrow: 1 }} ListEmptyComponent={loading ? null : renderEmpty} ListFooterComponent={loading ? (<react_native_1.View>
              {[1, 2, 3].map((i) => (<ui_1.SkeletonListItem key={i} className="mb-3"/>))}
            </react_native_1.View>) : null} onEndReached={hasNextPage ? loadMore : undefined} onEndReachedThreshold={0.5} refreshControl={<react_native_1.RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0ea5e9"/>}/>

      {/* Filter Bottom Sheet */}
      <ui_1.BottomSheet open={showFilters} onClose={() => setShowFilters(false)} title="Filter Alerts" snapPoints={[0.4]}>
        <react_native_1.View className="py-4">
          <ui_1.Text weight="medium" className="mb-3">
            Priority Level
          </ui_1.Text>
          <ui_1.ChipGroup options={PRIORITY_OPTIONS} selected={selectedPriority ? [selectedPriority] : []} onSelectionChange={(selected) => setSelectedPriority(selected[0])}/>

          <react_native_1.View className="flex-row mt-6 gap-3">
            <ui_1.Button variant="outline" className="flex-1" onPress={() => {
            setSelectedPriority(undefined);
            setShowFilters(false);
        }}>
              Clear
            </ui_1.Button>
            <ui_1.Button className="flex-1" onPress={() => setShowFilters(false)}>
              Apply
            </ui_1.Button>
          </react_native_1.View>
        </react_native_1.View>
      </ui_1.BottomSheet>
    </react_native_safe_area_context_1.SafeAreaView>);
};
exports.AlertsScreen = AlertsScreen;
