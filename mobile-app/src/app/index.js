import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Учет Основных Средств</Text>
      
      <TouchableOpacity 
        style={styles.button}
        onPress={() => router.push('/search')}
      >
        <Text style={styles.buttonText}>Поиск оборудования</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.button}
        onPress={() => router.push('/inventory-list')}
      >
        <Text style={styles.buttonText}>Инвентаризация</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, styles.settingsButton]}
        onPress={() => router.push('/settings')}
      >
        <Text style={styles.buttonText}>Настройки подключения</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 40,
    textAlign: 'center'
  },
  button: {
    backgroundColor: '#0066cc',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    width: '100%',
    marginBottom: 20,
    alignItems: 'center'
  },
  settingsButton: {
    backgroundColor: '#666',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold'
  }
});
