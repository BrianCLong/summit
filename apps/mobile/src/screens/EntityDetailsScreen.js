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
exports.EntityDetailsScreen = void 0;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const native_1 = require("@react-navigation/native");
const lucide_react_native_1 = require("lucide-react-native");
const date_fns_1 = require("date-fns");
const hooks_1 = require("@/graphql/hooks");
const ui_1 = require("@/components/ui");
const cn_1 = require("@/utils/cn");
const EntityDetailsScreen = () => {
    const navigation = (0, native_1.useNavigation)();
    const route = (0, native_1.useRoute)();
    const { entityId } = route.params;
    const { entity, loading, error } = (0, hooks_1.useEntity)(entityId);
    const handleShare = (0, react_1.useCallback)(async () => {
        if (!entity)
            return;
        try {
            await react_native_1.Share.share({
                message: `Entity: ${entity.name}\nType: ${entity.type}\nClassification: ${entity.classification}`,
                title: entity.name,
            });
        }
        catch (err) {
            console.error('Share failed:', err);
        }
    }, [entity]);
    const handleViewOnMap = (0, react_1.useCallback)(() => {
        if (entity?.location) {
            navigation.navigate('MapFullScreen', {
                centerOn: {
                    lat: entity.location.latitude,
                    lng: entity.location.longitude,
                },
            });
        }
    }, [entity, navigation]);
    if (loading) {
        return (<react_native_safe_area_context_1.SafeAreaView className="flex-1 bg-dark-bg">
        <react_native_1.View className="px-4 py-3">
          <ui_1.SkeletonCard />
        </react_native_1.View>
      </react_native_safe_area_context_1.SafeAreaView>);
    }
    if (error || !entity) {
        return (<react_native_safe_area_context_1.SafeAreaView className="flex-1 bg-dark-bg items-center justify-center">
        <ui_1.Text variant="muted">Entity not found</ui_1.Text>
        <ui_1.Button variant="outline" className="mt-4" onPress={() => navigation.goBack()}>
          Go Back
        </ui_1.Button>
      </react_native_safe_area_context_1.SafeAreaView>);
    }
    return (<react_native_safe_area_context_1.SafeAreaView className="flex-1 bg-dark-bg">
      {/* Header */}
      <react_native_1.View className="flex-row items-center justify-between px-4 py-3 border-b border-dark-border">
        <react_native_1.TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 rounded-full bg-dark-elevated items-center justify-center">
          <lucide_react_native_1.ArrowLeft size={20} color="#fff"/>
        </react_native_1.TouchableOpacity>
        <react_native_1.View className="flex-row items-center gap-2">
          <react_native_1.TouchableOpacity onPress={handleShare} className="w-10 h-10 rounded-full bg-dark-elevated items-center justify-center">
            <lucide_react_native_1.Share2 size={18} color="#fff"/>
          </react_native_1.TouchableOpacity>
          <react_native_1.TouchableOpacity className="w-10 h-10 rounded-full bg-dark-elevated items-center justify-center">
            <lucide_react_native_1.MoreVertical size={18} color="#fff"/>
          </react_native_1.TouchableOpacity>
        </react_native_1.View>
      </react_native_1.View>

      <react_native_1.ScrollView className="flex-1" contentContainerClassName="px-4 py-4">
        {/* Entity Header Card */}
        <ui_1.Card>
          <ui_1.CardContent>
            <react_native_1.View className="flex-row items-start justify-between">
              <react_native_1.View className="flex-1">
                <react_native_1.View className="flex-row items-center gap-2 mb-2">
                  <ui_1.EntityTypeBadge type={entity.type}/>
                  <ui_1.ClassificationBadge classification={entity.classification}/>
                </react_native_1.View>
                <ui_1.Text size="2xl" weight="bold">
                  {entity.name}
                </ui_1.Text>
                {entity.description && (<ui_1.Text variant="muted" className="mt-2">
                    {entity.description}
                  </ui_1.Text>)}
              </react_native_1.View>
            </react_native_1.View>

            {/* Confidence Score */}
            <react_native_1.View className="mt-4">
              <react_native_1.View className="flex-row items-center justify-between mb-1">
                <ui_1.Text size="sm" variant="muted">
                  Confidence Score
                </ui_1.Text>
                <ui_1.Text size="sm" weight="semibold">
                  {entity.confidence}%
                </ui_1.Text>
              </react_native_1.View>
              <ui_1.ProgressBar value={entity.confidence} variant={entity.confidence >= 80
            ? 'success'
            : entity.confidence >= 50
                ? 'warning'
                : 'destructive'}/>
            </react_native_1.View>

            {/* Priority */}
            {entity.priority && (<react_native_1.View className="flex-row items-center mt-4">
                <lucide_react_native_1.Shield size={16} color="#71717a"/>
                <ui_1.Text size="sm" variant="muted" className="ml-2">
                  Priority:
                </ui_1.Text>
                <ui_1.PriorityBadge priority={entity.priority} className="ml-2"/>
              </react_native_1.View>)}
          </ui_1.CardContent>
        </ui_1.Card>

        {/* Location */}
        {entity.location && (<ui_1.Card className="mt-4">
            <ui_1.CardHeader>
              <react_native_1.View className="flex-row items-center">
                <lucide_react_native_1.MapPin size={18} color="#0ea5e9"/>
                <ui_1.Text size="lg" weight="semibold" className="ml-2">
                  Location
                </ui_1.Text>
              </react_native_1.View>
            </ui_1.CardHeader>
            <ui_1.CardContent>
              <react_native_1.View className="flex-row items-center justify-between">
                <react_native_1.View>
                  <ui_1.Text size="sm" variant="muted">
                    Coordinates
                  </ui_1.Text>
                  <ui_1.Text>
                    {entity.location.latitude.toFixed(6)}, {entity.location.longitude.toFixed(6)}
                  </ui_1.Text>
                  {entity.location.accuracy && (<ui_1.Text size="xs" variant="muted">
                      Accuracy: {entity.location.accuracy}m
                    </ui_1.Text>)}
                </react_native_1.View>
                <ui_1.Button variant="outline" size="sm" onPress={handleViewOnMap}>
                  View on Map
                </ui_1.Button>
              </react_native_1.View>
            </ui_1.CardContent>
          </ui_1.Card>)}

        {/* Relationships */}
        {entity.relationships && entity.relationships.length > 0 && (<ui_1.Card className="mt-4">
            <ui_1.CardHeader>
              <react_native_1.View className="flex-row items-center justify-between">
                <react_native_1.View className="flex-row items-center">
                  <lucide_react_native_1.Link2 size={18} color="#0ea5e9"/>
                  <ui_1.Text size="lg" weight="semibold" className="ml-2">
                    Relationships
                  </ui_1.Text>
                </react_native_1.View>
                <ui_1.Badge>{entity.relationships.length}</ui_1.Badge>
              </react_native_1.View>
            </ui_1.CardHeader>
            <ui_1.CardContent>
              {entity.relationships.slice(0, 5).map((rel, index) => (<react_native_1.TouchableOpacity key={rel.id} onPress={() => navigation.navigate('EntityDetails', {
                    entityId: rel.targetId,
                })} className={(0, cn_1.cn)('flex-row items-center justify-between py-3', index < Math.min(entity.relationships.length, 5) - 1 &&
                    'border-b border-dark-border')}>
                  <react_native_1.View className="flex-row items-center flex-1">
                    <ui_1.Avatar fallback={rel.target?.name} size="sm"/>
                    <react_native_1.View className="ml-3 flex-1">
                      <ui_1.Text numberOfLines={1}>{rel.target?.name || 'Unknown'}</ui_1.Text>
                      <ui_1.Text size="xs" variant="muted">
                        {rel.type.replace(/_/g, ' ')}
                      </ui_1.Text>
                    </react_native_1.View>
                  </react_native_1.View>
                  <react_native_1.View className="flex-row items-center">
                    <ui_1.Text size="xs" variant="muted">
                      {rel.confidence}%
                    </ui_1.Text>
                    <lucide_react_native_1.ExternalLink size={14} color="#71717a" className="ml-2"/>
                  </react_native_1.View>
                </react_native_1.TouchableOpacity>))}
              {entity.relationships.length > 5 && (<ui_1.Button variant="ghost" size="sm" className="mt-2">
                  View all {entity.relationships.length} relationships
                </ui_1.Button>)}
            </ui_1.CardContent>
          </ui_1.Card>)}

        {/* Tags */}
        {entity.tags && entity.tags.length > 0 && (<ui_1.Card className="mt-4">
            <ui_1.CardHeader>
              <react_native_1.View className="flex-row items-center">
                <lucide_react_native_1.Tag size={18} color="#0ea5e9"/>
                <ui_1.Text size="lg" weight="semibold" className="ml-2">
                  Tags
                </ui_1.Text>
              </react_native_1.View>
            </ui_1.CardHeader>
            <ui_1.CardContent>
              <react_native_1.View className="flex-row flex-wrap gap-2">
                {entity.tags.map((tag) => (<ui_1.Badge key={tag} variant="secondary">
                    {tag}
                  </ui_1.Badge>))}
              </react_native_1.View>
            </ui_1.CardContent>
          </ui_1.Card>)}

        {/* Metadata */}
        {entity.metadata && Object.keys(entity.metadata).length > 0 && (<ui_1.Card className="mt-4">
            <ui_1.Accordion items={[
                {
                    id: 'metadata',
                    title: 'Additional Metadata',
                    content: (<react_native_1.View>
                      {Object.entries(entity.metadata).map(([key, value]) => (<react_native_1.View key={key} className="flex-row justify-between py-2 border-b border-dark-border">
                          <ui_1.Text size="sm" variant="muted">
                            {key}
                          </ui_1.Text>
                          <ui_1.Text size="sm">{String(value)}</ui_1.Text>
                        </react_native_1.View>))}
                    </react_native_1.View>),
                },
            ]}/>
          </ui_1.Card>)}

        {/* Timestamps */}
        <react_native_1.View className="mt-6 mb-4">
          <react_native_1.View className="flex-row items-center justify-between">
            <react_native_1.View className="flex-row items-center">
              <lucide_react_native_1.Calendar size={14} color="#71717a"/>
              <ui_1.Text size="xs" variant="muted" className="ml-1">
                Created {(0, date_fns_1.formatDistanceToNow)(new Date(entity.createdAt), { addSuffix: true })}
              </ui_1.Text>
            </react_native_1.View>
            <ui_1.Text size="xs" variant="muted">
              Updated {(0, date_fns_1.formatDistanceToNow)(new Date(entity.updatedAt), { addSuffix: true })}
            </ui_1.Text>
          </react_native_1.View>
        </react_native_1.View>
      </react_native_1.ScrollView>
    </react_native_safe_area_context_1.SafeAreaView>);
};
exports.EntityDetailsScreen = EntityDetailsScreen;
