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
exports.BottomSheet = void 0;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const react_native_reanimated_1 = __importStar(require("react-native-reanimated"));
const react_native_gesture_handler_1 = require("react-native-gesture-handler");
const cn_1 = require("@/utils/cn");
const { height: SCREEN_HEIGHT } = react_native_1.Dimensions.get('window');
const BottomSheet = ({ open, onClose, children, title, snapPoints = [0.5, 0.9], className, }) => {
    const translateY = (0, react_native_reanimated_1.useSharedValue)(SCREEN_HEIGHT);
    const context = (0, react_native_reanimated_1.useSharedValue)({ y: 0 });
    const maxTranslateY = (0, react_1.useMemo)(() => -SCREEN_HEIGHT * Math.max(...snapPoints), [snapPoints]);
    const scrollTo = (0, react_1.useCallback)((destination) => {
        'worklet';
        translateY.value = (0, react_native_reanimated_1.withSpring)(destination, {
            damping: 50,
            stiffness: 500,
        });
    }, [translateY]);
    react_1.default.useEffect(() => {
        if (open) {
            scrollTo(-SCREEN_HEIGHT * snapPoints[0]);
        }
        else {
            scrollTo(SCREEN_HEIGHT);
        }
    }, [open, scrollTo, snapPoints]);
    const gesture = react_native_gesture_handler_1.Gesture.Pan()
        .onStart(() => {
        context.value = { y: translateY.value };
    })
        .onUpdate((event) => {
        translateY.value = Math.max(context.value.y + event.translationY, maxTranslateY);
    })
        .onEnd((event) => {
        if (event.velocityY > 500) {
            (0, react_native_reanimated_1.runOnJS)(onClose)();
        }
        else if (translateY.value > -SCREEN_HEIGHT * 0.3) {
            (0, react_native_reanimated_1.runOnJS)(onClose)();
        }
        else {
            // Find nearest snap point
            const nearestSnap = snapPoints.reduce((prev, curr) => {
                const prevDist = Math.abs(-SCREEN_HEIGHT * prev - translateY.value);
                const currDist = Math.abs(-SCREEN_HEIGHT * curr - translateY.value);
                return currDist < prevDist ? curr : prev;
            });
            scrollTo(-SCREEN_HEIGHT * nearestSnap);
        }
    });
    const rBottomSheetStyle = (0, react_native_reanimated_1.useAnimatedStyle)(() => ({
        transform: [{ translateY: translateY.value }],
    }));
    const rBackdropStyle = (0, react_native_reanimated_1.useAnimatedStyle)(() => ({
        opacity: (0, react_native_reanimated_1.withSpring)(open ? 0.5 : 0),
        pointerEvents: open ? 'auto' : 'none',
    }));
    return (<>
      <react_native_reanimated_1.default.View style={rBackdropStyle} className="absolute inset-0 bg-black" onTouchEnd={onClose}/>
      <react_native_gesture_handler_1.GestureDetector gesture={gesture}>
        <react_native_reanimated_1.default.View style={[{ height: SCREEN_HEIGHT }, rBottomSheetStyle]} className={(0, cn_1.cn)('absolute w-full bg-dark-surface rounded-t-3xl', className)}>
          <react_native_1.View className="w-12 h-1 bg-dark-muted rounded-full self-center my-3"/>
          {title && (<react_native_1.View className="px-4 pb-4 border-b border-dark-border">
              <react_native_1.Text className="text-lg font-semibold text-white text-center">
                {title}
              </react_native_1.Text>
            </react_native_1.View>)}
          <react_native_1.View className="flex-1 px-4">{children}</react_native_1.View>
        </react_native_reanimated_1.default.View>
      </react_native_gesture_handler_1.GestureDetector>
    </>);
};
exports.BottomSheet = BottomSheet;
