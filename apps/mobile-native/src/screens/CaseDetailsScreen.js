"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CaseDetailsScreen = void 0;
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const CaseDetailsScreen = () => {
    return (<react_native_1.View style={styles.container}>
      <react_native_1.Text style={styles.title}>CaseDetailsScreen</react_native_1.Text>
    </react_native_1.View>);
};
exports.CaseDetailsScreen = CaseDetailsScreen;
const styles = react_native_1.StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 24, fontWeight: 'bold' },
});
