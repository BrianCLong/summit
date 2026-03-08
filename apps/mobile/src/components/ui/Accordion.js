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
exports.AccordionItem = exports.Accordion = void 0;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const react_native_reanimated_1 = __importStar(require("react-native-reanimated"));
const cn_1 = require("@/utils/cn");
const lucide_react_native_1 = require("lucide-react-native");
const Accordion = ({ items, type = 'single', defaultOpenIds = [], className, }) => {
    const [openIds, setOpenIds] = (0, react_1.useState)(defaultOpenIds);
    const toggleItem = (id) => {
        if (type === 'single') {
            setOpenIds((prev) => (prev.includes(id) ? [] : [id]));
        }
        else {
            setOpenIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
        }
    };
    return (<react_native_1.View className={(0, cn_1.cn)('rounded-xl border border-dark-border overflow-hidden', className)}>
      {items.map((item, index) => (<exports.AccordionItem key={item.id} item={item} isOpen={openIds.includes(item.id)} onToggle={() => toggleItem(item.id)} isLast={index === items.length - 1}/>))}
    </react_native_1.View>);
};
exports.Accordion = Accordion;
const AccordionItem = ({ item, isOpen, onToggle, isLast, }) => {
    const rotation = (0, react_native_reanimated_1.useSharedValue)(isOpen ? 180 : 0);
    const height = (0, react_native_reanimated_1.useSharedValue)(isOpen ? 1 : 0);
    react_1.default.useEffect(() => {
        rotation.value = (0, react_native_reanimated_1.withTiming)(isOpen ? 180 : 0, { duration: 200 });
        height.value = (0, react_native_reanimated_1.withTiming)(isOpen ? 1 : 0, { duration: 200 });
    }, [isOpen, rotation, height]);
    const iconStyle = (0, react_native_reanimated_1.useAnimatedStyle)(() => ({
        transform: [{ rotate: `${rotation.value}deg` }],
    }));
    const contentStyle = (0, react_native_reanimated_1.useAnimatedStyle)(() => ({
        opacity: height.value,
        maxHeight: height.value * 500,
    }));
    return (<react_native_1.View className={(0, cn_1.cn)('bg-dark-surface', !isLast && 'border-b border-dark-border')}>
      <react_native_1.TouchableOpacity onPress={onToggle} disabled={item.disabled} className={(0, cn_1.cn)('flex-row items-center justify-between p-4', item.disabled && 'opacity-50')}>
        <react_native_1.Text className="flex-1 text-base font-medium text-white">{item.title}</react_native_1.Text>
        <react_native_reanimated_1.default.View style={iconStyle}>
          <lucide_react_native_1.ChevronDown size={20} color="#71717a"/>
        </react_native_reanimated_1.default.View>
      </react_native_1.TouchableOpacity>
      <react_native_reanimated_1.default.View style={contentStyle} className="overflow-hidden">
        <react_native_1.View className="px-4 pb-4">
          {typeof item.content === 'string' ? (<react_native_1.Text className="text-dark-muted">{item.content}</react_native_1.Text>) : (item.content)}
        </react_native_1.View>
      </react_native_reanimated_1.default.View>
    </react_native_1.View>);
};
exports.AccordionItem = AccordionItem;
