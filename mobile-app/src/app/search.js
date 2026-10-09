import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button, TextInput, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { api } from '../api/apiClient';

export default function SearchScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [osData, setOsData] = useState(null);

  useEffect(() => {
    if (!permission) {
        requestPermission();
    }
  }, [permission]);

  const handleSearch = async (query) => {
    if (!query) return;
    setScanning(false);
    setLoading(true);
    setOsData(null);
    try {
      const data = await api.searchOS(query);
      setOsData(data);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        Alert.alert('Результат', 'Основное средство не найдено');
      } else {
        Alert.alert('Ошибка', error.message || 'Ошибка связи с 1С');
      }
    } finally {
      setLoading(false);
    }
  };

  const onBarcodeScanned = ({ data }) => {
    if (data) {
        setSearchQuery(data);
        handleSearch(data);
    }
  };

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center' }}>Нужен доступ к камере</Text>
        <Button onPress={requestPermission} title="Разрешить" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          placeholder="Штрихкод / Инв. номер"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={() => handleSearch(searchQuery)}
        />
        <Button title="Найти" onPress={() => handleSearch(searchQuery)} />
      </View>

      <View style={styles.cameraContainer}>
        {scanning ? (
          <CameraView
            style={styles.camera}
            onBarcodeScanned={onBarcodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ["qr", "ean13", "code128", "code39"],
            }}
          />
        ) : (
          <Button title="Сканировать" onPress={() => setScanning(true)} />
        )}
        {scanning && (
            <View style={{marginTop: 10}}>
                <Button title="Отмена" color="red" onPress={() => setScanning(false)} />
            </View>
        )}
      </View>

      {loading && <ActivityIndicator size="large" color="#0000ff" style={{ marginTop: 20 }} />}

      {osData && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{osData.name}</Text>
          <Text style={styles.cardText}><Text style={styles.bold}>Инв. №:</Text> {osData.inventoryNumber}</Text>
          <Text style={styles.cardText}><Text style={styles.bold}>МОЛ:</Text> {osData.mol || 'Не назначен'}</Text>
          <Text style={styles.cardText}><Text style={styles.bold}>Подразделение:</Text> {osData.department || 'Не указано'}</Text>
          <Text style={styles.cardText}><Text style={styles.bold}>Состояние:</Text> {osData.status}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  searchBar: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  cameraContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  camera: {
    width: 300,
    height: 300,
  },
  card: {
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  cardText: {
    fontSize: 16,
    marginBottom: 5,
  },
  bold: {
    fontWeight: 'bold',
  }
});
