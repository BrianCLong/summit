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
exports.Toast = exports.ToastProvider = exports.useToast = void 0;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const react_native_reanimated_1 = __importStar(require("react-native-reanimated"));
const cn_1 = require("@/utils/cn");
const lucide_react_native_1 = require("lucide-react-native");
const ToastContext = (0, react_1.createContext)(null);
const useToast = () => {
    const context = (0, react_1.useContext)(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
exports.useToast = useToast;
const toastIcons = {
    success: <lucide_react_native_1.CheckCircle size={20} color="#22c55e"/>,
    error: <lucide_react_native_1.AlertCircle size={20} color="#ef4444"/>,
    warning: <lucide_react_native_1.AlertTriangle size={20} color="#f59e0b"/>,
    info: <lucide_react_native_1.Info size={20} color="#0ea5e9"/>,
};
const toastColors = {
    success: 'border-l-green-500',
    error: 'border-l-red-500',
    warning: 'border-l-amber-500',
    info: 'border-l-intel-500',
};
const ToastItem = ({ toast, onDismiss }) => {
    const [isVisible, setIsVisible] = react_1.default.useState(true);
    react_1.default.useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(() => onDismiss(toast.id), 300);
        }, toast.duration || 4000);
        return () => clearTimeout(timer);
    }, [toast.id, toast.duration, onDismiss]);
    const animatedStyle = (0, react_native_reanimated_1.useAnimatedStyle)(() => ({
        opacity: (0, react_native_reanimated_1.withTiming)(isVisible ? 1 : 0, { duration: 300 }),
        transform: [
            {
                translateY: (0, react_native_reanimated_1.withSpring)(isVisible ? 0 : -20, {
                    damping: 15,
                    stiffness: 150,
                }),
            },
        ],
    }));
    return (<react_native_reanimated_1.default.View style={animatedStyle} className={(0, cn_1.cn)('mx-4 mb-2 p-4 rounded-xl bg-dark-elevated border border-dark-border border-l-4', toastColors[toast.type])}>
      <react_native_1.View className="flex-row items-start">
        <react_native_1.View className="mr-3 mt-0.5">{toastIcons[toast.type]}</react_native_1.View>
        <react_native_1.View className="flex-1">
          <react_native_1.Text className="text-base font-semibold text-white">{toast.title}</react_native_1.Text>
          {toast.description && (<react_native_1.Text className="text-sm text-dark-muted mt-1">{toast.description}</react_native_1.Text>)}
        </react_native_1.View>
        <react_native_1.TouchableOpacity onPress={() => onDismiss(toast.id)} className="ml-2">
          <lucide_react_native_1.X size={18} color="#71717a"/>
        </react_native_1.TouchableOpacity>
      </react_native_1.View>
    </react_native_reanimated_1.default.View>);
};
const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = (0, react_1.useState)([]);
    const toast = (0, react_1.useCallback)((data) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { ...data, id }]);
    }, []);
    const dismiss = (0, react_1.useCallback)((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);
    return (<ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <react_native_1.View className="absolute top-12 left-0 right-0 z-50">
        {toasts.map((t) => (<ToastItem key={t.id} toast={t} onDismiss={dismiss}/>))}
      </react_native_1.View>
    </ToastContext.Provider>);
};
exports.ToastProvider = ToastProvider;
exports.Toast = ToastItem;
