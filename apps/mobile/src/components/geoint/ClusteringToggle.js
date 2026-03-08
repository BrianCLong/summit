"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClusteringToggle = void 0;
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const lucide_react_native_1 = require("lucide-react-native");
const cn_1 = require("@/utils/cn");
const ClusteringToggle = ({ enabled, onToggle, featureFlagEnabled = true, }) => {
    if (!featureFlagEnabled)
        return null;
    return (<react_native_1.View className="bg-dark-surface rounded-xl border border-dark-border px-4 py-3 flex-row items-center justify-between">
      <react_native_1.View>
        <react_native_1.Text className="text-white font-semibold">Clustering</react_native_1.Text>
        <react_native_1.Text className="text-xs text-gray-400">Toggle dynamic clustering</react_native_1.Text>
      </react_native_1.View>
      <react_native_1.TouchableOpacity accessibilityLabel="Toggle clustering" onPress={onToggle} className={(0, cn_1.cn)('p-2 rounded-full border', enabled ? 'border-intel-400 bg-intel-600/20' : 'border-dark-border bg-dark-elevated')}>
        {enabled ? <lucide_react_native_1.ToggleRight size={24} color="#0ea5e9"/> : <lucide_react_native_1.ToggleLeft size={24} color="#94a3b8"/>}
      </react_native_1.TouchableOpacity>
    </react_native_1.View>);
};
exports.ClusteringToggle = ClusteringToggle;
