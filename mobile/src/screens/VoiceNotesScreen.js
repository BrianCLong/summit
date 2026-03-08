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
exports.default = VoiceNotesScreen;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const expo_av_1 = require("expo-av");
const SyncProvider_1 = require("../services/SyncProvider");
function VoiceNotesScreen() {
    const [recording, setRecording] = (0, react_1.useState)(null);
    const [notes, setNotes] = (0, react_1.useState)([]);
    const { enqueue } = (0, SyncProvider_1.useSync)();
    (0, react_1.useEffect)(() => {
        expo_av_1.Audio.requestPermissionsAsync().catch(console.error);
    }, []);
    const startRecording = async () => {
        const permission = await expo_av_1.Audio.getPermissionsAsync();
        if (!permission.granted) {
            await expo_av_1.Audio.requestPermissionsAsync();
        }
        await expo_av_1.Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        const { recording: activeRecording } = await expo_av_1.Audio.Recording.createAsync(expo_av_1.Audio.RecordingOptionsPresets.HIGH_QUALITY);
        setRecording(activeRecording);
    };
    const stopRecording = async () => {
        if (!recording)
            return;
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        if (uri) {
            const voiceNote = { id: `vn-${Date.now()}`, uri, createdAt: Date.now() };
            setNotes(prev => [voiceNote, ...prev]);
            enqueue({ type: 'voice-note', uri, createdAt: voiceNote.createdAt });
        }
        setRecording(null);
    };
    return (<react_native_1.View style={styles.container}>
      <react_native_1.Text style={styles.title}>Voice Dictation</react_native_1.Text>
      <react_native_1.Text style={styles.subtitle}>Record secure voice notes for offline transcription.</react_native_1.Text>
      <react_native_1.View style={styles.actions}>
        <react_native_1.Button title="Start Recording" onPress={startRecording} disabled={!!recording}/>
        <react_native_1.Button title="Stop" onPress={stopRecording} disabled={!recording}/>
      </react_native_1.View>
      <react_native_1.FlatList data={notes} keyExtractor={item => item.id} renderItem={({ item }) => (<react_native_1.View style={styles.note}>
            <react_native_1.Text style={styles.noteTitle}>{new Date(item.createdAt).toLocaleString()}</react_native_1.Text>
            <react_native_1.Text style={styles.noteSubtitle}>{item.uri}</react_native_1.Text>
          </react_native_1.View>)}/>
    </react_native_1.View>);
}
const styles = react_native_1.StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: '#0B1221' },
    title: { color: 'white', fontSize: 20, fontWeight: '700' },
    subtitle: { color: '#A1A8BC', marginTop: 4, marginBottom: 12 },
    actions: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    note: { padding: 12, borderRadius: 8, backgroundColor: '#111A30', marginBottom: 8, borderWidth: 1, borderColor: '#1F2A44' },
    noteTitle: { color: 'white', fontWeight: '600' },
    noteSubtitle: { color: '#A1A8BC', marginTop: 4 }
});
