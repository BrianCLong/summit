import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button, FlatList } from 'react-native';
import { Audio } from 'expo-av';
import { useSync } from '../services/SyncProvider';

type VoiceNote = {
  id: string;
  uri: string;
  createdAt: number;
};

export default function VoiceNotesScreen(): JSX.Element {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [notes, setNotes] = useState<VoiceNote[]>([]);
  const { enqueue } = useSync();

  useEffect(() => {
    Audio.requestPermissionsAsync().catch(console.error);
  }, []);

  const startRecording = async () => {
    const permission = await Audio.getPermissionsAsync();
    if (!permission.granted) {
      await Audio.requestPermissionsAsync();
    }
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    const { recording: activeRecording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    setRecording(activeRecording);
  };

  const stopRecording = async () => {
    if (!recording) return;
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    if (uri) {
      const voiceNote: VoiceNote = { id: `vn-${Date.now()}`, uri, createdAt: Date.now() };
      setNotes(prev => [voiceNote, ...prev]);
      enqueue({ type: 'voice-note', uri, createdAt: voiceNote.createdAt });
    }
    setRecording(null);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Voice Dictation</Text>
      <Text style={styles.subtitle}>Record secure voice notes for offline transcription.</Text>
      <View style={styles.actions}>
        <Button title="Start Recording" onPress={startRecording} disabled={!!recording} />
        <Button title="Stop" onPress={stopRecording} disabled={!recording} />
      </View>
      <FlatList
        data={notes}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.note}>
            <Text style={styles.noteTitle}>{new Date(item.createdAt).toLocaleString()}</Text>
            <Text style={styles.noteSubtitle}>{item.uri}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#0B1221' },
  title: { color: 'white', fontSize: 20, fontWeight: '700' },
  subtitle: { color: '#A1A8BC', marginTop: 4, marginBottom: 12 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  note: { padding: 12, borderRadius: 8, backgroundColor: '#111A30', marginBottom: 8, borderWidth: 1, borderColor: '#1F2A44' },
  noteTitle: { color: 'white', fontWeight: '600' },
  noteSubtitle: { color: '#A1A8BC', marginTop: 4 }
});
