import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';
import { useSync } from '../services/SyncProvider';

type SecureDocument = {
  id: string;
  title: string;
  path: string;
};

const seedDocuments: SecureDocument[] = [
  { id: 'a', title: 'SOC Playbook', path: `${FileSystem.documentDirectory}soc-playbook.pdf` },
  { id: 'b', title: 'Field SOP', path: `${FileSystem.documentDirectory}field-sop.pdf` }
];

export default function DocumentsScreen(): JSX.Element {
  const [documents, setDocuments] = useState<SecureDocument[]>([]);
  const { enqueue } = useSync();

  useEffect(() => {
    async function loadDocuments() {
      const stored = await SecureStore.getItemAsync('documents');
      if (stored) {
        setDocuments(JSON.parse(stored));
      } else {
        setDocuments(seedDocuments);
        await SecureStore.setItemAsync('documents', JSON.stringify(seedDocuments));
      }
    }
    loadDocuments();
  }, []);

  const handleOpen = async (doc: SecureDocument) => {
    const fileExists = await FileSystem.getInfoAsync(doc.path);
    if (!fileExists.exists) {
      await FileSystem.writeAsStringAsync(doc.path, 'Confidential content encrypted at rest.');
    }
    enqueue({ type: 'document-open', id: doc.id, openedAt: Date.now() });
    Alert.alert('Secure viewer', `Document opened from: ${doc.path}`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Secure Documents</Text>
      <FlatList
        data={documents}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.item} onPress={() => handleOpen(item)}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.path}>{item.path}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#0B1221' },
  title: { color: 'white', fontSize: 20, fontWeight: '700', marginBottom: 12 },
  item: { padding: 16, backgroundColor: '#111A30', borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#1F2A44' },
  itemTitle: { color: 'white', fontSize: 16, fontWeight: '600' },
  path: { color: '#A1A8BC', marginTop: 6 }
});
