import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Button, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { api } from '../api/apiClient';

export default function InventoryScanScreen() {
  const { documentData } = useLocalSearchParams();
  const document = documentData ? JSON.parse(documentData) : null;
  
  const [permission, requestPermission] = useCameraPermissions();
  const [items, setItems] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const lastScannedTime = useRef(0);

  useEffect(() => {
    if (!permission) {
        requestPermission();
    }
    // Initialize items state with planned data
    if (document && document.items) {
      const initialItems = document.items.map(item => ({
        ...item,
        scanned: false,
        status: 'missing' // missing, matched, surplus
      }));
      setItems(initialItems);
    }
  }, [documentData, permission]);

  const playSound = (type) => {
    // Left empty for future implementation with native sounds
  };

  const handleBarcodeScanned = async ({ data }) => {
    const now = Date.now();
    if (now - lastScannedTime.current < 1500) return; // Debounce scanning
    lastScannedTime.current = now;

    let foundInList = false;

    // Check if it's already in the items list (plan or previously added surplus)
    const newItems = items.map(item => {
      if ((item.barcode && item.barcode === data) || item.inventoryNumber === data) {
        foundInList = true;
        // If it was already surplus, it stays surplus. If it was missing, it becomes matched.
        return { 
          ...item, 
          scanned: true, 
          status: item.status === 'surplus' ? 'surplus' : 'matched' 
        };
      }
      return item;
    });

    if (foundInList) {
      setItems(newItems);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      playSound('success');
    } else {
      // Try to search this item in 1C to add as surplus
      try {
        const osData = await api.searchOS(data);
        const newItem = {
          id: osData.id,
          name: osData.name,
          inventoryNumber: osData.inventoryNumber,
          barcode: data,
          planned: false,
          scanned: true,
          status: 'surplus'
        };
        setItems(prev => [newItem, ...prev]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        playSound('surplus');
      } catch (error) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Внимание', `Штрихкод ${data} не найден ни в плане, ни в базе 1С.`);
      }
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    const scannedItems = items.filter(i => i.scanned).map(i => ({
      id: i.id,
      barcode: i.barcode || i.inventoryNumber
    }));

    try {
      await api.syncInventory(document.id, scannedItems);
      Alert.alert('Успех', 'Данные успешно отправлены в 1С', [
        { text: 'ОК', onPress: () => router.back() }
      ]);
    } catch (error) {
      Alert.alert('Ошибка', error.message || 'Ошибка синхронизации');
    } finally {
      setSyncing(false);
    }
  };

  const renderItem = ({ item }) => {
    let bgColor = '#fff';
    if (item.status === 'matched') bgColor = '#d4edda';
    if (item.status === 'surplus') bgColor = '#fff3cd';
    if (item.status === 'missing') bgColor = '#f8d7da';

    return (
      <View style={[styles.itemRow, { backgroundColor: bgColor }]}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.itemDetail}>Инв: {item.inventoryNumber}</Text>
        </View>
        <View style={styles.itemStatus}>
          <Text style={styles.statusText}>
            {item.status === 'matched' && 'План+Факт'}
            {item.status === 'surplus' && 'Излишек'}
            {item.status === 'missing' && 'Недостача'}
          </Text>
        </View>
      </View>
    );
  };

  if (!permission || !permission.granted) {
    return <View><Text>Нет доступа к камере</Text></View>;
  }
  
  if (!document) {
    return <View><Text>Ошибка загрузки документа</Text></View>;
  }

  const matchedCount = items.filter(i => i.status === 'matched').length;
  const missingCount = items.filter(i => i.status === 'missing').length;
  const surplusCount = items.filter(i => i.status === 'surplus').length;

  return (
    <View style={styles.container}>
      <View style={styles.headerInfo}>
        <Text>План: {document.items.length} | Факт: {matchedCount + surplusCount}</Text>
        <Text style={{color: 'green'}}>Найдено: {matchedCount}</Text>
        <Text style={{color: 'red'}}>Недостача: {missingCount}</Text>
        <Text style={{color: 'orange'}}>Излишки: {surplusCount}</Text>
      </View>

      <View style={styles.cameraContainer}>
        {scanning ? (
           <CameraView
            style={styles.camera}
            onBarcodeScanned={handleBarcodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ["qr", "ean13", "code128", "code39"],
            }}
          />
        ) : (
          <View style={styles.cameraPlaceholder}>
             <Button title="Включить сканер" onPress={() => setScanning(true)} />
          </View>
        )}
      </View>
      {scanning && (
          <View style={{marginVertical: 5, alignItems: 'center'}}>
              <Button title="Остановить сканер" color="red" onPress={() => setScanning(false)} />
          </View>
      )}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id + (item.status)} // hack for force render
        renderItem={renderItem}
        style={styles.list}
      />

      <View style={styles.footer}>
        <Button 
          title={syncing ? "Отправка..." : "Отправить в 1С"} 
          onPress={handleSync} 
          disabled={syncing} 
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerInfo: {
    padding: 10,
    backgroundColor: '#f0f0f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap'
  },
  cameraContainer: {
    height: 200,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  camera: {
    flex: 1,
  },
  cameraPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#eee'
  },
  list: {
    flex: 1,
  },
  itemRow: {
    flexDirection: 'row',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center'
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontWeight: 'bold',
  },
  itemDetail: {
    color: '#666',
    fontSize: 12,
  },
  itemStatus: {
    width: 80,
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  footer: {
    padding: 15,
    borderTopWidth: 1,
    borderColor: '#ddd'
  }
});
