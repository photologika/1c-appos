import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { api } from '../api/apiClient';

export default function InventoryListScreen() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const data = await api.getInventoryList();
      setDocuments(data);
    } catch (error) {
      Alert.alert('Ошибка', error.message || 'Не удалось загрузить список документов');
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.item}
      onPress={() => router.push({ pathname: '/inventory-scan', params: { documentData: JSON.stringify(item) } })}
    >
      <Text style={styles.title}>Документ №{item.number} от {new Date(item.date).toLocaleDateString()}</Text>
      <Text style={styles.subtitle}>Подразделение: {item.department}</Text>
      <Text style={styles.subtitle}>МОЛ: {item.mol}</Text>
      <Text style={styles.stats}>ОС по плану: {item.items.length}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <FlatList
          data={documents}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={<Text style={styles.empty}>Нет документов в работе</Text>}
          onRefresh={loadDocuments}
          refreshing={loading}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#fff',
  },
  item: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    backgroundColor: '#f9f9f9',
    marginBottom: 10,
    borderRadius: 5,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    color: '#555',
    marginTop: 5,
  },
  stats: {
    fontSize: 14,
    color: '#0066cc',
    marginTop: 5,
    fontWeight: 'bold'
  },
  empty: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#888'
  }
});
