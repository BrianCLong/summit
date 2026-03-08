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
exports.InvestigationsScreen = void 0;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const native_1 = require("@react-navigation/native");
const lucide_react_native_1 = require("lucide-react-native");
const date_fns_1 = require("date-fns");
const hooks_1 = require("@/graphql/hooks");
const ui_1 = require("@/components/ui");
const cn_1 = require("@/utils/cn");
const STATUS_COLORS = {
    DRAFT: { bg: 'bg-slate-600/20', text: 'text-slate-400' },
    ACTIVE: { bg: 'bg-green-600/20', text: 'text-green-400' },
    ON_HOLD: { bg: 'bg-amber-600/20', text: 'text-amber-400' },
    CLOSED: { bg: 'bg-dark-muted/20', text: 'text-dark-muted' },
    ARCHIVED: { bg: 'bg-dark-muted/20', text: 'text-dark-muted' },
};
const InvestigationsScreen = () => {
    const navigation = (0, native_1.useNavigation)();
    const [statusFilter, setStatusFilter] = (0, react_1.useState)();
    const { investigations, loading, hasNextPage, loadMore, refetch } = (0, hooks_1.useInvestigations)({
        filter: statusFilter ? { status: statusFilter } : undefined,
        first: 20,
    });
    const [refreshing, setRefreshing] = (0, react_1.useState)(false);
    const onRefresh = (0, react_1.useCallback)(async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    }, [refetch]);
    const renderInvestigation = (0, react_1.useCallback)(({ item: investigation }) => {
        const statusStyle = STATUS_COLORS[investigation.status] || STATUS_COLORS.DRAFT;
        return (<react_native_1.TouchableOpacity onPress={() => navigation.navigate('InvestigationDetails', {
                investigationId: investigation.id,
            })} activeOpacity={0.7} className="mb-3">
          <ui_1.Card>
            <ui_1.CardContent>
              {/* Header */}
              <react_native_1.View className="flex-row items-start justify-between mb-3">
                <react_native_1.View className="flex-row items-center gap-2">
                  <ui_1.ClassificationBadge classification={investigation.classification}/>
                  <react_native_1.View className={(0, cn_1.cn)('px-2 py-0.5 rounded', statusStyle.bg)}>
                    <ui_1.Text size="xs" className={statusStyle.text}>
                      {investigation.status}
                    </ui_1.Text>
                  </react_native_1.View>
                </react_native_1.View>
                <ui_1.PriorityBadge priority={investigation.priority}/>
              </react_native_1.View>

              {/* Title & Description */}
              <ui_1.Text size="lg" weight="semibold" numberOfLines={2}>
                {investigation.title}
              </ui_1.Text>
              {investigation.description && (<ui_1.Text size="sm" variant="muted" numberOfLines={2} className="mt-1">
                  {investigation.description}
                </ui_1.Text>)}

              {/* Stats */}
              <react_native_1.View className="flex-row items-center gap-4 mt-4">
                <react_native_1.View className="flex-row items-center">
                  <lucide_react_native_1.Users size={14} color="#71717a"/>
                  <ui_1.Text size="sm" variant="muted" className="ml-1">
                    {investigation.entityCount} entities
                  </ui_1.Text>
                </react_native_1.View>
                <react_native_1.View className="flex-row items-center">
                  <lucide_react_native_1.Link2 size={14} color="#71717a"/>
                  <ui_1.Text size="sm" variant="muted" className="ml-1">
                    {investigation.relationshipCount} relationships
                  </ui_1.Text>
                </react_native_1.View>
              </react_native_1.View>

              {/* Footer */}
              <react_native_1.View className="flex-row items-center justify-between mt-4 pt-3 border-t border-dark-border">
                <react_native_1.View className="flex-row items-center">
                  {investigation.team && investigation.team.length > 0 ? (<ui_1.AvatarGroup avatars={investigation.team.map((member) => ({
                    fallback: member,
                }))} max={3} size="sm"/>) : (<ui_1.Avatar fallback={investigation.leadAnalyst} size="sm"/>)}
                  <ui_1.Text size="xs" variant="muted" className="ml-2">
                    {investigation.leadAnalyst}
                  </ui_1.Text>
                </react_native_1.View>

                <react_native_1.View className="flex-row items-center">
                  <lucide_react_native_1.Calendar size={12} color="#71717a"/>
                  <ui_1.Text size="xs" variant="muted" className="ml-1">
                    {(0, date_fns_1.formatDistanceToNow)(new Date(investigation.updatedAt), {
                addSuffix: true,
            })}
                  </ui_1.Text>
                </react_native_1.View>
              </react_native_1.View>

              {/* Due date warning */}
              {investigation.dueDate && (<react_native_1.View className={(0, cn_1.cn)('mt-3 px-3 py-2 rounded-lg', new Date(investigation.dueDate) < new Date()
                    ? 'bg-red-600/20'
                    : 'bg-amber-600/10')}>
                  <ui_1.Text size="xs" className={new Date(investigation.dueDate) < new Date()
                    ? 'text-red-400'
                    : 'text-amber-400'}>
                    Due: {new Date(investigation.dueDate).toLocaleDateString()}
                  </ui_1.Text>
                </react_native_1.View>)}
            </ui_1.CardContent>
          </ui_1.Card>
        </react_native_1.TouchableOpacity>);
    }, [navigation]);
    const renderEmpty = () => (<react_native_1.View className="flex-1 items-center justify-center py-20">
      <lucide_react_native_1.FileText size={48} color="#71717a"/>
      <ui_1.Text size="lg" weight="medium" className="mt-4">
        No investigations
      </ui_1.Text>
      <ui_1.Text variant="muted" className="mt-1 text-center px-8">
        Create your first investigation to get started
      </ui_1.Text>
      <ui_1.Button className="mt-6" leftIcon={<lucide_react_native_1.Plus size={16} color="#fff"/>}>
        New Investigation
      </ui_1.Button>
    </react_native_1.View>);
    return (<react_native_safe_area_context_1.SafeAreaView className="flex-1 bg-dark-bg">
      {/* Header */}
      <react_native_1.View className="flex-row items-center justify-between px-4 py-3 border-b border-dark-border">
        <ui_1.Text size="xl" weight="bold">
          Investigations
        </ui_1.Text>
        <react_native_1.View className="flex-row items-center gap-2">
          <react_native_1.TouchableOpacity className="w-10 h-10 rounded-full bg-dark-elevated items-center justify-center">
            <lucide_react_native_1.Filter size={18} color="#fff"/>
          </react_native_1.TouchableOpacity>
          <react_native_1.TouchableOpacity className="w-10 h-10 rounded-full bg-intel-600 items-center justify-center">
            <lucide_react_native_1.Plus size={20} color="#fff"/>
          </react_native_1.TouchableOpacity>
        </react_native_1.View>
      </react_native_1.View>

      {/* Status filter tabs */}
      <react_native_1.View className="flex-row px-4 py-3 border-b border-dark-border">
        {['All', 'ACTIVE', 'DRAFT', 'ON_HOLD', 'CLOSED'].map((status) => (<react_native_1.TouchableOpacity key={status} onPress={() => setStatusFilter(status === 'All' ? undefined : status)} className={(0, cn_1.cn)('px-4 py-2 rounded-full mr-2', (status === 'All' && !statusFilter) || statusFilter === status
                ? 'bg-intel-600'
                : 'bg-dark-elevated')}>
            <ui_1.Text size="sm">
              {status === 'All' ? 'All' : status.replace('_', ' ')}
            </ui_1.Text>
          </react_native_1.TouchableOpacity>))}
      </react_native_1.View>

      {/* Investigation list */}
      <react_native_1.FlatList data={investigations} renderItem={renderInvestigation} keyExtractor={(item) => item.id} contentContainerStyle={{ padding: 16, flexGrow: 1 }} ListEmptyComponent={loading ? null : renderEmpty} ListFooterComponent={loading ? (<react_native_1.View>
              {[1, 2, 3].map((i) => (<ui_1.SkeletonCard key={i} className="mb-3"/>))}
            </react_native_1.View>) : null} onEndReached={hasNextPage ? loadMore : undefined} onEndReachedThreshold={0.5} refreshControl={<react_native_1.RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0ea5e9"/>}/>
    </react_native_safe_area_context_1.SafeAreaView>);
};
exports.InvestigationsScreen = InvestigationsScreen;
