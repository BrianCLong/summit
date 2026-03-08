"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertDialog = exports.Modal = void 0;
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const cn_1 = require("@/utils/cn");
const lucide_react_native_1 = require("lucide-react-native");
const Modal = ({ open, onClose, title, description, children, showCloseButton = true, closeOnBackdrop = true, className, contentClassName, ...props }) => {
    return (<react_native_1.Modal visible={open} transparent animationType="fade" onRequestClose={onClose} {...props}>
      <react_native_1.TouchableWithoutFeedback onPress={closeOnBackdrop ? onClose : undefined}>
        <react_native_1.View className="flex-1 bg-black/60 justify-center items-center px-4">
          <react_native_1.TouchableWithoutFeedback>
            <react_native_1.View className={(0, cn_1.cn)('w-full max-w-md bg-dark-surface rounded-2xl border border-dark-border', className)}>
              {(title || showCloseButton) && (<react_native_1.View className="flex-row items-center justify-between p-4 border-b border-dark-border">
                  <react_native_1.View className="flex-1">
                    {title && (<react_native_1.Text className="text-lg font-semibold text-white">{title}</react_native_1.Text>)}
                    {description && (<react_native_1.Text className="text-sm text-dark-muted mt-1">{description}</react_native_1.Text>)}
                  </react_native_1.View>
                  {showCloseButton && (<react_native_1.TouchableOpacity onPress={onClose} className="ml-4">
                      <lucide_react_native_1.X size={24} color="#71717a"/>
                    </react_native_1.TouchableOpacity>)}
                </react_native_1.View>)}
              <react_native_1.View className={(0, cn_1.cn)('p-4', contentClassName)}>{children}</react_native_1.View>
            </react_native_1.View>
          </react_native_1.TouchableWithoutFeedback>
        </react_native_1.View>
      </react_native_1.TouchableWithoutFeedback>
    </react_native_1.Modal>);
};
exports.Modal = Modal;
const AlertDialog = ({ open, onClose, onConfirm, title, description, confirmText = 'Confirm', cancelText = 'Cancel', variant = 'default', }) => {
    return (<exports.Modal open={open} onClose={onClose} showCloseButton={false} closeOnBackdrop={false}>
      <react_native_1.View className="items-center">
        <react_native_1.Text className="text-lg font-semibold text-white text-center">{title}</react_native_1.Text>
        {description && (<react_native_1.Text className="text-sm text-dark-muted text-center mt-2">{description}</react_native_1.Text>)}
      </react_native_1.View>
      <react_native_1.View className="flex-row mt-6 gap-3">
        <react_native_1.TouchableOpacity onPress={onClose} className="flex-1 h-12 items-center justify-center rounded-lg border border-dark-border">
          <react_native_1.Text className="text-base font-medium text-white">{cancelText}</react_native_1.Text>
        </react_native_1.TouchableOpacity>
        <react_native_1.TouchableOpacity onPress={onConfirm} className={(0, cn_1.cn)('flex-1 h-12 items-center justify-center rounded-lg', variant === 'destructive' ? 'bg-red-600' : 'bg-intel-600')}>
          <react_native_1.Text className="text-base font-medium text-white">{confirmText}</react_native_1.Text>
        </react_native_1.TouchableOpacity>
      </react_native_1.View>
    </exports.Modal>);
};
exports.AlertDialog = AlertDialog;
