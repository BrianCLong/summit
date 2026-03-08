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
exports.LoginScreen = void 0;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const native_1 = require("@react-navigation/native");
const react_hook_form_1 = require("react-hook-form");
const zod_1 = require("@hookform/resolvers/zod");
const zod_2 = require("zod");
const lucide_react_native_1 = require("lucide-react-native");
const AuthService_1 = require("@/services/AuthService");
const appStore_1 = require("@/stores/appStore");
const ui_1 = require("@/components/ui");
const Toast_1 = require("@/components/ui/Toast");
const loginSchema = zod_2.z.object({
    email: zod_2.z.string().email('Please enter a valid email'),
    password: zod_2.z.string().min(8, 'Password must be at least 8 characters'),
});
const LoginScreen = () => {
    const navigation = (0, native_1.useNavigation)();
    const { setUser, setAuthenticated } = (0, appStore_1.useAppStore)();
    const { toast } = (0, Toast_1.useToast)();
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [biometricsAvailable, setBiometricsAvailable] = (0, react_1.useState)(false);
    const { control, handleSubmit, formState: { errors }, } = (0, react_hook_form_1.useForm)({
        resolver: (0, zod_1.zodResolver)(loginSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    });
    // Check biometrics availability
    react_1.default.useEffect(() => {
        const checkBiometrics = async () => {
            const available = await (0, AuthService_1.isBiometricsAvailable)();
            const enabled = (0, AuthService_1.isBiometricEnabled)();
            setBiometricsAvailable(available && enabled);
        };
        checkBiometrics();
    }, []);
    const handleLogin = async (data) => {
        setIsLoading(true);
        try {
            const user = await (0, AuthService_1.login)(data);
            setUser(user);
            setAuthenticated(true);
            toast({
                type: 'success',
                title: 'Welcome back!',
                description: `Signed in as ${user.name}`,
            });
        }
        catch (error) {
            toast({
                type: 'error',
                title: 'Login failed',
                description: error.message || 'Please check your credentials',
            });
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleBiometricLogin = async () => {
        const success = await (0, AuthService_1.authenticateWithBiometrics)();
        if (success) {
            // In a real app, you'd retrieve stored credentials or token
            toast({
                type: 'success',
                title: 'Authenticated',
                description: 'Biometric authentication successful',
            });
        }
        else {
            toast({
                type: 'error',
                title: 'Authentication failed',
                description: 'Biometric authentication was not successful',
            });
        }
    };
    return (<react_native_safe_area_context_1.SafeAreaView className="flex-1 bg-dark-bg">
      <react_native_1.KeyboardAvoidingView behavior={react_native_1.Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <react_native_1.ScrollView className="flex-1" contentContainerClassName="flex-grow justify-center px-6 py-8" keyboardShouldPersistTaps="handled">
          {/* Logo & Header */}
          <react_native_1.View className="items-center mb-8">
            <react_native_1.View className="w-20 h-20 bg-intel-600 rounded-2xl items-center justify-center mb-4">
              <lucide_react_native_1.Shield size={40} color="#fff"/>
            </react_native_1.View>
            <ui_1.Text size="3xl" weight="bold">
              IntelGraph
            </ui_1.Text>
            <ui_1.Text variant="muted" className="mt-2">
              Intelligence Analysis Platform
            </ui_1.Text>
          </react_native_1.View>

          {/* Login Form */}
          <ui_1.Card>
            <ui_1.CardContent className="py-6">
              <react_hook_form_1.Controller control={control} name="email" render={({ field: { onChange, onBlur, value } }) => (<ui_1.Input label="Email" placeholder="analyst@agency.gov" keyboardType="email-address" autoCapitalize="none" autoComplete="email" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.email?.message} containerClassName="mb-4"/>)}/>

              <react_hook_form_1.Controller control={control} name="password" render={({ field: { onChange, onBlur, value } }) => (<ui_1.Input label="Password" placeholder="Enter your password" secureTextEntry autoComplete="password" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.password?.message} containerClassName="mb-6"/>)}/>

              <ui_1.Button onPress={handleSubmit(handleLogin)} loading={isLoading} className="mb-4">
                Sign In
              </ui_1.Button>

              {/* Biometric Login */}
              {biometricsAvailable && (<ui_1.Button variant="outline" onPress={handleBiometricLogin} leftIcon={<lucide_react_native_1.Fingerprint size={20} color="#0ea5e9"/>}>
                  Sign in with Biometrics
                </ui_1.Button>)}

              {/* Forgot Password */}
              <react_native_1.TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} className="mt-4">
                <ui_1.Text size="sm" variant="primary" className="text-center">
                  Forgot your password?
                </ui_1.Text>
              </react_native_1.TouchableOpacity>
            </ui_1.CardContent>
          </ui_1.Card>

          {/* Security Notice */}
          <react_native_1.View className="mt-8 px-4">
            <react_native_1.View className="flex-row items-start">
              <lucide_react_native_1.Shield size={16} color="#71717a"/>
              <ui_1.Text size="xs" variant="muted" className="ml-2 flex-1">
                This is a secure government system. Unauthorized access is prohibited
                and may be subject to criminal prosecution.
              </ui_1.Text>
            </react_native_1.View>
          </react_native_1.View>

          {/* SSO Options */}
          <react_native_1.View className="mt-6">
            <react_native_1.View className="flex-row items-center mb-4">
              <react_native_1.View className="flex-1 h-px bg-dark-border"/>
              <ui_1.Text size="sm" variant="muted" className="mx-4">
                or continue with
              </ui_1.Text>
              <react_native_1.View className="flex-1 h-px bg-dark-border"/>
            </react_native_1.View>

            <ui_1.Button variant="secondary" leftIcon={<lucide_react_native_1.Scan size={18} color="#fff"/>}>
              CAC / PIV Card
            </ui_1.Button>
          </react_native_1.View>
        </react_native_1.ScrollView>
      </react_native_1.KeyboardAvoidingView>
    </react_native_safe_area_context_1.SafeAreaView>);
};
exports.LoginScreen = LoginScreen;
