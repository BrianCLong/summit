"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SplashScreen = void 0;
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const theme_1 = require("../theme");
const SplashScreen = () => {
    return (<react_native_1.View style={styles.container}>
      <react_native_1.Text style={styles.title}>IntelGraph</react_native_1.Text>
      <react_native_1.ActivityIndicator size="large" color={theme_1.theme.colors.primary} style={styles.loader}/>
      <react_native_1.Text style={styles.subtitle}>Loading intelligence platform...</react_native_1.Text>
    </react_native_1.View>);
};
exports.SplashScreen = SplashScreen;
const styles = react_native_1.StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme_1.theme.colors.background,
    },
    title: {
        ...theme_1.typography.h1,
        color: theme_1.theme.colors.primary,
        marginBottom: 24,
    },
    loader: {
        marginBottom: 16,
    },
    subtitle: {
        ...theme_1.typography.caption,
        color: theme_1.theme.colors.onBackground,
    },
});
