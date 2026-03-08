"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityMarkerMini = exports.EntityMarker = void 0;
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const lucide_react_native_1 = require("lucide-react-native");
const entityIcons = {
    PERSON: lucide_react_native_1.User,
    ORGANIZATION: lucide_react_native_1.Building2,
    LOCATION: lucide_react_native_1.MapPin,
    EVENT: lucide_react_native_1.Calendar,
    DOCUMENT: lucide_react_native_1.FileText,
    THREAT: lucide_react_native_1.AlertTriangle,
    VEHICLE: lucide_react_native_1.Car,
    DEVICE: lucide_react_native_1.Smartphone,
    FINANCIAL: lucide_react_native_1.Wallet,
    COMMUNICATION: lucide_react_native_1.MessageCircle,
};
const entityColors = {
    PERSON: '#8b5cf6',
    ORGANIZATION: '#06b6d4',
    LOCATION: '#10b981',
    EVENT: '#f97316',
    DOCUMENT: '#6366f1',
    THREAT: '#ef4444',
    VEHICLE: '#64748b',
    DEVICE: '#0891b2',
    FINANCIAL: '#059669',
    COMMUNICATION: '#4f46e5',
};
const sizes = {
    sm: { container: 28, icon: 14 },
    md: { container: 36, icon: 18 },
    lg: { container: 44, icon: 22 },
};
const EntityMarker = ({ entity, selected = false, onPress, size = 'md', }) => {
    const Icon = entityIcons[entity.type] || lucide_react_native_1.MapPin;
    const color = entityColors[entity.type] || '#6366f1';
    const { container: containerSize, icon: iconSize } = sizes[size];
    return (<react_native_1.TouchableOpacity onPress={onPress} activeOpacity={0.8} className="items-center">
      <react_native_1.View style={{
            width: containerSize,
            height: containerSize,
            borderRadius: containerSize / 2,
            backgroundColor: color,
            borderWidth: selected ? 3 : 2,
            borderColor: selected ? '#fff' : 'rgba(255,255,255,0.5)',
        }} className="items-center justify-center shadow-lg">
        <Icon size={iconSize} color="#fff"/>
      </react_native_1.View>

      {/* Priority indicator */}
      {entity.priority === 'CRITICAL' && (<react_native_1.View className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-white"/>)}

      {/* Label (shown when selected) */}
      {selected && (<react_native_1.View className="mt-1 px-2 py-0.5 bg-dark-elevated rounded-full max-w-[100px]">
          <react_native_1.Text className="text-xs text-white text-center" numberOfLines={1}>
            {entity.name}
          </react_native_1.Text>
        </react_native_1.View>)}
    </react_native_1.TouchableOpacity>);
};
exports.EntityMarker = EntityMarker;
// Mini marker for dense areas
const EntityMarkerMini = ({ type, count, }) => {
    const color = entityColors[type] || '#6366f1';
    return (<react_native_1.View style={{ backgroundColor: color }} className="w-4 h-4 rounded-full border border-white items-center justify-center">
      {count && count > 1 && (<react_native_1.Text className="text-[8px] text-white font-bold">{count}</react_native_1.Text>)}
    </react_native_1.View>);
};
exports.EntityMarkerMini = EntityMarkerMini;
