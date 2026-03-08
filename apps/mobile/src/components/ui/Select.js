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
exports.Select = void 0;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const cn_1 = require("@/utils/cn");
const lucide_react_native_1 = require("lucide-react-native");
const Select = ({ options, value, onValueChange, placeholder = 'Select an option', label, error, disabled, className, }) => {
    const [isOpen, setIsOpen] = (0, react_1.useState)(false);
    const selectedOption = options.find((opt) => opt.value === value);
    const handleSelect = (option) => {
        if (option.disabled)
            return;
        onValueChange?.(option.value);
        setIsOpen(false);
    };
    return (<react_native_1.View className={(0, cn_1.cn)('w-full', className)}>
      {label && (<react_native_1.Text className="mb-1.5 text-sm font-medium text-white">{label}</react_native_1.Text>)}

      <react_native_1.TouchableOpacity onPress={() => !disabled && setIsOpen(true)} className={(0, cn_1.cn)('flex-row items-center justify-between h-12 px-4 rounded-lg border', error ? 'border-red-500' : 'border-dark-border', 'bg-dark-elevated', disabled && 'opacity-50')} disabled={disabled}>
        <react_native_1.Text className={(0, cn_1.cn)('text-base', selectedOption ? 'text-white' : 'text-dark-muted')}>
          {selectedOption?.label || placeholder}
        </react_native_1.Text>
        <lucide_react_native_1.ChevronDown size={20} color="#71717a"/>
      </react_native_1.TouchableOpacity>

      {error && <react_native_1.Text className="mt-1 text-sm text-red-500">{error}</react_native_1.Text>}

      <react_native_1.Modal visible={isOpen} transparent animationType="slide" onRequestClose={() => setIsOpen(false)}>
        <react_native_1.SafeAreaView className="flex-1 bg-black/50">
          <react_native_1.View className="flex-1 justify-end">
            <react_native_1.View className="bg-dark-surface rounded-t-3xl max-h-[70%]">
              <react_native_1.View className="flex-row items-center justify-between p-4 border-b border-dark-border">
                <react_native_1.Text className="text-lg font-semibold text-white">
                  {label || 'Select Option'}
                </react_native_1.Text>
                <react_native_1.TouchableOpacity onPress={() => setIsOpen(false)}>
                  <lucide_react_native_1.X size={24} color="#fff"/>
                </react_native_1.TouchableOpacity>
              </react_native_1.View>

              <react_native_1.FlatList data={options} keyExtractor={(item) => item.value} renderItem={({ item }) => (<react_native_1.TouchableOpacity onPress={() => handleSelect(item)} className={(0, cn_1.cn)('flex-row items-center justify-between px-4 py-4 border-b border-dark-border', item.disabled && 'opacity-50')} disabled={item.disabled}>
                    <react_native_1.Text className={(0, cn_1.cn)('text-base', item.value === value ? 'text-intel-400' : 'text-white')}>
                      {item.label}
                    </react_native_1.Text>
                    {item.value === value && <lucide_react_native_1.Check size={20} color="#0ea5e9"/>}
                  </react_native_1.TouchableOpacity>)}/>
            </react_native_1.View>
          </react_native_1.View>
        </react_native_1.SafeAreaView>
      </react_native_1.Modal>
    </react_native_1.View>);
};
exports.Select = Select;
